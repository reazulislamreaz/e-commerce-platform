import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { takaInWords } from '@/common/utils/taka-in-words';
import type { OrderResponseDto } from './dto/order-response.dto';

interface InvoiceBranding {
  legalName: string;
  address: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
}

const COLOR = {
  ink: '#111111',
  muted: '#555555',
  gold: '#C9A227',
  border: '#E5E7EB',
  header: '#F4F4F5',
} as const;

const PAGE_MARGIN = 42;

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  exchanged: 'Exchanged',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  collected: 'Paid',
  cancelled: 'Cancelled',
};

/**
 * Renders a branded, print-ready A4 PDF invoice for a single order.
 * The document is built entirely in memory (no network/asset dependencies)
 * so generation stays fast and predictable under load.
 */
@Injectable()
export class InvoicePdfService {
  constructor(private readonly config: ConfigService) {}

  async generate(order: OrderResponseDto): Promise<Buffer> {
    const branding = this.resolveBranding();
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `Invoice ${order.number}`,
        Author: branding.legalName,
        Subject: `Invoice for order ${order.number}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.drawHeader(doc, order, branding);
    this.drawParties(doc, order);
    this.drawItemsTable(doc, order);
    this.drawSummary(doc, order);
    this.drawFooter(doc, branding);

    doc.end();
    return finished;
  }

  private resolveBranding(): InvoiceBranding {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN') ?? 'https://elevateapparel.com')
      .trim()
      .replace(/\/$/, '');
    const website = origin.replace(/^https?:\/\//, '');
    return {
      legalName: this.config.get<string>('COMPANY_LEGAL_NAME')?.trim() || 'Elevate Apparel Ltd.',
      address:
        this.config.get<string>('COMPANY_ADDRESS')?.trim() ||
        'House 42, Road 11, Banani, Dhaka 1213, Bangladesh',
      supportEmail:
        this.config.get<string>('SUPPORT_EMAIL')?.trim() || 'support@elevateapparel.com',
      supportPhone: this.config.get<string>('SUPPORT_PHONE')?.trim() || '+880 9610 000 000',
      website: website || 'elevateapparel.com',
    };
  }

  private get contentWidth(): number {
    return 595.28 - PAGE_MARGIN * 2;
  }

  private formatMoney(amount: number): string {
    return `Tk ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  private drawHeader(
    doc: PDFKit.PDFDocument,
    order: OrderResponseDto,
    branding: InvoiceBranding,
  ): void {
    const top = PAGE_MARGIN;

    // Brand wordmark (typographic — no external asset dependency).
    doc
      .font('Helvetica-Bold')
      .fontSize(21)
      .fillColor(COLOR.ink)
      .text('ELEVATE', PAGE_MARGIN, top, { continued: true })
      .fillColor(COLOR.gold)
      .text(' APPAREL');

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(COLOR.muted)
      .text(branding.legalName, PAGE_MARGIN, top + 26)
      .text(branding.address)
      .text(`${branding.supportPhone}  |  ${branding.supportEmail}`)
      .text(branding.website);

    // Invoice meta (right-aligned block).
    const metaWidth = 210;
    const metaX = 595.28 - PAGE_MARGIN - metaWidth;
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(COLOR.ink)
      .text('INVOICE', metaX, top, { width: metaWidth, align: 'right' });

    const created = new Date(order.createdAt);
    const metaRows: Array<[string, string]> = [
      ['Invoice No', `INV-${order.number}`],
      ['Order No', order.number],
      [
        'Date',
        created.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ],
      ['Payment', 'Cash on Delivery'],
      ['Payment Status', PAYMENT_STATUS_LABEL[order.paymentStatus ?? 'pending'] ?? 'Pending'],
      ['Order Status', ORDER_STATUS_LABEL[order.status] ?? order.status],
    ];

    let metaY = top + 32;
    doc.fontSize(9);
    for (const [label, value] of metaRows) {
      doc
        .font('Helvetica')
        .fillColor(COLOR.muted)
        .text(`${label}:`, metaX, metaY, { width: metaWidth / 2 - 4, align: 'right' });
      doc
        .font('Helvetica-Bold')
        .fillColor(COLOR.ink)
        .text(value, metaX + metaWidth / 2, metaY, { width: metaWidth / 2, align: 'right' });
      metaY += 14;
    }

    const dividerY = Math.max(top + 90, metaY) + 6;
    doc
      .moveTo(PAGE_MARGIN, dividerY)
      .lineTo(595.28 - PAGE_MARGIN, dividerY)
      .lineWidth(1)
      .strokeColor(COLOR.gold)
      .stroke();

    doc.y = dividerY + 14;
  }

  private drawParties(doc: PDFKit.PDFDocument, order: OrderResponseDto): void {
    const top = doc.y;
    const colWidth = (this.contentWidth - 24) / 2;
    const rightX = PAGE_MARGIN + colWidth + 24;
    const address = order.shippingAddress;

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text('BILLED & SHIPPED TO', PAGE_MARGIN, top, { width: colWidth, characterSpacing: 0.5 });
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLOR.ink)
      .text(address.fullName, PAGE_MARGIN, top + 15, { width: colWidth });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(`Phone: ${address.phone || order.phone || '—'}`, { width: colWidth })
      .text(`Email: ${order.email || '—'}`, { width: colWidth })
      .text(`${address.line1}${address.line2 ? `, ${address.line2}` : ''}`, { width: colWidth })
      .text(`${address.city}, ${address.district} ${address.postalCode}`, { width: colWidth })
      .text(address.country, { width: colWidth });
    const leftBottom = doc.y;

    const rightRows: Array<[string, string]> = [['Delivery Method', 'Standard Delivery']];
    if (order.shipment?.estimatedDeliveryAt) {
      rightRows.push([
        'Est. Delivery',
        new Date(order.shipment.estimatedDeliveryAt).toLocaleDateString('en-GB'),
      ]);
    }
    if (order.trackingNumber) {
      rightRows.push(['Tracking No', order.trackingNumber]);
    }
    if (order.couponCode) {
      rightRows.push(['Coupon', order.couponCode]);
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text('ORDER DETAILS', rightX, top, { width: colWidth, characterSpacing: 0.5 });
    let ry = top + 15;
    for (const [label, value] of rightRows) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLOR.muted)
        .text(`${label}:`, rightX, ry, { width: colWidth * 0.45, continued: false });
      doc
        .font('Helvetica-Bold')
        .fillColor(COLOR.ink)
        .text(value, rightX + colWidth * 0.45, ry, { width: colWidth * 0.55 });
      ry += 13;
    }

    doc.y = Math.max(leftBottom, ry) + 18;
  }

  private readonly columns = {
    index: { x: PAGE_MARGIN, width: 22 },
    description: { x: PAGE_MARGIN + 22, width: 190 },
    variant: { x: PAGE_MARGIN + 212, width: 96 },
    qty: { x: PAGE_MARGIN + 308, width: 40 },
    unit: { x: PAGE_MARGIN + 348, width: 78 },
    total: { x: PAGE_MARGIN + 426, width: 85 },
  };

  private drawTableHeader(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    const rowHeight = 20;
    doc.rect(PAGE_MARGIN, y, this.contentWidth, rowHeight).fillColor(COLOR.header).fill();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.ink);
    const textY = y + 6;
    doc.text('#', this.columns.index.x + 4, textY, { width: this.columns.index.width - 4 });
    doc.text('DESCRIPTION', this.columns.description.x, textY, {
      width: this.columns.description.width,
    });
    doc.text('SIZE / COLOR', this.columns.variant.x, textY, { width: this.columns.variant.width });
    doc.text('QTY', this.columns.qty.x, textY, { width: this.columns.qty.width, align: 'center' });
    doc.text('UNIT PRICE', this.columns.unit.x, textY, {
      width: this.columns.unit.width,
      align: 'right',
    });
    doc.text('TOTAL', this.columns.total.x, textY, {
      width: this.columns.total.width,
      align: 'right',
    });
    doc.y = y + rowHeight;
  }

  private drawItemsTable(doc: PDFKit.PDFDocument, order: OrderResponseDto): void {
    const pageBottom = 841.89 - PAGE_MARGIN - 40;
    this.drawTableHeader(doc);

    const topPad = 6;
    const bottomPad = 6;
    const skuHeight = 10;

    order.items.forEach((item, index) => {
      const nameHeight = doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .heightOfString(item.name, { width: this.columns.description.width });
      const variantHeight = doc
        .font('Helvetica')
        .fontSize(9)
        .heightOfString(`${item.size} / ${item.color}`, { width: this.columns.variant.width });
      const descBlockHeight = nameHeight + (item.sku ? skuHeight : 0);
      const rowHeight = Math.max(28, topPad + Math.max(descBlockHeight, variantHeight) + bottomPad);

      if (doc.y + rowHeight > pageBottom) {
        doc.addPage();
        this.drawTableHeader(doc);
      }

      const startY = doc.y;
      const textY = startY + topPad;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLOR.muted)
        .text(String(index + 1), this.columns.index.x + 4, textY, {
          width: this.columns.index.width - 4,
          lineBreak: false,
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLOR.ink)
        .text(item.name, this.columns.description.x, textY, {
          width: this.columns.description.width,
        });
      if (item.sku) {
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(COLOR.muted)
          .text(`SKU: ${item.sku}`, this.columns.description.x, textY + nameHeight + 1, {
            width: this.columns.description.width,
            lineBreak: false,
          });
      }

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLOR.muted)
        .text(`${item.size} / ${item.color}`, this.columns.variant.x, textY, {
          width: this.columns.variant.width,
        });
      doc.fillColor(COLOR.ink).text(String(item.quantity), this.columns.qty.x, textY, {
        width: this.columns.qty.width,
        align: 'center',
        lineBreak: false,
      });
      doc.text(this.formatMoney(item.unitPrice), this.columns.unit.x, textY, {
        width: this.columns.unit.width,
        align: 'right',
        lineBreak: false,
      });
      doc
        .font('Helvetica-Bold')
        .fillColor(COLOR.ink)
        .text(
          this.formatMoney(item.lineTotal ?? item.unitPrice * item.quantity),
          this.columns.total.x,
          textY,
          { width: this.columns.total.width, align: 'right', lineBreak: false },
        );

      const rowEnd = startY + rowHeight;
      doc
        .moveTo(PAGE_MARGIN, rowEnd)
        .lineTo(595.28 - PAGE_MARGIN, rowEnd)
        .lineWidth(0.5)
        .strokeColor(COLOR.border)
        .stroke();
      doc.y = rowEnd;
    });
  }

  private drawSummary(doc: PDFKit.PDFDocument, order: OrderResponseDto): void {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const summaryWidth = 240;
    const summaryX = 595.28 - PAGE_MARGIN - summaryWidth;
    const pageBottom = 841.89 - PAGE_MARGIN - 120;

    if (doc.y + 120 > pageBottom) {
      doc.addPage();
    }

    let y = doc.y + 14;
    const rows: Array<[string, string]> = [['Subtotal', this.formatMoney(order.subtotal)]];
    if (order.discount > 0) {
      rows.push(['Discount', `- ${this.formatMoney(order.discount)}`]);
    }
    rows.push(['Shipping', order.shipping === 0 ? 'Free' : this.formatMoney(order.shipping)]);

    doc.fontSize(9.5);
    for (const [label, value] of rows) {
      doc
        .font('Helvetica')
        .fillColor(COLOR.muted)
        .text(label, summaryX, y, { width: summaryWidth * 0.5 });
      doc
        .font('Helvetica')
        .fillColor(COLOR.ink)
        .text(value, summaryX + summaryWidth * 0.5, y, {
          width: summaryWidth * 0.5,
          align: 'right',
        });
      y += 16;
    }

    doc
      .moveTo(summaryX, y + 2)
      .lineTo(595.28 - PAGE_MARGIN, y + 2)
      .lineWidth(1)
      .strokeColor(COLOR.ink)
      .stroke();
    y += 10;

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLOR.ink)
      .text('Grand Total', summaryX, y, { width: summaryWidth * 0.5 });
    doc
      .fillColor(COLOR.gold)
      .text(this.formatMoney(order.total), summaryX + summaryWidth * 0.5, y, {
        width: summaryWidth * 0.5,
        align: 'right',
      });
    y += 24;

    // Total items + amount in words (left-aligned meta).
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLOR.muted)
      .text(`Total Items: ${totalItems}  |  Currency: BDT`, PAGE_MARGIN, y, {
        width: this.contentWidth,
      });
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(COLOR.ink)
      .text(`In words: ${takaInWords(order.total)}`, PAGE_MARGIN, doc.y + 2, {
        width: this.contentWidth,
      });

    doc.y = Math.max(doc.y, y) + 6;
  }

  private drawFooter(doc: PDFKit.PDFDocument, branding: InvoiceBranding): void {
    const footerTop = 841.89 - PAGE_MARGIN - 76;
    const y = Math.max(doc.y + 20, footerTop);

    doc
      .moveTo(PAGE_MARGIN, y)
      .lineTo(595.28 - PAGE_MARGIN, y)
      .lineWidth(0.5)
      .strokeColor(COLOR.border)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLOR.ink)
      .text('Thank you for shopping with Elevate Apparel.', PAGE_MARGIN, y + 10, {
        width: this.contentWidth,
        align: 'center',
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLOR.muted)
      .text(
        'Returns accepted within 7 days of delivery for unused items in original condition with tags intact.',
        PAGE_MARGIN,
        doc.y + 4,
        { width: this.contentWidth, align: 'center' },
      )
      .text(
        `Support: ${branding.supportPhone}  |  ${branding.supportEmail}  |  ${branding.website}`,
        { width: this.contentWidth, align: 'center' },
      );
  }
}
