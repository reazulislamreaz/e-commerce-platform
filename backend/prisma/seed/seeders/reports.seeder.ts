import {
  ReportExportFormat,
  ReportExportStatus,
  ReportExportType,
} from '../../../src/generated/prisma/client';
import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

/** Sample completed report export job for admin analytics UI demos. */
export async function seedReportJobs(ctx: SeedContext): Promise<void> {
  const requester = ctx.users.admin ?? ctx.users.superAdmin;
  if (!requester) {
    seedLog('No admin requester for report jobs; skipping.');
    return;
  }

  const id = seedUuid('report-job:orders-csv');
  await ctx.prisma.reportExportJob.upsert({
    where: { id },
    create: {
      id,
      requestedBy: requester.id,
      type: ReportExportType.ORDERS,
      format: ReportExportFormat.CSV,
      status: ReportExportStatus.READY,
      params: { seeded: true, range: '2026-Q2' },
      fileName: 'orders-2026-q2-seed.csv',
      filePath: null,
      rowCount: 8,
      completedAt: new Date('2026-07-01T12:00:00.000Z'),
      expiresAt: new Date('2026-07-02T12:00:00.000Z'),
    },
    update: {
      status: ReportExportStatus.READY,
      rowCount: 8,
      requestedBy: requester.id,
    },
  });

  seedLog('Seeded sample report export job.');
}
