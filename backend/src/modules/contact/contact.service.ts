import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactMessageStatus, ConsentAction, ConsentPurpose } from '@/generated/prisma/client';
import { sha256Hex } from '@/common/utils/hash';
import { buildOffsetMeta, resolveOffsetPagination } from '@/common/pagination/offset-pagination';
import { AuditService } from '@/modules/platform/audit.service';
import { OUTBOX_EVENT, OutboxService } from '@/modules/platform/outbox.service';
import type { JwtPayload } from '@/modules/auth/jwt.strategy';
import type {
  AdminUpdateContactMessageDto,
  ListContactMessagesQueryDto,
} from './dto/admin-contact.dto';
import type {
  ContactMessageResponseDto,
  ContactSubmitResponseDto,
} from './dto/contact-response.dto';
import type { SubmitContactDto } from './dto/submit-contact.dto';
import { ContactRepository, type ContactMessageRecord } from './contact.repository';

const SUCCESS_MESSAGE = 'Thank you for contacting us. We will respond shortly.';

@Injectable()
export class ContactService {
  constructor(
    private readonly contact: ContactRepository,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async submit(
    dto: SubmitContactDto,
    actor: JwtPayload | undefined,
    meta: { ip?: string; userAgent?: string },
  ): Promise<ContactSubmitResponseDto> {
    if (dto.website?.trim()) {
      return { message: SUCCESS_MESSAGE };
    }

    return this.contact.runTransaction(async (tx) => {
      const created = await this.contact.create(
        {
          name: dto.name,
          email: dto.email,
          subject: dto.subject,
          body: dto.message,
          ...(actor ? { user: { connect: { id: actor.sub } } } : {}),
          ipHash: meta.ip ? sha256Hex(meta.ip) : null,
          userAgent: meta.userAgent?.slice(0, 500) ?? null,
        },
        tx,
      );

      await tx.consentEvent.create({
        data: {
          userId: actor?.sub ?? null,
          email: dto.email,
          purpose: ConsentPurpose.CONTACT_FORM,
          action: ConsentAction.GRANTED,
          source: 'contact_form',
          ip: meta.ip ?? null,
          userAgent: meta.userAgent?.slice(0, 500) ?? null,
        },
      });

      await this.outbox.enqueue(
        OUTBOX_EVENT.CONTACT_ACK_EMAIL,
        created.id,
        {
          to: dto.email,
          name: dto.name,
          subject: dto.subject,
        },
        tx,
      );

      const inbox =
        this.config.get<string>('CONTACT_INBOX')?.trim() ||
        this.config.get<string>('MAIL_FROM')?.trim() ||
        '';

      if (inbox) {
        await this.outbox.enqueue(
          OUTBOX_EVENT.CONTACT_INTERNAL_EMAIL,
          created.id,
          {
            to: inbox,
            name: dto.name,
            email: dto.email,
            subject: dto.subject,
            body: dto.message,
            messageId: created.id,
          },
          tx,
        );
      }

      return { message: SUCCESS_MESSAGE };
    });
  }

  async listAdmin(query: ListContactMessagesQueryDto) {
    const { page, pageSize, skip, take } = resolveOffsetPagination(query);
    const { rows, total } = await this.contact.listAdmin({ skip, take, status: query.status });
    return {
      data: rows.map(toResponse),
      meta: buildOffsetMeta(page, pageSize, total),
    };
  }

  async updateAdmin(
    actor: JwtPayload,
    id: string,
    dto: AdminUpdateContactMessageDto,
  ): Promise<ContactMessageResponseDto> {
    const current = await this.contact.findById(id);
    if (!current) throw new NotFoundException('Contact message not found');

    const nextStatus = dto.status ?? current.status;
    const resolvedAt =
      nextStatus === ContactMessageStatus.RESOLVED
        ? (current.resolvedAt ?? new Date())
        : nextStatus === ContactMessageStatus.NEW || nextStatus === ContactMessageStatus.IN_PROGRESS
          ? null
          : current.resolvedAt;

    const updated = await this.contact.runTransaction(async (tx) => {
      const row = await this.contact.update(
        id,
        {
          status: nextStatus,
          adminNotes: dto.adminNotes?.trim() ?? current.adminNotes,
          resolvedAt,
        },
        tx,
      );

      await this.audit.write(
        {
          actorUserId: actor.sub,
          actorRole: actor.role,
          action: 'contact_message.update',
          resourceType: 'contact_message',
          resourceId: id,
          before: { status: current.status, adminNotes: current.adminNotes },
          after: { status: row.status, adminNotes: row.adminNotes },
        },
        tx,
      );

      return row;
    });

    return toResponse(updated);
  }
}

function toResponse(row: ContactMessageRecord): ContactMessageResponseDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    body: row.body,
    status: mapStatusToApi(row.status),
    ...(row.adminNotes ? { adminNotes: row.adminNotes } : {}),
    createdAt: row.createdAt.toISOString(),
    ...(row.resolvedAt ? { resolvedAt: row.resolvedAt.toISOString() } : {}),
  };
}

function mapStatusToApi(status: ContactMessageStatus): ContactMessageResponseDto['status'] {
  switch (status) {
    case ContactMessageStatus.IN_PROGRESS:
      return 'in_progress';
    case ContactMessageStatus.RESOLVED:
      return 'resolved';
    case ContactMessageStatus.SPAM:
      return 'spam';
    default:
      return 'new';
  }
}
