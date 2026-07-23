'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AdminPagination, type AdminPageSize } from '@/components/admin/admin-pagination';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  useAdminCustomers,
  useCustomerSegmentSummary,
  type CustomerSegment,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

const segments: CustomerSegment[] = [
  'NEW',
  'ONE_TIME',
  'ACTIVE',
  'HIGH_VALUE',
  'AT_RISK',
  'DORMANT',
];

export default function AdminCustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<CustomerSegment | ''>('');
  const [sort, setSort] = useState<'RECENT' | 'HIGH_VALUE'>('RECENT');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);
  const customers = useAdminCustomers({
    page,
    limit: pageSize,
    ...(search ? { search } : {}),
    ...(segment ? { segment } : {}),
    sort,
  });
  const summary = useCustomerSegmentSummary();
  const meta = customers.data?.meta ?? {
    page,
    pageSize,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  function resetPagination() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        description="Customer value, lifecycle segments, and purchase behavior."
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {segments.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSegment(segment === key ? '' : key);
              resetPagination();
            }}
            className={`rounded-lg border p-4 text-left transition-colors ${
              segment === key
                ? 'border-[#C9A227] bg-[#C9A227]/10'
                : 'border-[#E5E7EB] bg-[#FFFFFF] hover:border-[#C9A227]/50'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#555555]">
              {key.replaceAll('_', ' ')}
            </p>
            <p className="mt-2 text-2xl font-extrabold text-[#111111]">
              {summary.data?.find((item) => item.segment === key)?.count ?? '—'}
            </p>
          </button>
        ))}
      </div>

      <AdminPanel
        title="Customer directory"
        description="Search profiles or focus on a lifecycle segment."
      >
        <form
          className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchInput.trim());
            resetPagination();
          }}
        >
          <AdminInput
            aria-label="Search customers"
            placeholder="Name, email, or phone"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <AdminSelect
            aria-label="Customer segment"
            value={segment}
            onChange={(event) => {
              setSegment(event.target.value as CustomerSegment | '');
              resetPagination();
            }}
          >
            <option value="">All segments</option>
            {segments.map((key) => (
              <option key={key} value={key}>
                {key.replaceAll('_', ' ')}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            aria-label="Customer sort"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as 'RECENT' | 'HIGH_VALUE');
              resetPagination();
            }}
          >
            <option value="RECENT">Recently joined</option>
            <option value="HIGH_VALUE">Highest LTV</option>
          </AdminSelect>
          <AdminButton type="submit">Search</AdminButton>
        </form>

        {customers.isError ? <AdminError>Could not load customers.</AdminError> : null}
        {customers.isLoading ? <AdminTableSkeleton /> : null}
        {customers.data?.data.length === 0 ? (
          <AdminEmpty>No customers match these filters.</AdminEmpty>
        ) : null}
        {(customers.data?.data.length ?? 0) > 0 ? (
          <div className={customers.isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Customer</AdminTh>
                  <AdminTh>Segment</AdminTh>
                  <AdminTh>Orders</AdminTh>
                  <AdminTh>LTV</AdminTh>
                  <AdminTh>Last order</AdminTh>
                  <AdminTh>Status</AdminTh>
                </tr>
              </thead>
              <tbody>
                {customers.data?.data.map((customer) => (
                  <tr key={customer.id}>
                    <AdminTd>
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-semibold text-[#111111] hover:text-[#C9A227]"
                      >
                        {[customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
                          'Unnamed customer'}
                      </Link>
                      <p className="text-xs text-[#555555]">{customer.email}</p>
                      <p className="text-xs text-[#555555]">{customer.phone}</p>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{customer.metrics.segment.replaceAll('_', ' ')}</StatusPill>
                    </AdminTd>
                    <AdminTd>{customer.metrics.orderCount}</AdminTd>
                    <AdminTd className="font-semibold text-[#C9A227]">
                      {formatTaka(customer.metrics.lifetimeValue)}
                    </AdminTd>
                    <AdminTd>
                      {customer.metrics.lastOrderAt
                        ? new Date(customer.metrics.lastOrderAt).toLocaleDateString()
                        : 'Never'}
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{customer.status.replaceAll('_', ' ')}</StatusPill>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
            <AdminPagination
              meta={meta}
              entityLabel="customers"
              isFetching={customers.isFetching && !customers.isLoading}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                resetPagination();
              }}
            />
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}
