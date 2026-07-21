'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CloudUpload,
  CloudOff,
  Eye,
  FileEdit,
  ImageIcon,
  Package,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminIconButton,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminStatCard,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
  adminIconActionClass,
} from '@/components/admin/admin-ui';
import { ProductCreateModal } from '@/features/admin/components/product-create-modal';
import { ProductEditModal } from '@/features/admin/components/product-edit-modal';
import { mutationErrorMessage } from '@/features/admin/mutation-error';
import {
  adminApi,
  adminKeys,
  useAdminBrands,
  useAdminCategories,
  useAdminMutation,
  useAdminProducts,
  useAdminProductStats,
  type AdminProductSummary,
  type AdminProductSort,
  type AdminStockFilter,
  type ProductStatus,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const SORT_OPTIONS: Array<{ value: AdminProductSort; label: string }> = [
  { value: 'UPDATED_DESC', label: 'Recently updated' },
  { value: 'CREATED_DESC', label: 'Newest first' },
  { value: 'CREATED_ASC', label: 'Oldest first' },
  { value: 'NAME_ASC', label: 'Name A–Z' },
  { value: 'NAME_DESC', label: 'Name Z–A' },
  { value: 'PRICE_ASC', label: 'Price: low to high' },
  { value: 'PRICE_DESC', label: 'Price: high to low' },
];

/** Columns whose headers toggle the corresponding backend sort modes. */
const SORTABLE_COLUMNS = {
  name: { asc: 'NAME_ASC', desc: 'NAME_DESC' },
  price: { asc: 'PRICE_ASC', desc: 'PRICE_DESC' },
  created: { asc: 'CREATED_ASC', desc: 'CREATED_DESC' },
} as const satisfies Record<string, { asc: AdminProductSort; desc: AdminProductSort }>;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

type BulkAction = 'publish' | 'unpublish' | 'archive';

type Filters = {
  q: string;
  status: ProductStatus | '';
  stock: AdminStockFilter | '';
  brandId: string;
  categoryId: string;
  sort: AdminProductSort;
};

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

const DEFAULT_FILTERS: Filters = {
  q: '',
  status: '',
  stock: '',
  brandId: '',
  categoryId: '',
  sort: 'UPDATED_DESC',
};

export default function AdminProductsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  // Pagination and selection are keyed to the filters that produced them, so a
  // filter change automatically restarts paging and clears the selection.
  const [pagination, setPagination] = useState<{
    key: string;
    cursor?: string;
    priorRows: AdminProductSummary[];
  }>({ key: '', priorRows: [] });
  const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> }>({
    key: '',
    ids: new Set(),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const filterKey = JSON.stringify(filters);
  const cursor = pagination.key === filterKey ? pagination.cursor : undefined;
  const priorRows = pagination.key === filterKey ? pagination.priorRows : [];
  const selected = selection.key === filterKey ? selection.ids : EMPTY_SELECTION;

  // Debounced search keeps typing responsive without spamming the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.q === searchDraft.trim() ? prev : { ...prev, q: searchDraft.trim() },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const queryParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.stock ? { stock: filters.stock } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      sort: filters.sort,
      ...(cursor ? { cursor } : {}),
    }),
    [filters, cursor],
  );

  const products = useAdminProducts(queryParams);
  const stats = useAdminProductStats();
  const brands = useAdminBrands();
  const categories = useAdminCategories();

  const bulkMutation = useAdminMutation(
    async ({ action, ids }: { action: BulkAction; ids: string[] }) => {
      const run =
        action === 'publish'
          ? adminApi.publishProduct
          : action === 'unpublish'
            ? adminApi.unpublishProduct
            : adminApi.archiveProduct;
      const results = await Promise.allSettled(ids.map((id) => run(id)));
      return {
        done: results.filter((result) => result.status === 'fulfilled').length,
        failed: results.filter((result) => result.status === 'rejected').length,
        firstError: results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        )?.reason as unknown,
      };
    },
    [adminKeys.productsRoot(), adminKeys.productRoot(), adminKeys.productStats()],
  );

  const pageRows = products.data?.data ?? [];
  const rows = cursor ? [...priorRows, ...pageRows] : pageRows;
  const nextCursor = products.data?.meta.nextCursor ?? null;
  const filtersActive =
    Boolean(
      filters.q || filters.status || filters.stock || filters.brandId || filters.categoryId,
    ) || filters.sort !== 'UPDATED_DESC';

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function patchFilters(patch: Partial<Filters>) {
    setNotice(null);
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function resetFilters() {
    setSearchDraft('');
    setNotice(null);
    setFilters(DEFAULT_FILTERS);
  }

  function setSelected(ids: ReadonlySet<string>) {
    setSelection({ key: filterKey, ids });
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  async function runBulk(action: BulkAction) {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      action === 'archive' &&
      !window.confirm(
        `Archive ${ids.length} product${ids.length > 1 ? 's' : ''}? They will be removed from the storefront.`,
      )
    ) {
      return;
    }
    setNotice(null);
    try {
      const result = await bulkMutation.mutateAsync({ action, ids });
      const verb =
        action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'archived';
      if (result.failed === 0) {
        setNotice({
          tone: 'success',
          text: `${result.done} product${result.done > 1 ? 's' : ''} ${verb}.`,
        });
      } else {
        setNotice({
          tone: 'error',
          text: `${result.done} ${verb}, ${result.failed} failed — ${mutationErrorMessage(result.firstError, 'check the products and retry.')}`,
        });
      }
      setSelected(new Set());
    } catch (error) {
      setNotice({ tone: 'error', text: mutationErrorMessage(error, 'Bulk action failed.') });
    }
  }

  function loadMore() {
    if (!nextCursor) return;
    setPagination({ key: filterKey, cursor: nextCursor, priorRows: rows });
  }

  function toggleColumnSort(column: SortableColumn) {
    const { asc, desc } = SORTABLE_COLUMNS[column];
    patchFilters({ sort: filters.sort === desc ? asc : desc });
  }

  const statCards = [
    {
      label: 'Total products',
      value: stats.data?.total ?? 0,
      icon: Package,
      tone: 'gold' as const,
      active: !filters.status && !filters.stock,
      onClick: () => patchFilters({ status: '', stock: '' }),
    },
    {
      label: 'Active',
      value: stats.data?.active ?? 0,
      icon: PackageCheck,
      tone: 'emerald' as const,
      active: filters.status === 'ACTIVE',
      onClick: () => patchFilters({ status: 'ACTIVE', stock: '' }),
    },
    {
      label: 'Drafts',
      value: stats.data?.draft ?? 0,
      icon: FileEdit,
      tone: 'amber' as const,
      active: filters.status === 'DRAFT',
      onClick: () => patchFilters({ status: 'DRAFT', stock: '' }),
    },
    {
      label: 'Out of stock',
      value: stats.data?.outOfStock ?? 0,
      icon: PackageX,
      tone: 'rose' as const,
      active: filters.stock === 'OUT_OF_STOCK',
      onClick: () => patchFilters({ stock: 'OUT_OF_STOCK', status: '' }),
    },
    {
      label: 'Low stock',
      value: stats.data?.lowStock ?? 0,
      icon: AlertTriangle,
      tone: 'orange' as const,
      active: filters.stock === 'LOW_STOCK',
      onClick: () => patchFilters({ stock: 'LOW_STOCK', status: '' }),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="Search, curate, and publish the Elevate catalog."
        actions={
          <AdminButton onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" strokeWidth={2.2} />
            Add product
          </AdminButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <AdminStatCard key={card.label} {...card} loading={stats.isLoading} />
        ))}
      </div>
      {stats.isError ? <AdminError>Could not load catalog statistics.</AdminError> : null}

      {notice ? (
        notice.tone === 'error' ? (
          <AdminError>{notice.text}</AdminError>
        ) : (
          <p
            role="status"
            className="rounded-lg border border-[#C9A227]/40 bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#C9A227]"
          >
            {notice.text}
          </p>
        )
      ) : null}

      <AdminPanel
        title="Product list"
        description="Draft, active, and archived catalog products."
        actions={
          filtersActive ? (
            <AdminButton variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-3.5" strokeWidth={1.8} />
              Reset filters
            </AdminButton>
          ) : undefined
        }
      >
        <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(130px,1fr))]">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#555555]"
              strokeWidth={1.7}
            />
            <AdminInput
              type="search"
              aria-label="Search products"
              placeholder="Search name, SKU, brand…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="pl-9"
            />
          </div>
          <AdminSelect
            aria-label="Filter by category"
            value={filters.categoryId}
            onChange={(event) => patchFilters({ categoryId: event.target.value })}
            disabled={categories.isLoading}
          >
            <option value="">All categories</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by brand"
            value={filters.brandId}
            onChange={(event) => patchFilters({ brandId: event.target.value })}
            disabled={brands.isLoading}
          >
            <option value="">All brands</option>
            {brands.data?.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by status"
            value={filters.status}
            onChange={(event) => patchFilters({ status: event.target.value as Filters['status'] })}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by stock"
            value={filters.stock}
            onChange={(event) => patchFilters({ stock: event.target.value as Filters['stock'] })}
          >
            <option value="">All stock levels</option>
            <option value="IN_STOCK">In stock</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Sort products"
            value={filters.sort}
            onChange={(event) => patchFilters({ sort: event.target.value as AdminProductSort })}
            className="lg:col-start-5"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </div>

        {selected.size > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#C9A227]/35 bg-[#C9A227]/[0.06] px-3.5 py-2.5">
            <p className="mr-auto text-sm font-semibold text-[#C9A227]">{selected.size} selected</p>
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => void runBulk('publish')}
              disabled={bulkMutation.isPending}
            >
              <CloudUpload className="size-3.5" strokeWidth={1.8} />
              Publish
            </AdminButton>
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => void runBulk('unpublish')}
              disabled={bulkMutation.isPending}
            >
              <CloudOff className="size-3.5" strokeWidth={1.8} />
              Unpublish
            </AdminButton>
            <AdminButton
              size="sm"
              variant="danger"
              onClick={() => void runBulk('archive')}
              disabled={bulkMutation.isPending}
              loading={bulkMutation.isPending}
            >
              <Archive className="size-3.5" strokeWidth={1.8} />
              Archive
            </AdminButton>
            <AdminButton size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </AdminButton>
          </div>
        ) : null}

        {products.isError ? <AdminError>Could not load products.</AdminError> : null}
        {products.isLoading ? <AdminTableSkeleton /> : null}
        {!products.isLoading && rows.length === 0 && !products.isError ? (
          <AdminEmpty>
            {filtersActive ? (
              'No products match these filters.'
            ) : (
              <span className="flex flex-col items-center gap-3">
                No products yet — create the first one.
                <AdminButton size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" strokeWidth={2.2} />
                  Add product
                </AdminButton>
              </span>
            )}
          </AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all products on this page"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-[#C9A227]"
                    />
                  </AdminTh>
                  <SortableTh column="name" sort={filters.sort} onToggle={toggleColumnSort}>
                    Product
                  </SortableTh>
                  <AdminTh>SKU</AdminTh>
                  <AdminTh>Category</AdminTh>
                  <AdminTh>Brand</AdminTh>
                  <SortableTh column="price" sort={filters.sort} onToggle={toggleColumnSort}>
                    Price
                  </SortableTh>
                  <AdminTh>Stock</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <SortableTh column="created" sort={filters.sort} onToggle={toggleColumnSort}>
                    Created
                  </SortableTh>
                  <AdminTh>Updated</AdminTh>
                  <AdminTh className="text-right">Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    selected={selected.has(product.id)}
                    onToggle={() => toggleRow(product.id)}
                    onEdit={() => setEditingId(product.id)}
                  />
                ))}
              </tbody>
            </AdminTable>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#555555]">
                Showing {rows.length} product{rows.length === 1 ? '' : 's'}
                {products.isFetching ? ' · refreshing…' : ''}
              </p>
              {nextCursor ? (
                <AdminButton
                  variant="secondary"
                  onClick={loadMore}
                  disabled={products.isFetching}
                  loading={products.isFetching && Boolean(cursor)}
                >
                  Load more
                </AdminButton>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminPanel>

      <ProductCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(product, published) =>
          setNotice({
            tone: 'success',
            text: published
              ? `“${product.name}” is live on the storefront.`
              : `“${product.name}” saved as a draft.`,
          })
        }
      />
      <ProductEditModal productId={editingId} onClose={() => setEditingId(null)} />
    </div>
  );
}

function SortableTh({
  column,
  sort,
  onToggle,
  children,
}: {
  column: SortableColumn;
  sort: AdminProductSort;
  onToggle: (column: SortableColumn) => void;
  children: React.ReactNode;
}) {
  const { asc, desc } = SORTABLE_COLUMNS[column];
  const direction = sort === asc ? 'ascending' : sort === desc ? 'descending' : undefined;
  const Icon =
    direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowUpDown;
  return (
    <AdminTh aria-sort={direction} className="p-0">
      <button
        type="button"
        onClick={() => onToggle(column)}
        className={cn(
          'flex w-full items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-[.12em] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C9A227]',
          direction ? 'text-[#C9A227]' : 'text-[#555555]',
        )}
      >
        {children}
        <Icon className="size-3 shrink-0" strokeWidth={2} />
      </button>
    </AdminTh>
  );
}

function ProductRow({
  product,
  selected,
  onToggle,
  onEdit,
}: {
  product: AdminProductSummary;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const stock = product.totalStock ?? 0;
  return (
    <tr className={cn(selected && 'bg-[#C9A227]/[0.06]')}>
      <AdminTd>
        <input
          type="checkbox"
          aria-label={`Select ${product.name}`}
          checked={selected}
          onChange={onToggle}
          className="accent-[#C9A227]"
        />
      </AdminTd>
      <AdminTd>
        <div className="flex items-center gap-3">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-[#e4e3e1]">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-[#555555]">
                <ImageIcon className="size-4" strokeWidth={1.5} />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/products/${product.id}`}
              className="block truncate font-semibold text-[#111111] transition-colors hover:text-[#C9A227]"
            >
              {product.name}
            </Link>
            <p className="truncate text-xs text-[#555555]">/{product.slug}</p>
          </div>
        </div>
      </AdminTd>
      <AdminTd>
        <span className="font-mono text-xs text-[#555555]">{product.sku ?? '—'}</span>
        {product.variantCount > 1 ? (
          <p className="text-xs text-[#555555]">+{product.variantCount - 1} more</p>
        ) : null}
      </AdminTd>
      <AdminTd>{product.categoryName ?? '—'}</AdminTd>
      <AdminTd>{product.brandName}</AdminTd>
      <AdminTd className="font-semibold text-[#C9A227]">{formatTaka(product.priceTaka)}</AdminTd>
      <AdminTd>
        {stock <= 0 ? (
          <StatusPill>OUT</StatusPill>
        ) : (
          <span className="text-[#111111]">
            {stock}
            <span className="ml-1 text-xs text-[#555555]">units</span>
          </span>
        )}
      </AdminTd>
      <AdminTd>
        <StatusPill>{product.status}</StatusPill>
      </AdminTd>
      <AdminTd className="whitespace-nowrap text-[#555555]">
        {new Date(product.createdAt).toLocaleDateString()}
      </AdminTd>
      <AdminTd className="whitespace-nowrap text-[#555555]">
        {new Date(product.updatedAt).toLocaleDateString()}
      </AdminTd>
      <AdminTd>
        <div className="flex justify-end gap-1">
          <Link
            href={`/admin/products/${product.id}`}
            aria-label={`View ${product.name}`}
            title="View details"
            className={adminIconActionClass()}
          >
            <Eye className="size-4" strokeWidth={1.7} />
          </Link>
          <AdminIconButton
            tone="gold"
            onClick={onEdit}
            aria-label={`Edit ${product.name}`}
            title="Edit product"
          >
            <Pencil className="size-4" strokeWidth={1.7} />
          </AdminIconButton>
        </div>
      </AdminTd>
    </tr>
  );
}
