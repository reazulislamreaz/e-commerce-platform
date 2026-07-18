import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBalancesByVariantIds(variantIds: string[]) {
    if (variantIds.length === 0) return [];
    return this.prisma.inventoryBalance.findMany({
      where: {
        variantId: { in: variantIds },
        location: { isActive: true },
      },
      select: {
        variantId: true,
        onHand: true,
        reserved: true,
      },
    });
  }
}
