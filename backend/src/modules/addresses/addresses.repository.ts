import { Injectable } from '@nestjs/common';
import { AddressType, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export const addressSelect = {
  id: true,
  userId: true,
  label: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  district: true,
  postalCode: true,
  country: true,
  type: true,
  isDefault: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AddressSelect;

export type AddressRecord = Prisma.AddressGetPayload<{ select: typeof addressSelect }>;

const activeWhere = (userId: string): Prisma.AddressWhereInput => ({
  userId,
  deletedAt: null,
});

@Injectable()
export class AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByUserId(userId: string): Promise<AddressRecord[]> {
    return this.prisma.address.findMany({
      where: activeWhere(userId),
      select: addressSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findOwnedById(userId: string, id: string): Promise<AddressRecord | null> {
    return this.prisma.address.findFirst({
      where: { ...activeWhere(userId), id },
      select: addressSelect,
    });
  }

  countByUserAndType(userId: string, type: AddressType): Promise<number> {
    return this.prisma.address.count({
      where: { ...activeWhere(userId), type },
    });
  }

  clearDefaults(userId: string, type: AddressType, tx: Prisma.TransactionClient): Promise<void> {
    return tx.address
      .updateMany({
        where: { ...activeWhere(userId), type, isDefault: true },
        data: { isDefault: false },
      })
      .then(() => undefined);
  }

  findFirstByUserAndType(
    userId: string,
    type: AddressType,
    excludeId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AddressRecord | null> {
    const client = tx ?? this.prisma;
    return client.address.findFirst({
      where: {
        ...activeWhere(userId),
        type,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: addressSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(
    data: Prisma.AddressUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AddressRecord> {
    const client = tx ?? this.prisma;
    return client.address.create({ data, select: addressSelect });
  }

  update(
    id: string,
    data: Prisma.AddressUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AddressRecord> {
    const client = tx ?? this.prisma;
    return client.address.update({ where: { id }, data, select: addressSelect });
  }

  softDelete(id: string, tx?: Prisma.TransactionClient): Promise<AddressRecord> {
    const client = tx ?? this.prisma;
    return client.address.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
      select: addressSelect,
    });
  }

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
