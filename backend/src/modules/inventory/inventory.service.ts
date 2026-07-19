import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  InventoryMovementType,
  Prisma,
  ReservationStatus,
  StockAlertLevel,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { InventoryRepository } from './inventory.repository';

export type ReserveLine = { variantId: string; quantity: number };

export type ReservationAllocation = {
  variantId: string;
  locationId: string;
  quantity: number;
};

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly inventory: InventoryRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Returns aggregate available quantity across active locations in two
   * queries at most (catalog query + this batch), preventing an N+1 per variant.
   */
  async getAvailableByVariantIds(variantIds: string[]): Promise<Map<string, number>> {
    const availability = new Map(variantIds.map((id) => [id, 0]));
    const balances = await this.inventory.findBalancesByVariantIds([...new Set(variantIds)]);
    for (const balance of balances) {
      const available = Math.max(0, balance.onHand - balance.reserved);
      availability.set(
        balance.variantId,
        (availability.get(balance.variantId) ?? 0) + available,
      );
    }
    return availability;
  }

  /**
   * Locks balances in sorted variant/location order, increases reserved,
   * writes RESERVE movements, and creates an InventoryReservation for the order.
   */
  async reserveForOrder(
    orderId: string,
    lines: ReserveLine[],
    tx: Prisma.TransactionClient,
    expiresAt?: Date,
  ): Promise<void> {
    const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
    const allocations: ReservationAllocation[] = [];

    for (const line of sorted) {
      const balances = await tx.$queryRaw<
        Array<{ id: string; locationId: string; onHand: number; reserved: number; version: number }>
      >`
        SELECT id, "locationId", "onHand", reserved, version
        FROM inventory_balance
        WHERE "variantId" = ${line.variantId}::uuid
          AND "locationId" IN (
            SELECT id FROM inventory_location WHERE "isActive" = true
          )
        ORDER BY "locationId"
        FOR UPDATE
      `;

      let remaining = line.quantity;
      for (const balance of balances) {
        if (remaining <= 0) break;
        const available = balance.onHand - balance.reserved;
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        const nextReserved = balance.reserved + take;
        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: { reserved: nextReserved, version: { increment: 1 } },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: line.variantId,
            locationId: balance.locationId,
            type: InventoryMovementType.RESERVE,
            quantity: take,
            balanceAfter: balance.onHand - nextReserved,
            idempotencyKey: `reserve:${orderId}:${line.variantId}:${balance.locationId}`,
            note: `Order ${orderId}`,
          },
        });
        allocations.push({
          variantId: line.variantId,
          locationId: balance.locationId,
          quantity: take,
        });
        remaining -= take;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          `Insufficient stock for variant ${line.variantId}. Please update your cart.`,
        );
      }
    }

    await tx.inventoryReservation.create({
      data: {
        orderId,
        status: ReservationStatus.ACTIVE,
        expiresAt: expiresAt ?? null,
        items: {
          create: allocations.map((a) => ({
            variantId: a.variantId,
            locationId: a.locationId,
            quantity: a.quantity,
          })),
        },
      },
    });

    await this.refreshStockAlerts(
      allocations.map((a) => ({ variantId: a.variantId, locationId: a.locationId })),
      tx,
    );
  }

  async releaseForOrder(orderId: string, tx: Prisma.TransactionClient): Promise<void> {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { orderId },
      include: { items: true },
    });
    if (!reservation || reservation.status !== ReservationStatus.ACTIVE) return;

    const items = [...reservation.items].sort(
      (a, b) =>
        a.variantId.localeCompare(b.variantId) || a.locationId.localeCompare(b.locationId),
    );

    for (const item of items) {
      const balances = await tx.$queryRaw<
        Array<{ id: string; onHand: number; reserved: number }>
      >`
        SELECT id, "onHand", reserved
        FROM inventory_balance
        WHERE "variantId" = ${item.variantId}::uuid
          AND "locationId" = ${item.locationId}::uuid
        FOR UPDATE
      `;
      const balance = balances[0];
      if (!balance) continue;
      const nextReserved = Math.max(0, balance.reserved - item.quantity);
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: { reserved: nextReserved, version: { increment: 1 } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          locationId: item.locationId,
          type: InventoryMovementType.RELEASE,
          quantity: -item.quantity,
          balanceAfter: balance.onHand - nextReserved,
          idempotencyKey: `release:${orderId}:${item.variantId}:${item.locationId}`,
          note: `Cancel order ${orderId}`,
        },
      });
    }

    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
    });

    await this.refreshStockAlerts(
      items.map((item) => ({ variantId: item.variantId, locationId: item.locationId })),
      tx,
    );
  }

  /** On ship: decrement onHand and reserved; append SALE movements; mark reservation consumed. */
  async consumeForShipment(orderId: string, tx: Prisma.TransactionClient): Promise<void> {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { orderId },
      include: { items: true },
    });
    if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException('No active inventory reservation for this order');
    }

    const items = [...reservation.items].sort(
      (a, b) =>
        a.variantId.localeCompare(b.variantId) || a.locationId.localeCompare(b.locationId),
    );

    for (const item of items) {
      const balances = await tx.$queryRaw<
        Array<{ id: string; onHand: number; reserved: number }>
      >`
        SELECT id, "onHand", reserved
        FROM inventory_balance
        WHERE "variantId" = ${item.variantId}::uuid
          AND "locationId" = ${item.locationId}::uuid
        FOR UPDATE
      `;
      const balance = balances[0];
      if (!balance) {
        throw new BadRequestException('Inventory balance missing for shipment');
      }
      const nextOnHand = balance.onHand - item.quantity;
      const nextReserved = balance.reserved - item.quantity;
      if (nextOnHand < 0 || nextReserved < 0) {
        throw new BadRequestException('Cannot ship: inventory accounting conflict');
      }
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          onHand: nextOnHand,
          reserved: nextReserved,
          version: { increment: 1 },
        },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          locationId: item.locationId,
          type: InventoryMovementType.SALE,
          quantity: -item.quantity,
          balanceAfter: nextOnHand - nextReserved,
          idempotencyKey: `sale:${orderId}:${item.variantId}:${item.locationId}`,
          note: `Ship order ${orderId}`,
        },
      });
    }

    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CONSUMED },
    });

    await this.refreshStockAlerts(
      items.map((item) => ({ variantId: item.variantId, locationId: item.locationId })),
      tx,
    );
  }

  async restockReturn(
    returnId: string,
    lines: Array<{ variantId: string; quantity: number; locationId?: string }>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const location =
      (await tx.inventoryLocation.findFirst({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      })) ?? null;
    if (!location) throw new BadRequestException('No active inventory location');

    for (const line of [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
      const locationId = line.locationId ?? location.id;
      const balances = await tx.$queryRaw<
        Array<{ id: string; onHand: number; reserved: number }>
      >`
        SELECT id, "onHand", reserved
        FROM inventory_balance
        WHERE "variantId" = ${line.variantId}::uuid
          AND "locationId" = ${locationId}::uuid
        FOR UPDATE
      `;
      let balance = balances[0];
      if (!balance) {
        const created = await tx.inventoryBalance.create({
          data: {
            variantId: line.variantId,
            locationId,
            onHand: 0,
            reserved: 0,
          },
        });
        balance = { id: created.id, onHand: 0, reserved: 0 };
      }
      const nextOnHand = balance.onHand + line.quantity;
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: { onHand: nextOnHand, version: { increment: 1 } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: line.variantId,
          locationId,
          type: InventoryMovementType.RETURN,
          quantity: line.quantity,
          balanceAfter: nextOnHand - balance.reserved,
          idempotencyKey: `return:${returnId}:${line.variantId}:${locationId}`,
          note: `Return ${returnId}`,
        },
      });
    }

    await this.refreshStockAlerts(
      lines.map((line) => ({
        variantId: line.variantId,
        locationId: line.locationId ?? location.id,
      })),
      tx,
    );
  }

  /**
   * Holds replacement variants when an exchange is approved. Does not create an
   * order reservation row — post-shipment exchanges track holds via movement keys.
   */
  async reserveExchangeReplacements(
    returnRequestId: string,
    lines: ReserveLine[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
    const alertKeys: Array<{ variantId: string; locationId: string }> = [];

    for (const line of sorted) {
      const balances = await tx.$queryRaw<
        Array<{ id: string; locationId: string; onHand: number; reserved: number; version: number }>
      >`
        SELECT id, "locationId", "onHand", reserved, version
        FROM inventory_balance
        WHERE "variantId" = ${line.variantId}::uuid
          AND "locationId" IN (
            SELECT id FROM inventory_location WHERE "isActive" = true
          )
        ORDER BY "locationId"
        FOR UPDATE
      `;

      let remaining = line.quantity;
      for (const balance of balances) {
        if (remaining <= 0) break;
        const available = balance.onHand - balance.reserved;
        if (available <= 0) continue;
        const take = Math.min(available, remaining);
        const nextReserved = balance.reserved + take;
        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: { reserved: nextReserved, version: { increment: 1 } },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: line.variantId,
            locationId: balance.locationId,
            type: InventoryMovementType.RESERVE,
            quantity: take,
            balanceAfter: balance.onHand - nextReserved,
            idempotencyKey: `exchange-reserve:${returnRequestId}:${line.variantId}:${balance.locationId}`,
            note: `Exchange return ${returnRequestId}`,
          },
        });
        alertKeys.push({ variantId: line.variantId, locationId: balance.locationId });
        remaining -= take;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          `Insufficient stock for exchange variant ${line.variantId}.`,
        );
      }
    }

    if (alertKeys.length > 0) {
      await this.refreshStockAlerts(alertKeys, tx);
    }
  }

  /**
   * Consumes exchange replacement stock reserved at approval time.
   */
  async consumeExchangeReplacements(
    returnRequestId: string,
    lines: ReserveLine[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
    const alertKeys: Array<{ variantId: string; locationId: string }> = [];

    for (const line of sorted) {
      let remaining = line.quantity;
      const balances = await tx.$queryRaw<
        Array<{ id: string; locationId: string; onHand: number; reserved: number }>
      >`
        SELECT id, "locationId", "onHand", reserved
        FROM inventory_balance
        WHERE "variantId" = ${line.variantId}::uuid
          AND "locationId" IN (
            SELECT id FROM inventory_location WHERE "isActive" = true
          )
        ORDER BY "locationId"
        FOR UPDATE
      `;

      for (const balance of balances) {
        if (remaining <= 0) break;
        if (balance.reserved <= 0) continue;
        const take = Math.min(balance.reserved, remaining);
        const nextOnHand = balance.onHand - take;
        const nextReserved = balance.reserved - take;
        if (nextOnHand < 0 || nextReserved < 0) {
          throw new BadRequestException('Cannot complete exchange: inventory accounting conflict');
        }
        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            onHand: nextOnHand,
            reserved: nextReserved,
            version: { increment: 1 },
          },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: line.variantId,
            locationId: balance.locationId,
            type: InventoryMovementType.SALE,
            quantity: -take,
            balanceAfter: nextOnHand - nextReserved,
            idempotencyKey: `exchange-sale:${returnRequestId}:${line.variantId}:${balance.locationId}`,
            note: `Exchange return ${returnRequestId}`,
          },
        });
        alertKeys.push({ variantId: line.variantId, locationId: balance.locationId });
        remaining -= take;
      }

      if (remaining > 0) {
        throw new BadRequestException('Cannot complete exchange: replacement reservation missing');
      }
    }

    if (alertKeys.length > 0) {
      await this.refreshStockAlerts(alertKeys, tx);
    }
  }

  async listStockAlerts(params?: { resolved?: boolean; limit?: number }) {
    const limit = Math.min(Math.max(params?.limit ?? 50, 1), 100);
    return this.prisma.stockAlert.findMany({
      where: {
        resolvedAt: params?.resolved === true ? { not: null } : null,
      },
      include: {
        balance: {
          select: {
            onHand: true,
            reserved: true,
            lowStockThreshold: true,
            variant: { select: { id: true, sku: true, size: true, color: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async refreshStockAlerts(
    keys: Array<{ variantId: string; locationId: string }>,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const unique = new Map(
      keys.map((key) => [`${key.variantId}:${key.locationId}`, key] as const),
    );

    for (const { variantId, locationId } of unique.values()) {
      const balance = await tx.inventoryBalance.findUnique({
        where: { variantId_locationId: { variantId, locationId } },
      });
      if (!balance) continue;

      const available = Math.max(0, balance.onHand - balance.reserved);
      const level: StockAlertLevel | null =
        available <= 0
          ? StockAlertLevel.OUT
          : available <= balance.lowStockThreshold
            ? StockAlertLevel.LOW
            : null;

      const openAlerts = await tx.stockAlert.findMany({
        where: { balanceId: balance.id, resolvedAt: null },
      });

      if (!level) {
        if (openAlerts.length > 0) {
          await tx.stockAlert.updateMany({
            where: { balanceId: balance.id, resolvedAt: null },
            data: { resolvedAt: new Date() },
          });
        }
        continue;
      }

      const matching = openAlerts.find((alert) => alert.level === level);
      if (matching) {
        await tx.stockAlert.update({
          where: { id: matching.id },
          data: { available, threshold: balance.lowStockThreshold },
        });
        for (const stale of openAlerts.filter((alert) => alert.id !== matching.id)) {
          await tx.stockAlert.update({
            where: { id: stale.id },
            data: { resolvedAt: new Date() },
          });
        }
        continue;
      }

      if (openAlerts.length > 0) {
        await tx.stockAlert.updateMany({
          where: { balanceId: balance.id, resolvedAt: null },
          data: { resolvedAt: new Date() },
        });
      }

      await tx.stockAlert.create({
        data: {
          balanceId: balance.id,
          level,
          available,
          threshold: balance.lowStockThreshold,
        },
      });
    }
  }

  async adjust(
    input: {
      variantId: string;
      locationId: string;
      quantityDelta: number;
      idempotencyKey: string;
      note?: string;
      expectedVersion?: number;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (input.quantityDelta === 0) {
      throw new BadRequestException('quantityDelta must be non-zero');
    }
    const existing = await tx.inventoryMovement.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return;

    const balances = await tx.$queryRaw<
      Array<{ id: string; onHand: number; reserved: number; version: number }>
    >`
      SELECT id, "onHand", reserved, version
      FROM inventory_balance
      WHERE "variantId" = ${input.variantId}::uuid
        AND "locationId" = ${input.locationId}::uuid
      FOR UPDATE
    `;
    let balance = balances[0];
    if (!balance) {
      if (input.quantityDelta < 0) {
        throw new BadRequestException('Cannot reduce stock for a missing balance');
      }
      const created = await tx.inventoryBalance.create({
        data: {
          variantId: input.variantId,
          locationId: input.locationId,
          onHand: 0,
          reserved: 0,
        },
      });
      balance = { id: created.id, onHand: 0, reserved: 0, version: 0 };
    }
    if (input.expectedVersion != null && balance.version !== input.expectedVersion) {
      throw new BadRequestException('Inventory version conflict; refresh and retry');
    }
    const nextOnHand = balance.onHand + input.quantityDelta;
    if (nextOnHand < 0 || balance.reserved > nextOnHand) {
      throw new BadRequestException('Adjustment would violate stock constraints');
    }
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { onHand: nextOnHand, version: { increment: 1 } },
    });
    await tx.inventoryMovement.create({
      data: {
        variantId: input.variantId,
        locationId: input.locationId,
        type: InventoryMovementType.ADJUSTMENT,
        quantity: input.quantityDelta,
        balanceAfter: nextOnHand - balance.reserved,
        idempotencyKey: input.idempotencyKey,
        note: input.note,
      },
    });

    await this.refreshStockAlerts(
      [{ variantId: input.variantId, locationId: input.locationId }],
      tx,
    );
  }
}
