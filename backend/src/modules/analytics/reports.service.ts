import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { access, mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ReportExportStatus } from '@/generated/prisma/client';
import type { CreateReportExportDto } from './dto/report-export.dto';
import { ReportsRepository } from './reports.repository';

export const REPORTS_QUEUE = 'reports';
export const GENERATE_REPORT_JOB = 'generate';

@Injectable()
export class ReportsService {
  readonly storageRoot: string;

  constructor(
    private readonly repository: ReportsRepository,
    @InjectQueue(REPORTS_QUEUE) private readonly queue: Queue,
    config: ConfigService,
  ) {
    this.storageRoot = resolve(
      config.get<string>('REPORTS_STORAGE_DIR') || resolve(process.cwd(), 'storage/reports'),
    );
  }

  async create(requestedBy: string, dto: CreateReportExportDto) {
    await mkdir(this.storageRoot, { recursive: true });
    void this.cleanupExpired();
    const job = await this.repository.create(requestedBy, dto.type, dto.format, dto.params);
    try {
      await this.queue.add(
        GENERATE_REPORT_JOB,
        { exportId: job.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 100 },
      );
    } catch {
      await this.repository.markFailed(job.id, 'Report queue is unavailable');
      throw new ServiceUnavailableException('Report queue is unavailable');
    }
    return this.serialize(job);
  }

  async get(id: string, requestedBy: string) {
    const job = await this.repository.findOwned(id, requestedBy);
    if (!job) throw new NotFoundException('Report export not found');
    return this.serialize(job);
  }

  async download(id: string, requestedBy: string) {
    const job = await this.repository.findOwned(id, requestedBy);
    if (!job) throw new NotFoundException('Report export not found');
    if (job.expiresAt && job.expiresAt <= new Date()) throw new GoneException('Report export expired');
    if (job.status !== ReportExportStatus.READY || !job.filePath || !job.fileName) {
      throw new ConflictException('Report export is not ready');
    }
    const filePath = resolve(job.filePath);
    if (!filePath.startsWith(`${this.storageRoot}/`)) {
      throw new NotFoundException('Report file not found');
    }
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Report file not found');
    }
    return { filePath, fileName: job.fileName, format: job.format };
  }

  private serialize(job: {
    id: string;
    type: string;
    format: string;
    status: string;
    fileName: string | null;
    errorMessage: string | null;
    rowCount: number | null;
    createdAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
  }) {
    return {
      id: job.id,
      type: job.type,
      format: job.format,
      status: job.status,
      fileName: job.fileName,
      errorMessage: job.errorMessage,
      rowCount: job.rowCount,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      expiresAt: job.expiresAt,
    };
  }

  private async cleanupExpired(): Promise<void> {
    const expired = await this.repository.listExpired();
    await Promise.all(
      expired.map(async (job) => {
        if (job.filePath) await unlink(job.filePath).catch(() => undefined);
        await this.repository.clearExpiredFile(job.id);
      }),
    );
  }
}
