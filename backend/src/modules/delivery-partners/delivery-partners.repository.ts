import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DeliveryPartnersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: { where: Prisma.DeliveryPartnerWhereInput; skip: number; take: number }) {
    return this.prisma.deliveryPartner.findMany({
      where: args.where,
      orderBy: [{ isActive: 'desc' }, { companyName: 'asc' }],
      skip: args.skip,
      take: args.take,
      include: { _count: { select: { shipments: true } } },
    });
  }

  count(where: Prisma.DeliveryPartnerWhereInput) {
    return this.prisma.deliveryPartner.count({ where });
  }

  findById(id: string) {
    return this.prisma.deliveryPartner.findUnique({
      where: { id },
      include: { _count: { select: { shipments: true } } },
    });
  }

  findActiveById(id: string) {
    return this.prisma.deliveryPartner.findFirst({
      where: { id, isActive: true },
    });
  }

  listActive() {
    return this.prisma.deliveryPartner.findMany({
      where: { isActive: true },
      orderBy: { companyName: 'asc' },
    });
  }

  create(data: Prisma.DeliveryPartnerCreateInput) {
    return this.prisma.deliveryPartner.create({
      data,
      include: { _count: { select: { shipments: true } } },
    });
  }

  update(id: string, data: Prisma.DeliveryPartnerUpdateInput) {
    return this.prisma.deliveryPartner.update({
      where: { id },
      data,
      include: { _count: { select: { shipments: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.deliveryPartner.delete({ where: { id } });
  }
}
