import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OrdersService } from '@/modules/orders/orders.service';

/**
 * Releases expired inventory reservations so abandoned COD holds
 * cannot permanently starve the catalog. Invoked by PlatformProcessor.
 */
@Injectable()
export class InventoryMaintenanceService {
  private readonly logger = new Logger(InventoryMaintenanceService.name);

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
  ) {}

  async tick(): Promise<number> {
    const released = await this.orders.releaseExpiredReservationHolds(50);
    if (released > 0) {
      this.logger.log({ released }, 'Released expired inventory reservations');
    }
    return released;
  }
}
