'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, TrendingDown, TrendingUp } from 'lucide-react';
import { AreaChart, MeterBar } from '@/components/admin/admin-charts';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminPanel,
  AdminSkeleton,
  AdminTable,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  useAnalyticsOverview,
  useBestsellers,
  useCreateReportExport,
  useCustomerAnalytics,
  useInventoryAnalytics,
  useReportExport,
  useSalesAnalytics,
  type ReportExportFormat,
  type ReportExportType,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';
import { cn } from '@/lib/utils';

const REPORTS: Array<{ type: ReportExportType; label: string }> = [
  { type: 'REVENUE', label: 'Revenue' },
  { type: 'ORDERS', label: 'Orders' },
  { type: 'PRODUCTS', label: 'Products' },
  { type: 'CUSTOMERS', label: 'Customers' },
  { type: 'INVENTORY', label: 'Inventory' },
];

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-[#8b867d]">No prior data</span>;
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-bold',
        positive ? 'text-emerald-300' : 'text-red-300',
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {positive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

function ExportControl({ type, label }: { type: ReportExportType; label: string }) {
  const [format, setFormat] = useState<ReportExportFormat>('CSV');
  const [jobId, setJobId] = useState<string>();
  const create = useCreateReportExport();
  const job = useReportExport(jobId);
  const status = job.data?.status;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2d2a27] bg-[#0d0c0b] p-3">
      <FileSpreadsheet className="size-4 text-[#e3bb78]" strokeWidth={1.6} />
      <span className="min-w-[90px] flex-1 text-sm font-semibold text-white">{label}</span>
      <select
        aria-label={`${label} export format`}
        value={format}
        onChange={(event) => setFormat(event.target.value as ReportExportFormat)}
        className="rounded-[4px] border border-[#37332c] bg-[#1a1815] px-2 py-1.5 text-xs text-white outline-none focus:border-[#e3bb78]"
      >
        <option value="CSV">CSV</option>
        <option value="XLSX">XLSX</option>
      </select>
      {status === 'READY' && job.data?.fileName ? (
        <AdminButton
          size="sm"
          onClick={() => void adminApi.downloadReportExport(job.data!.id, job.data!.fileName!)}
        >
          <Download className="size-3.5" />
          Download
        </AdminButton>
      ) : (
        <AdminButton
          size="sm"
          loading={create.isPending || status === 'PENDING' || status === 'PROCESSING'}
          onClick={() =>
            create.mutate(
              { type, format },
              {
                onSuccess: (created) => setJobId(created.id),
              },
            )
          }
        >
          Export
        </AdminButton>
      )}
      {status === 'FAILED' ? (
        <p className="w-full text-xs text-red-300">{job.data?.errorMessage ?? 'Export failed.'}</p>
      ) : null}
      {create.isError ? <p className="w-full text-xs text-red-300">Could not queue export.</p> : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const overview = useAnalyticsOverview();
  const sales = useSalesAnalytics();
  const bestsellers = useBestsellers(8);
  const customers = useCustomerAnalytics();
  const inventory = useInventoryAnalytics();
  const hasError =
    overview.isError || sales.isError || bestsellers.isError || customers.isError || inventory.isError;

  const cards = overview.data
    ? [
        {
          label: 'Total revenue',
          value: formatTaka(overview.data.totalRevenue),
          delta: overview.data.deltas.revenue30d,
          hint: '30-day trend',
        },
        {
          label: 'Revenue today',
          value: formatTaka(overview.data.revenueToday),
          delta: overview.data.deltas.revenueToday,
          hint: 'vs yesterday',
        },
        {
          label: 'Orders today',
          value: String(overview.data.ordersToday),
          delta: overview.data.deltas.ordersToday,
          hint: 'vs yesterday',
        },
        {
          label: 'Revenue · 30 days',
          value: formatTaka(overview.data.revenue30d),
          delta: overview.data.deltas.revenue30d,
          hint: 'vs prior 30 days',
        },
      ]
    : [];

  const maxUnits = Math.max(...(bestsellers.data?.map((item) => item.units) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reports & Analytics"
        description="Database-backed revenue, sales, customer, product, and inventory intelligence."
      />

      {hasError ? <AdminError>Some analytics could not be loaded. Try refreshing the page.</AdminError> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading
          ? Array.from({ length: 4 }, (_, index) => <AdminSkeleton key={index} className="h-32" />)
          : cards.map((card) => (
              <div key={card.label} className="rounded-lg border border-[#2d2a27] bg-[#111110] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b5b0a8]">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{card.value}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Delta value={card.delta} />
                  <span className="text-[10px] text-[#8b867d]">{card.hint}</span>
                </div>
              </div>
            ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <AdminPanel title="Sales trend" description="Recognized revenue over the trailing 30 days.">
          {sales.isLoading ? (
            <AdminSkeleton className="h-52" />
          ) : sales.data?.length ? (
            <AreaChart
              points={sales.data.map((point) => ({
                label: new Date(`${point.bucket}T00:00:00Z`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }),
                value: point.revenue,
              }))}
              formatValue={formatTaka}
            />
          ) : (
            <AdminEmpty>No recognized sales in this period.</AdminEmpty>
          )}
        </AdminPanel>

        <AdminPanel title="Inventory risk" description="Stock requiring immediate attention.">
          {inventory.isLoading ? (
            <AdminSkeleton className="h-52" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[4px] border border-amber-700/30 bg-amber-950/20 p-3">
                  <p className="text-2xl font-extrabold text-amber-200">
                    {inventory.data?.lowStockCount ?? 0}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-amber-300/70">
                    Low stock
                  </p>
                </div>
                <div className="rounded-[4px] border border-red-800/30 bg-red-950/20 p-3">
                  <p className="text-2xl font-extrabold text-red-200">
                    {inventory.data?.outOfStockCount ?? 0}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[.1em] text-red-300/70">
                    Out of stock
                  </p>
                </div>
              </div>
              {(inventory.data?.topLowSkus ?? []).slice(0, 5).map((item) => (
                <div key={item.variantId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{item.productName}</p>
                    <p className="text-xs text-[#8b867d]">{item.sku}</p>
                  </div>
                  <span className={item.available <= 0 ? 'text-red-300' : 'text-amber-200'}>
                    {item.available} available
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Bestsellers" description="Ranked by recognized units and item revenue.">
          {bestsellers.isLoading ? (
            <AdminSkeleton className="h-64" />
          ) : bestsellers.data?.length ? (
            <div className="space-y-4">
              {bestsellers.data.map((item) => (
                <div key={item.productId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                    <p className="shrink-0 text-xs text-[#e3bb78]">
                      {item.units} units · {formatTaka(item.revenue)}
                    </p>
                  </div>
                  <MeterBar percent={(item.units / maxUnits) * 100} className="mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <AdminEmpty>No bestseller data yet.</AdminEmpty>
          )}
        </AdminPanel>

        <AdminPanel
          title="Top customers"
          description={`${customers.data?.newCustomers ?? 0} new in 30 days · ${customers.data?.highValueCount ?? 0} high-value`}
        >
          {customers.isLoading ? (
            <AdminSkeleton className="h-64" />
          ) : customers.data?.topCustomers.length ? (
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Customer</AdminTh>
                  <AdminTh>Orders</AdminTh>
                  <AdminTh>Lifetime value</AdminTh>
                </tr>
              </thead>
              <tbody>
                {customers.data.topCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <AdminTd>
                      <p className="font-semibold text-white">{customer.name}</p>
                      <p className="text-xs text-[#8b867d]">{customer.email}</p>
                    </AdminTd>
                    <AdminTd>{customer.orderCount}</AdminTd>
                    <AdminTd>
                      <span className="font-semibold text-[#e3bb78]">
                        {formatTaka(customer.lifetimeValue)}
                      </span>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          ) : (
            <AdminEmpty>No customer value data yet.</AdminEmpty>
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Report exports" description="Generate expiring CSV or XLSX files asynchronously.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => (
            <ExportControl key={report.type} {...report} />
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
