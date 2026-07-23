import type { SeedPrisma } from './client';
import { loadSeedConfig } from './config';
import { createSeedContext } from './types';
import { seedLog } from './utils/logger';
import { seedUsers } from './seeders/users.seeder';
import { seedCatalog } from './seeders/catalog.seeder';
import { seedPromotions } from './seeders/promotions.seeder';
import { seedMarketing } from './seeders/marketing.seeder';
import { seedStockAlerts } from './seeders/stock-alerts.seeder';
import { seedPreferences } from './seeders/preferences.seeder';
import { seedAddresses } from './seeders/addresses.seeder';
import { seedCartsAndWishlists } from './seeders/carts-wishlists.seeder';
import { seedDeliveryPartners } from './seeders/delivery-partners.seeder';
import { seedOrders } from './seeders/orders.seeder';
import { seedUserReviews } from './seeders/reviews.seeder';
import { seedNotifications } from './seeders/notifications.seeder';
import { seedCrm } from './seeders/crm.seeder';
import { seedContactAndNewsletter } from './seeders/contact-newsletter.seeder';
import { seedAbandonedCarts } from './seeders/abandoned-carts.seeder';
import { seedReportJobs } from './seeders/reports.seeder';

/**
 * Ordered, idempotent seed pipeline. Core profile stops after stock alerts.
 * Full profile (+ SEED_COMMERCE_DEMO) populates the commerce demo graph.
 */
export async function runSeed(prisma: SeedPrisma): Promise<void> {
  const config = loadSeedConfig();
  if (config.skip) {
    seedLog(`Skipping seed: ${config.skipReason}`);
    return;
  }

  seedLog(
    `Starting seed (env=${config.nodeEnv}, profile=${config.profile}, commerceDemo=${config.includeCommerceDemo})`,
  );

  const ctx = createSeedContext(prisma, config);

  await seedUsers(ctx);
  await seedCatalog(ctx);
  await seedPromotions(ctx);
  await seedMarketing(ctx);
  await seedStockAlerts(ctx);

  if (!config.includeCommerceDemo) {
    seedLog('Commerce demo disabled — core seed complete.');
    return;
  }

  await seedPreferences(ctx);
  await seedAddresses(ctx);
  await seedCartsAndWishlists(ctx);
  await seedDeliveryPartners(ctx);
  await seedOrders(ctx);
  await seedUserReviews(ctx);
  await seedNotifications(ctx);
  await seedCrm(ctx);
  await seedContactAndNewsletter(ctx);
  await seedAbandonedCarts(ctx);
  await seedReportJobs(ctx);

  seedLog('Seed completed successfully.');
}
