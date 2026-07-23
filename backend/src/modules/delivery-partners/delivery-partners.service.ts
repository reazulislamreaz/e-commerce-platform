import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type DeliveryPartner } from '@/generated/prisma/client';
import type {
  CreateDeliveryPartnerDto,
  ListDeliveryPartnersQueryDto,
  UpdateDeliveryPartnerDto,
} from './dto/delivery-partner.dto';
import { DeliveryPartnersRepository } from './delivery-partners.repository';

type PartnerWithCount = DeliveryPartner & { _count?: { shipments: number } };

@Injectable()
export class DeliveryPartnersService {
  constructor(private readonly partners: DeliveryPartnersRepository) {}

  async list(query: ListDeliveryPartnersQueryDto) {
    const pageSize = query.limit;
    const page = query.page;
    const where = this.buildWhere(query);

    const [total, rows] = await Promise.all([
      this.partners.count(where),
      this.partners.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      data: rows.map((row) => this.toResponse(row)),
      meta: {
        page,
        pageSize,
        limit: pageSize,
        total,
        totalPages,
        nextCursor: null,
      },
    };
  }

  listActive() {
    return this.partners.listActive().then((rows) => rows.map((row) => this.toResponse(row)));
  }

  async getById(id: string) {
    const partner = await this.partners.findById(id);
    if (!partner) throw new NotFoundException('Delivery partner not found');
    return this.toResponse(partner);
  }

  create(dto: CreateDeliveryPartnerDto) {
    return this.partners.create(this.toCreateData(dto)).then((row) => this.toResponse(row));
  }

  async update(id: string, dto: UpdateDeliveryPartnerDto) {
    await this.getById(id);
    return this.partners.update(id, this.toUpdateData(dto)).then((row) => this.toResponse(row));
  }

  async setActive(id: string, isActive: boolean) {
    await this.getById(id);
    return this.partners.update(id, { isActive }).then((row) => this.toResponse(row));
  }

  async remove(id: string) {
    const partner = await this.partners.findById(id);
    if (!partner) throw new NotFoundException('Delivery partner not found');

    if ((partner._count?.shipments ?? 0) > 0) {
      return this.partners.update(id, { isActive: false }).then((row) => this.toResponse(row));
    }

    try {
      await this.partners.delete(id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Delivery partner is referenced by shipments; deactivate instead',
        );
      }
      throw error;
    }

    return { id, deleted: true as const };
  }

  resolveTrackingUrl(
    template: string | null | undefined,
    trackingNumber: string,
    explicitUrl?: string | null,
  ): string | null {
    if (explicitUrl?.trim()) return explicitUrl.trim();
    if (!template?.trim()) return null;
    return template.replaceAll('{trackingNumber}', trackingNumber.trim());
  }

  private buildWhere(query: ListDeliveryPartnersQueryDto): Prisma.DeliveryPartnerWhereInput {
    const search = query.search?.trim();
    return {
      ...(query.active !== undefined ? { isActive: query.active } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { contactPerson: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private toCreateData(dto: CreateDeliveryPartnerDto): Prisma.DeliveryPartnerCreateInput {
    return {
      companyName: dto.companyName.trim(),
      contactPerson: dto.contactPerson?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      website: dto.website?.trim() || null,
      logoUrl: dto.logoUrl?.trim() || null,
      trackingUrlTemplate: dto.trackingUrlTemplate?.trim() || null,
      isActive: dto.isActive ?? true,
    };
  }

  private toUpdateData(dto: UpdateDeliveryPartnerDto): Prisma.DeliveryPartnerUpdateInput {
    return {
      ...(dto.companyName !== undefined ? { companyName: dto.companyName.trim() } : {}),
      ...(dto.contactPerson !== undefined
        ? { contactPerson: dto.contactPerson?.trim() || null }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email?.trim().toLowerCase() || null } : {}),
      ...(dto.website !== undefined ? { website: dto.website?.trim() || null } : {}),
      ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl?.trim() || null } : {}),
      ...(dto.trackingUrlTemplate !== undefined
        ? { trackingUrlTemplate: dto.trackingUrlTemplate?.trim() || null }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
  }

  private toResponse(row: PartnerWithCount) {
    return {
      id: row.id,
      companyName: row.companyName,
      contactPerson: row.contactPerson,
      phone: row.phone,
      email: row.email,
      website: row.website,
      logoUrl: row.logoUrl,
      trackingUrlTemplate: row.trackingUrlTemplate,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      shipmentCount: row._count?.shipments ?? 0,
    };
  }
}
