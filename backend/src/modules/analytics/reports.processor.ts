import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import ExcelJS from 'exceljs';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { once } from 'node:events';
import { join } from 'node:path';
import {
  REPORT_EXPORT_BATCH_SIZE,
  ReportsRepository,
  type ExportRow,
} from './reports.repository';
import {
  GENERATE_REPORT_JOB,
  REPORTS_QUEUE,
  ReportsService,
} from './reports.service';

type ReportJobData = { exportId: string };
type ExportParams = { from?: string; to?: string };

/** Prefix spreadsheet formula triggers to neutralize CSV/XLSX injection. */
export function sanitizeSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

@Processor(REPORTS_QUEUE)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(
    private readonly repository: ReportsRepository,
    private readonly reports: ReportsService,
  ) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<void> {
    if (job.name !== GENERATE_REPORT_JOB) return;
    const exportJob = await this.repository.findById(job.data.exportId);
    if (!exportJob) return;
    await this.repository.markProcessing(exportJob.id);
    await mkdir(this.reports.storageRoot, { recursive: true });
    const extension = exportJob.format.toLowerCase();
    const fileName = `${exportJob.type.toLowerCase()}-${exportJob.id}.${extension}`;
    const filePath = join(this.reports.storageRoot, fileName);

    try {
      const params = (exportJob.params ?? {}) as ExportParams;
      const from = params.from ? new Date(params.from) : undefined;
      const to = params.to ? new Date(params.to) : undefined;
      const headers = this.repository.exportHeaders(exportJob.type);
      const rowCount =
        exportJob.format === 'CSV'
          ? await this.writeCsvBatched(filePath, exportJob.type, headers, from, to)
          : await this.writeXlsxBatched(filePath, exportJob.type, headers, from, to);
      await this.repository.markReady(exportJob.id, filePath, fileName, rowCount);
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      const message = error instanceof Error ? error.message : 'Unknown report generation error';
      await this.repository.markFailed(exportJob.id, message);
      this.logger.error(`Report export ${exportJob.id} failed: ${message}`);
      throw error;
    }
  }

  private async *iterateRows(
    type: Parameters<ReportsRepository['exportRowsPage']>[0],
    from: Date | undefined,
    to: Date | undefined,
  ): AsyncGenerator<ExportRow> {
    let offset = 0;
    for (;;) {
      const batch = await this.repository.exportRowsPage(
        type,
        from,
        to,
        offset,
        REPORT_EXPORT_BATCH_SIZE,
      );
      if (batch.length === 0) break;
      for (const row of batch) yield row;
      if (batch.length < REPORT_EXPORT_BATCH_SIZE) break;
      offset += batch.length;
    }
  }

  private async writeCsvBatched(
    filePath: string,
    type: Parameters<ReportsRepository['exportRowsPage']>[0],
    headers: string[],
    from: Date | undefined,
    to: Date | undefined,
  ): Promise<number> {
    const stream = createWriteStream(filePath, { encoding: 'utf8', flags: 'wx' });
    const write = async (line: string) => {
      if (!stream.write(line)) await once(stream, 'drain');
    };
    let rowCount = 0;
    try {
      await write(`${headers.map((header) => this.csvCell(header)).join(',')}\n`);
      for await (const row of this.iterateRows(type, from, to)) {
        await write(`${headers.map((header) => this.csvCell(row[header])).join(',')}\n`);
        rowCount += 1;
      }
      stream.end();
      await once(stream, 'finish');
      return rowCount;
    } catch (error) {
      stream.destroy();
      throw error;
    }
  }

  private async writeXlsxBatched(
    filePath: string,
    type: Parameters<ReportsRepository['exportRowsPage']>[0],
    headers: string[],
    from: Date | undefined,
    to: Date | undefined,
  ): Promise<number> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: true,
      useSharedStrings: true,
    });
    const worksheet = workbook.addWorksheet('Report');
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(14, Math.min(32, header.length + 4)),
    }));
    let rowCount = 0;
    for await (const row of this.iterateRows(type, from, to)) {
      worksheet
        .addRow(
          Object.fromEntries(
            headers.map((header) => [header, this.spreadsheetValue(row[header])]),
          ),
        )
        .commit();
      rowCount += 1;
    }
    worksheet.commit();
    await workbook.commit();
    return rowCount;
  }

  private csvCell(value: unknown): string {
    const text = value instanceof Date ? value.toISOString() : value == null ? '' : String(value);
    return `"${sanitizeSpreadsheetCell(text).replaceAll('"', '""')}"`;
  }

  private spreadsheetValue(value: ExportRow[string]): string | number | Date {
    if (value instanceof Date) return value;
    if (typeof value === 'bigint') return sanitizeSpreadsheetCell(value.toString());
    if (typeof value === 'string') return sanitizeSpreadsheetCell(value);
    return value ?? '';
  }
}
