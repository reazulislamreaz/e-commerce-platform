/** Shared BullMQ queue for replica-safe platform maintenance jobs. */
export const PLATFORM_QUEUE = 'platform';

export const PLATFORM_JOB = {
  OUTBOX_RELAY: 'outbox.relay',
  RETENTION_PURGE: 'retention.purge',
  INVENTORY_RELEASE_EXPIRED: 'inventory.release-expired',
  CRM_METRICS_BACKFILL: 'crm.metrics-backfill',
} as const;

export type PlatformJobName = (typeof PLATFORM_JOB)[keyof typeof PLATFORM_JOB];
