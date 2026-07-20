import { StockAlertLevel } from '../../../src/generated/prisma/client';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

/** Materialize LOW/OUT alerts for balances so admin inventory is populated. */
export async function seedStockAlerts(ctx: SeedContext): Promise<void> {
  const { prisma } = ctx;
  const balances = await prisma.inventoryBalance.findMany({
    select: {
      id: true,
      onHand: true,
      reserved: true,
      lowStockThreshold: true,
    },
  });

  let created = 0;
  for (const balance of balances) {
    const available = Math.max(0, balance.onHand - balance.reserved);
    const level: StockAlertLevel | null =
      available <= 0
        ? StockAlertLevel.OUT
        : available <= balance.lowStockThreshold
          ? StockAlertLevel.LOW
          : null;

    const openAlerts = await prisma.stockAlert.findMany({
      where: { balanceId: balance.id, resolvedAt: null },
    });

    if (!level) {
      if (openAlerts.length > 0) {
        await prisma.stockAlert.updateMany({
          where: { balanceId: balance.id, resolvedAt: null },
          data: { resolvedAt: new Date() },
        });
      }
      continue;
    }

    const matching = openAlerts.find((alert) => alert.level === level);
    if (matching) {
      await prisma.stockAlert.update({
        where: { id: matching.id },
        data: { available, threshold: balance.lowStockThreshold },
      });
      for (const stale of openAlerts.filter((alert) => alert.id !== matching.id)) {
        await prisma.stockAlert.update({
          where: { id: stale.id },
          data: { resolvedAt: new Date() },
        });
      }
      continue;
    }

    if (openAlerts.length > 0) {
      await prisma.stockAlert.updateMany({
        where: { balanceId: balance.id, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    }

    await prisma.stockAlert.create({
      data: {
        balanceId: balance.id,
        level,
        available,
        threshold: balance.lowStockThreshold,
      },
    });
    created += 1;
  }

  seedLog(`Seeded stock alerts (${created} new open alerts).`);
}
