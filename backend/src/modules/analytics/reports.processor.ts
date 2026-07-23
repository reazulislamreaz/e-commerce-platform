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
  type ColumnSpec,
  type ExportRow,
} from './reports.repository';
import { GENERATE_REPORT_JOB, REPORTS_QUEUE, ReportsService } from './reports.service';

type ReportJobData = { exportId: string };
type ExportParams = { from?: string; to?: string };

/** Prefix spreadsheet formula triggers to neutralise CSV/XLSX injection. */
export function sanitizeSpreadsheetCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

/** Worksheet name sanitised for Excel (max 31 chars, no special chars). */
const SHEET_NAMES: Record<string, string> = {
  REVENUE: 'Revenue',
  ORDERS: 'Orders',
  PRODUCTS: 'Products',
  CUSTOMERS: 'Customers',
  INVENTORY: 'Inventory',
};

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
      const columns = this.repository.exportColumns(exportJob.type);
      const rowCount =
        exportJob.format === 'CSV'
          ? await this.writeCsvBatched(filePath, exportJob.type, columns, from, to)
          : await this.writeXlsxBatched(filePath, exportJob.type, columns, from, to);
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

  // ---------------------------------------------------------------------------
  // CSV
  // ---------------------------------------------------------------------------

  private async writeCsvBatched(
    filePath: string,
    type: Parameters<ReportsRepository['exportRowsPage']>[0],
    columns: ColumnSpec[],
    from: Date | undefined,
    to: Date | undefined,
  ): Promise<number> {
    // utf-8 BOM so Excel auto-detects the encoding (required for Bangla and special chars)
    const BOM = '\uFEFF';
    const stream = createWriteStream(filePath, { encoding: 'utf8', flags: 'wx' });
    const write = async (line: string) => {
      if (!stream.write(line)) await once(stream, 'drain');
    };
    let rowCount = 0;
    try {
      // Header row — use human-readable labels
      await write(BOM + columns.map((col) => this.csvCell(col.label)).join(',') + '\n');
      for await (const row of this.iterateRows(type, from, to)) {
        // Data row — look up each cell by the DB alias key
        await write(columns.map((col) => this.csvCell(row[col.key])).join(',') + '\n');
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

  // ---------------------------------------------------------------------------
  // XLSX
  // ---------------------------------------------------------------------------

  private async writeXlsxBatched(
    filePath: string,
    type: Parameters<ReportsRepository['exportRowsPage']>[0],
    columns: ColumnSpec[],
    from: Date | undefined,
    to: Date | undefined,
  ): Promise<number> {
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: filePath,
      useStyles: true,
      useSharedStrings: true,
    });
    const sheetName = SHEET_NAMES[type as string] ?? 'Report';
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }], // freeze the header row
    });

    // Define columns with proper widths based on label length
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(14, Math.min(40, col.label.length + 6)),
    }));

    // Style the header row: bold, light-grey fill, border
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4F4F5' },
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    headerRow.height = 20;
    headerRow.commit();

    let rowCount = 0;
    for await (const row of this.iterateRows(type, from, to)) {
      const values = Object.fromEntries(
        columns.map((col) => [col.key, this.xlsxCellValue(row[col.key])]),
      );
      const excelRow = worksheet.addRow(values);
      // Align number-like cells (anything that is a number) to the right
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        if (typeof cell.value === 'number') {
          cell.alignment = { horizontal: 'right' };
          cell.numFmt = '#,##0.00';
        } else {
          cell.alignment = { horizontal: 'left', wrapText: false };
        }
      });
      excelRow.commit();
      rowCount += 1;
    }

    worksheet.commit();
    await workbook.commit();
    return rowCount;
  }

  // ---------------------------------------------------------------------------
  // Cell helpers
  // ---------------------------------------------------------------------------

  /** Wrap a value in RFC-4180 quoted CSV cell, escaping quotes inside. */
  private csvCell(value: unknown): string {
    const text =
      value == null ? '' : value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    return `"${sanitizeSpreadsheetCell(text).replaceAll('"', '""')}"`;
  }

  /** Convert a raw cell value to a type appropriate for ExcelJS (string | number). */
  private xlsxCellValue(value: ExportRow[string]): string | number {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'bigint') return sanitizeSpreadsheetCell(value.toString());
    if (typeof value === 'number') return value;
    return sanitizeSpreadsheetCell(String(value));
  }
}
