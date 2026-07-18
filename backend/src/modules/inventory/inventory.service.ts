import { BadRequestException, Injectable } from '@nestjs/common';
import {
  InventoryMovementType,
  Prisma,
  ReservationStatus,
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
        items: {
          create: allocations.map((a) => ({
            variantId: a.variantId,
            locationId: a.locationId,
            quantity: a.quantity,
          })),
        },
      },
    });
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
      data: { status: ReservationStatus.RELEASED },
    });
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
  }
}
