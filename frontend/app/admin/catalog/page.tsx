'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CircleCheck,
  CirclePause,
  CloudOff,
  CloudUpload,
  Eye,
  FolderTree,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
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
} from '@/components/admin/admin-ui';
import { TaxonomyDetailsModal } from '@/features/admin/components/taxonomy-details-modal';
import { TaxonomyFormModal } from '@/features/admin/components/taxonomy-form-modal';
import { mutationErrorMessage } from '@/features/admin/mutation-error';
import {
  TAXONOMY_TYPE_LABELS,
  buildTaxonomyRows,
  taxonomyRowKey,
  type TaxonomyRow,
  type TaxonomyStatus,
  type TaxonomyType,
} from '@/features/admin/taxonomy-schema';
import {
  adminApi,
  adminKeys,
  useAdminBrands,
  useAdminCategories,
  useAdminCollections,
  useAdminMutation,
} from '@/features/admin';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const TAXONOMY_INVALIDATE = [adminKeys.brands(), adminKeys.categories(), adminKeys.collections()];

type TaxonomySort =
  'UPDATED_DESC' | 'CREATED_DESC' | 'CREATED_ASC' | 'NAME_ASC' | 'NAME_DESC' | 'PRODUCTS_DESC';

const SORT_OPTIONS: Array<{ value: TaxonomySort; label: string }> = [
  { value: 'UPDATED_DESC', label: 'Recently updated' },
  { value: 'CREATED_DESC', label: 'Newest first' },
  { value: 'CREATED_ASC', label: 'Oldest first' },
  { value: 'NAME_ASC', label: 'Name A–Z' },
  { value: 'NAME_DESC', label: 'Name Z–A' },
  { value: 'PRODUCTS_DESC', label: 'Most products' },
];

const SORT_COMPARATORS: Record<TaxonomySort, (a: TaxonomyRow, b: TaxonomyRow) => number> = {
  UPDATED_DESC: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  CREATED_DESC: (a, b) => b.createdAt.localeCompare(a.createdAt),
  CREATED_ASC: (a, b) => a.createdAt.localeCompare(b.createdAt),
  NAME_ASC: (a, b) => a.name.localeCompare(b.name),
  NAME_DESC: (a, b) => b.name.localeCompare(a.name),
  PRODUCTS_DESC: (a, b) => b.productCount - a.productCount,
};

type Filters = {
  q: string;
  type: TaxonomyType | '';
  status: TaxonomyStatus | '';
  parentId: string;
  sort: TaxonomySort;
};

const DEFAULT_FILTERS: Filters = {
  q: '',
  type: '',
  status: '',
  parentId: '',
  sort: 'UPDATED_DESC',
};

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

export default function AdminTaxonomyPage() {
  const brands = useAdminBrands();
  const categories = useAdminCategories();
  const collections = useAdminCollections();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  // Visible-row count and selection are keyed to the filters that produced
  // them, so a filter change automatically restarts paging and clears both.
  const [visible, setVisible] = useState<{ key: string; count: number }>({
    key: '',
    count: PAGE_SIZE,
  });
  const [selection, setSelection] = useState<{ key: string; ids: ReadonlySet<string> }>({
    key: '',
    ids: new Set(),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [viewing, setViewing] = useState<TaxonomyRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TaxonomyRow[] | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const filterKey = JSON.stringify(filters);
  const visibleCount = visible.key === filterKey ? visible.count : PAGE_SIZE;
  const selected = selection.key === filterKey ? selection.ids : EMPTY_SELECTION;

  // Debounced search keeps typing responsive without re-filtering on each key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) =>
        prev.q === searchDraft.trim() ? prev : { ...prev, q: searchDraft.trim() },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const allRows = useMemo(
    () => buildTaxonomyRows(brands.data ?? [], categories.data ?? [], collections.data ?? []),
    [brands.data, categories.data, collections.data],
  );

  const filteredRows = useMemo(() => {
    const query = filters.q.toLowerCase();
    return allRows
      .filter((row) => {
        if (filters.type && row.type !== filters.type) return false;
        if (filters.status && (row.isActive ? 'ACTIVE' : 'INACTIVE') !== filters.status) {
          return false;
        }
        if (filters.parentId && row.parentId !== filters.parentId) return false;
        if (
          query &&
          !row.name.toLowerCase().includes(query) &&
          !row.slug.toLowerCase().includes(query) &&
          !(row.parentName?.toLowerCase().includes(query) ?? false)
        ) {
          return false;
        }
        return true;
      })
      .sort(SORT_COMPARATORS[filters.sort]);
  }, [allRows, filters]);

  const rows = filteredRows.slice(0, visibleCount);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(taxonomyRowKey(row)));
  const filtersActive =
    Boolean(filters.q || filters.type || filters.status || filters.parentId) ||
    filters.sort !== 'UPDATED_DESC';

  const isLoading = brands.isLoading || categories.isLoading || collections.isLoading;
  const isError = brands.isError || categories.isError || collections.isError;

  const deleteMutation = useAdminMutation(async (targets: TaxonomyRow[]) => {
    const remove = (row: TaxonomyRow) =>
      row.type === 'BRAND'
        ? adminApi.deleteBrand(row.id)
        : row.type === 'CATEGORY'
          ? adminApi.deleteCategory(row.id)
          : adminApi.deleteCollection(row.id);
    const results = await Promise.allSettled(targets.map(remove));
    return {
      done: results.filter((result) => result.status === 'fulfilled').length,
      failed: results.filter((result) => result.status === 'rejected').length,
      firstError: results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      )?.reason as unknown,
    };
  }, TAXONOMY_INVALIDATE);

  const statusMutation = useAdminMutation(
    async ({ targets, isActive }: { targets: TaxonomyRow[]; isActive: boolean }) => {
      const update = (row: TaxonomyRow) =>
        row.type === 'BRAND'
          ? adminApi.updateBrand(row.id, { isActive })
          : row.type === 'CATEGORY'
            ? adminApi.updateCategory(row.id, { isActive })
            : adminApi.updateCollection(row.id, { isActive });
      const results = await Promise.allSettled(targets.map(update));
      return {
        done: results.filter((result) => result.status === 'fulfilled').length,
        failed: results.filter((result) => result.status === 'rejected').length,
        firstError: results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        )?.reason as unknown,
      };
    },
    TAXONOMY_INVALIDATE,
  );

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

  function toggleRow(row: TaxonomyRow) {
    const key = taxonomyRowKey(row);
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => taxonomyRowKey(row))));
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: TaxonomyRow) {
    setViewing(null);
    setEditing(row);
    setFormOpen(true);
  }

  async function runBulkStatus(isActive: boolean) {
    const targets = rows.filter((row) => selected.has(taxonomyRowKey(row)));
    if (targets.length === 0) return;
    setNotice(null);
    try {
      const result = await statusMutation.mutateAsync({ targets, isActive });
      const verb = isActive ? 'activated' : 'deactivated';
      setNotice(
        result.failed === 0
          ? {
              tone: 'success',
              text: `${result.done} item${result.done === 1 ? '' : 's'} ${verb}.`,
            }
          : {
              tone: 'error',
              text: `${result.done} ${verb}, ${result.failed} failed — ${mutationErrorMessage(result.firstError, 'check the items and retry.')}`,
            },
      );
      setSelected(new Set());
    } catch (error) {
      setNotice({
        tone: 'error',
        text: mutationErrorMessage(error, 'Bulk status update failed.'),
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || pendingDelete.length === 0) return;
    setNotice(null);
    try {
      const result = await deleteMutation.mutateAsync(pendingDelete);
      if (result.failed === 0) {
        setNotice({
          tone: 'success',
          text:
            pendingDelete.length === 1
              ? `“${pendingDelete[0].name}” deleted.`
              : `${result.done} items deleted.`,
        });
      } else {
        setNotice({
          tone: 'error',
          text: `${result.done} deleted, ${result.failed} failed — ${mutationErrorMessage(result.firstError, 'check the items and retry.')}`,
        });
      }
      setSelected(new Set());
    } catch (error) {
      setNotice({ tone: 'error', text: mutationErrorMessage(error, 'Delete failed.') });
    } finally {
      setPendingDelete(null);
    }
  }

  const statCards = [
    {
      label: 'Total items',
      value: allRows.length,
      icon: Layers,
      tone: 'gold' as const,
      loading: isLoading,
      active: !filters.type && !filters.status,
      onClick: () => patchFilters({ type: '', status: '', parentId: '' }),
    },
    {
      label: 'Brands',
      value: brands.data?.length ?? 0,
      icon: Award,
      tone: 'sky' as const,
      loading: brands.isLoading,
      active: filters.type === 'BRAND',
      onClick: () => patchFilters({ type: 'BRAND', parentId: '' }),
    },
    {
      label: 'Categories',
      value: categories.data?.length ?? 0,
      icon: FolderTree,
      tone: 'emerald' as const,
      loading: categories.isLoading,
      active: filters.type === 'CATEGORY',
      onClick: () => patchFilters({ type: 'CATEGORY' }),
    },
    {
      label: 'Active',
      value: allRows.filter((row) => row.isActive).length,
      icon: CircleCheck,
      tone: 'emerald' as const,
      loading: isLoading,
      active: filters.status === 'ACTIVE',
      onClick: () => patchFilters({ status: 'ACTIVE' }),
    },
    {
      label: 'Inactive',
      value: allRows.filter((row) => !row.isActive).length,
      icon: CirclePause,
      tone: 'amber' as const,
      loading: isLoading,
      active: filters.status === 'INACTIVE',
      onClick: () => patchFilters({ status: 'INACTIVE' }),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Taxonomy"
        description="Brands, categories, and collections that organize the catalog."
        actions={
          <AdminButton onClick={openCreate}>
            <Plus className="size-3.5" strokeWidth={2.2} />
            Add taxonomy
          </AdminButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <AdminStatCard key={card.label} {...card} />
        ))}
      </div>

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
        title="Taxonomy list"
        description="Search, filter, and manage every brand, category, and collection."
        actions={
          filtersActive ? (
            <AdminButton variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-3.5" strokeWidth={1.8} />
              Reset filters
            </AdminButton>
          ) : undefined
        }
      >
        <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(140px,1fr))]">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#555555]"
              strokeWidth={1.7}
            />
            <AdminInput
              type="search"
              aria-label="Search taxonomy"
              placeholder="Search name, slug, parent…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="pl-9"
            />
          </div>
          <AdminSelect
            aria-label="Filter by type"
            value={filters.type}
            onChange={(event) =>
              patchFilters({ type: event.target.value as Filters['type'], parentId: '' })
            }
          >
            <option value="">All types</option>
            <option value="BRAND">Brands</option>
            <option value="CATEGORY">Categories</option>
            <option value="COLLECTION">Collections</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by status"
            value={filters.status}
            onChange={(event) => patchFilters({ status: event.target.value as Filters['status'] })}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </AdminSelect>
          <AdminSelect
            aria-label="Filter by parent category"
            value={filters.parentId}
            onChange={(event) => patchFilters({ parentId: event.target.value })}
            disabled={
              categories.isLoading || filters.type === 'BRAND' || filters.type === 'COLLECTION'
            }
          >
            <option value="">All parents</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                Children of {category.name}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            aria-label="Sort taxonomy"
            value={filters.sort}
            onChange={(event) => patchFilters({ sort: event.target.value as TaxonomySort })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </div>

        {selected.size > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#C9A227]/35 bg-[#C9A227]/6 px-3.5 py-2.5">
            <p className="mr-auto text-sm font-semibold text-[#C9A227]">{selected.size} selected</p>
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => void runBulkStatus(true)}
              disabled={statusMutation.isPending || deleteMutation.isPending}
            >
              <CloudUpload className="size-3.5" strokeWidth={1.8} />
              Activate
            </AdminButton>
            <AdminButton
              size="sm"
              variant="secondary"
              onClick={() => void runBulkStatus(false)}
              disabled={statusMutation.isPending || deleteMutation.isPending}
            >
              <CloudOff className="size-3.5" strokeWidth={1.8} />
              Deactivate
            </AdminButton>
            <AdminButton
              size="sm"
              variant="danger"
              onClick={() =>
                setPendingDelete(rows.filter((row) => selected.has(taxonomyRowKey(row))))
              }
              disabled={deleteMutation.isPending || statusMutation.isPending}
            >
              <Trash2 className="size-3.5" strokeWidth={1.8} />
              Delete
            </AdminButton>
            <AdminButton size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </AdminButton>
          </div>
        ) : null}

        {isError ? <AdminError>Could not load taxonomy.</AdminError> : null}
        {isLoading ? <AdminTableSkeleton /> : null}
        {!isLoading && !isError && rows.length === 0 ? (
          <AdminEmpty>
            {filtersActive ? (
              'No taxonomy items match these filters.'
            ) : (
              <span className="flex flex-col items-center gap-3">
                No taxonomy yet — create the first brand, category, or collection.
                <AdminButton size="sm" onClick={openCreate}>
                  <Plus className="size-3.5" strokeWidth={2.2} />
                  Add taxonomy
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
                      aria-label="Select all items on this page"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-[#C9A227]"
                    />
                  </AdminTh>
                  <AdminTh>Name</AdminTh>
                  <AdminTh>Type</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh>Slug</AdminTh>
                  <AdminTh>Parent</AdminTh>
                  <AdminTh>Products</AdminTh>
                  <AdminTh>Created</AdminTh>
                  <AdminTh>Updated</AdminTh>
                  <AdminTh className="text-right">Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <TaxonomyTableRow
                    key={taxonomyRowKey(row)}
                    row={row}
                    selected={selected.has(taxonomyRowKey(row))}
                    onToggle={() => toggleRow(row)}
                    onView={() => setViewing(row)}
                    onEdit={() => openEdit(row)}
                    onDelete={() => setPendingDelete([row])}
                  />
                ))}
              </tbody>
            </AdminTable>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#555555]">
                Showing {rows.length} of {filteredRows.length} item
                {filteredRows.length === 1 ? '' : 's'}
              </p>
              {filteredRows.length > visibleCount ? (
                <AdminButton
                  variant="secondary"
                  onClick={() => setVisible({ key: filterKey, count: visibleCount + PAGE_SIZE })}
                >
                  Load more
                </AdminButton>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminPanel>

      <TaxonomyFormModal
        open={formOpen}
        item={editing}
        categories={categories.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={(text) => setNotice({ tone: 'success', text })}
      />
      <TaxonomyDetailsModal item={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete && pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} items`
            : `Delete ${TAXONOMY_TYPE_LABELS[pendingDelete?.[0]?.type ?? 'BRAND'].toLowerCase()}`
        }
        message={
          pendingDelete && pendingDelete.length > 1 ? (
            <>
              Delete{' '}
              <strong className="text-[#111111]">{pendingDelete.length} taxonomy items</strong>?
              They will be removed from the storefront. This cannot be undone.
            </>
          ) : (
            <>
              Delete <strong className="text-[#111111]">“{pendingDelete?.[0]?.name}”</strong>? It
              will be removed from the storefront. This cannot be undone.
            </>
          )
        }
        loading={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function TaxonomyTableRow({
  row,
  selected,
  onToggle,
  onView,
  onEdit,
  onDelete,
}: {
  row: TaxonomyRow;
  selected: boolean;
  onToggle: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className={cn(selected && 'bg-[#C9A227]/6')}>
      <AdminTd>
        <input
          type="checkbox"
          aria-label={`Select ${row.name}`}
          checked={selected}
          onChange={onToggle}
          className="accent-[#C9A227]"
        />
      </AdminTd>
      <AdminTd>
        <button
          type="button"
          onClick={onView}
          className="block max-w-56 truncate text-left font-semibold text-[#111111] transition-colors hover:text-[#C9A227] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
        >
          {row.name}
        </button>
      </AdminTd>
      <AdminTd>
        <StatusPill>{TAXONOMY_TYPE_LABELS[row.type]}</StatusPill>
      </AdminTd>
      <AdminTd>
        <StatusPill>{row.isActive ? 'Active' : 'Inactive'}</StatusPill>
      </AdminTd>
      <AdminTd>
        <span className="font-mono text-xs text-[#555555]">/{row.slug}</span>
      </AdminTd>
      <AdminTd>{row.parentName ?? '—'}</AdminTd>
      <AdminTd>
        {row.productCount > 0 ? (
          <span className="text-[#111111]">
            {row.productCount}
            <span className="ml-1 text-xs text-[#555555]">
              product{row.productCount === 1 ? '' : 's'}
            </span>
          </span>
        ) : (
          <span className="text-[#555555]">—</span>
        )}
      </AdminTd>
      <AdminTd className="whitespace-nowrap text-[#555555]">
        {new Date(row.createdAt).toLocaleDateString()}
      </AdminTd>
      <AdminTd className="whitespace-nowrap text-[#555555]">
        {new Date(row.updatedAt).toLocaleDateString()}
      </AdminTd>
      <AdminTd>
        <div className="flex justify-end gap-1">
          <AdminIconButton onClick={onView} aria-label={`View ${row.name}`} title="View details">
            <Eye className="size-4" strokeWidth={1.7} />
          </AdminIconButton>
          <AdminIconButton
            tone="gold"
            onClick={onEdit}
            aria-label={`Edit ${row.name}`}
            title="Edit"
          >
            <Pencil className="size-4" strokeWidth={1.7} />
          </AdminIconButton>
          <AdminIconButton
            tone="danger"
            onClick={onDelete}
            aria-label={`Delete ${row.name}`}
            title="Delete"
          >
            <Trash2 className="size-4" strokeWidth={1.7} />
          </AdminIconButton>
        </div>
      </AdminTd>
    </tr>
  );
}
