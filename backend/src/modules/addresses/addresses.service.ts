import { Injectable, NotFoundException } from '@nestjs/common';
import { AddressType } from '@/generated/prisma/client';
import { normalizeBdPhone } from '@/common/utils/bd-phone';
import type { CreateAddressDto } from './dto/create-address.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';
import { AddressesRepository, type AddressRecord } from './addresses.repository';

const BANGLADESH = 'Bangladesh';

export interface AddressResponse {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  type: 'shipping' | 'billing';
}

function preparePhone(phone: string): string {
  const trimmed = phone.trim();
  return normalizeBdPhone(trimmed) ?? trimmed;
}

function toResponseType(type: AddressType): AddressResponse['type'] {
  return type === AddressType.SHIPPING ? 'shipping' : 'billing';
}

function toResponse(record: AddressRecord): AddressResponse {
  return {
    id: record.id,
    label: record.label,
    fullName: record.fullName,
    phone: record.phone,
    line1: record.line1,
    ...(record.line2 ? { line2: record.line2 } : {}),
    city: record.city,
    district: record.district,
    postalCode: record.postalCode,
    country: record.country,
    isDefault: record.isDefault,
    type: toResponseType(record.type),
  };
}

@Injectable()
export class AddressesService {
  constructor(private readonly addresses: AddressesRepository) {}

  async list(userId: string): Promise<AddressResponse[]> {
    const rows = await this.addresses.findManyByUserId(userId);
    return rows.map(toResponse);
  }

  async getById(userId: string, id: string): Promise<AddressResponse> {
    const address = await this.getOwnedOrThrow(userId, id);
    return toResponse(address);
  }

  async create(userId: string, dto: CreateAddressDto): Promise<AddressResponse> {
    const type = dto.type ?? AddressType.SHIPPING;
    const existingCount = await this.addresses.countByUserAndType(userId, type);
    const shouldBeDefault = dto.isDefault === true || existingCount === 0;

    const created = await this.addresses.runTransaction(async (tx) => {
      if (shouldBeDefault) {
        await this.addresses.clearDefaults(userId, type, tx);
      }

      return this.addresses.create(
        {
          userId,
          label: dto.label,
          fullName: dto.fullName,
          phone: preparePhone(dto.phone),
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          district: dto.district,
          postalCode: dto.postalCode,
          country: BANGLADESH,
          type,
          isDefault: shouldBeDefault,
        },
        tx,
      );
    });

    return toResponse(created);
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<AddressResponse> {
    const current = await this.getOwnedOrThrow(userId, id);
    const nextType = dto.type ?? current.type;
    const typeChanged = nextType !== current.type;

    const updated = await this.addresses.runTransaction(async (tx) => {
      if (typeChanged && current.isDefault) {
        await this.addresses.update(id, { isDefault: false }, tx);
        const replacement = await this.addresses.findFirstByUserAndType(
          userId,
          current.type,
          id,
          tx,
        );
        if (replacement) {
          await this.addresses.update(replacement.id, { isDefault: true }, tx);
        }
      }

      if (dto.isDefault === true) {
        await this.addresses.clearDefaults(userId, nextType, tx);
      }

      return this.addresses.update(
        id,
        {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.phone !== undefined ? { phone: preparePhone(dto.phone) } : {}),
          ...(dto.line1 !== undefined ? { line1: dto.line1 } : {}),
          ...(dto.line2 !== undefined ? { line2: dto.line2 } : {}),
          ...(dto.city !== undefined ? { city: dto.city } : {}),
          ...(dto.district !== undefined ? { district: dto.district } : {}),
          ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
        tx,
      );
    });

    return toResponse(updated);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const current = await this.getOwnedOrThrow(userId, id);

    await this.addresses.runTransaction(async (tx) => {
      await this.addresses.softDelete(id, tx);

      if (current.isDefault) {
        const replacement = await this.addresses.findFirstByUserAndType(
          userId,
          current.type,
          id,
          tx,
        );
        if (replacement) {
          await this.addresses.update(replacement.id, { isDefault: true }, tx);
        }
      }
    });
  }

  async setDefault(userId: string, id: string): Promise<AddressResponse> {
    const current = await this.getOwnedOrThrow(userId, id);

    const updated = await this.addresses.runTransaction(async (tx) => {
      await this.addresses.clearDefaults(userId, current.type, tx);
      return this.addresses.update(id, { isDefault: true }, tx);
    });

    return toResponse(updated);
  }

  private async getOwnedOrThrow(userId: string, id: string): Promise<AddressRecord> {
    const address = await this.addresses.findOwnedById(userId, id);
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }
}
