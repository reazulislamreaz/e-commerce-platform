'use client';

import axios from 'axios';
import { useState, type FormEvent } from 'react';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  useAdminBrands,
  useAdminCategories,
  useAdminCollections,
  useAdminMutation,
  type AdminBrand,
  type AdminCategory,
  type AdminCollection,
} from '@/features/admin';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type TaxonomyKind = 'brand' | 'category' | 'collection';

type EditState = {
  kind: TaxonomyKind;
  id: string;
  name: string;
  slug: string;
  parentId: string;
};

export default function AdminCatalogPage() {
  const brandsQuery = useAdminBrands();
  const categoriesQuery = useAdminCategories();
  const collectionsQuery = useAdminCollections();

  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const [brandName, setBrandName] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [collectionSlug, setCollectionSlug] = useState('');

  const createBrandMutation = useAdminMutation(adminApi.createBrand);
  const updateBrandMutation = useAdminMutation(
    (args: { id: string; name: string; slug?: string }) =>
      adminApi.updateBrand(args.id, { name: args.name, ...(args.slug ? { slug: args.slug } : {}) }),
  );
  const deleteBrandMutation = useAdminMutation((id: string) => adminApi.deleteBrand(id));

  const createCategoryMutation = useAdminMutation(adminApi.createCategory);
  const updateCategoryMutation = useAdminMutation(
    (args: { id: string; name: string; slug?: string; parentId?: string | null }) =>
      adminApi.updateCategory(args.id, {
        name: args.name,
        ...(args.slug ? { slug: args.slug } : {}),
        parentId: args.parentId || null,
      }),
  );
  const deleteCategoryMutation = useAdminMutation((id: string) => adminApi.deleteCategory(id));

  const createCollectionMutation = useAdminMutation(adminApi.createCollection);
  const updateCollectionMutation = useAdminMutation(
    (args: { id: string; name: string; slug?: string }) =>
      adminApi.updateCollection(args.id, {
        name: args.name,
        ...(args.slug ? { slug: args.slug } : {}),
      }),
  );
  const deleteCollectionMutation = useAdminMutation((id: string) => adminApi.deleteCollection(id));

  const busy =
    createBrandMutation.isPending ||
    updateBrandMutation.isPending ||
    deleteBrandMutation.isPending ||
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    deleteCategoryMutation.isPending ||
    createCollectionMutation.isPending ||
    updateCollectionMutation.isPending ||
    deleteCollectionMutation.isPending;

  const brands = brandsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];

  function resetMessages() {
    setActionError(null);
    setSuccess(null);
  }

  function startEdit(kind: TaxonomyKind, item: AdminBrand | AdminCategory | AdminCollection) {
    resetMessages();
    setEdit({
      kind,
      id: item.id,
      name: item.name,
      slug: item.slug,
      parentId: 'parentId' in item ? (item.parentId ?? '') : '',
    });
  }

  async function onCreateBrand(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    if (!brandName.trim()) {
      setActionError('Brand name is required.');
      return;
    }
    try {
      await createBrandMutation.mutateAsync({
        name: brandName.trim(),
        ...(brandSlug.trim() ? { slug: brandSlug.trim() } : {}),
      });
      setSuccess(`Brand "${brandName.trim()}" created.`);
      setBrandName('');
      setBrandSlug('');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not create brand.'));
    }
  }

  async function onCreateCategory(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    if (!categoryName.trim()) {
      setActionError('Category name is required.');
      return;
    }
    try {
      await createCategoryMutation.mutateAsync({
        name: categoryName.trim(),
        ...(categorySlug.trim() ? { slug: categorySlug.trim() } : {}),
        ...(categoryParentId ? { parentId: categoryParentId } : {}),
      });
      setSuccess(`Category "${categoryName.trim()}" created.`);
      setCategoryName('');
      setCategorySlug('');
      setCategoryParentId('');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not create category.'));
    }
  }

  async function onCreateCollection(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    if (!collectionName.trim()) {
      setActionError('Collection name is required.');
      return;
    }
    try {
      await createCollectionMutation.mutateAsync({
        name: collectionName.trim(),
        ...(collectionSlug.trim() ? { slug: collectionSlug.trim() } : {}),
      });
      setSuccess(`Collection "${collectionName.trim()}" created.`);
      setCollectionName('');
      setCollectionSlug('');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not create collection.'));
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!edit) return;
    resetMessages();
    if (!edit.name.trim()) {
      setActionError('Name is required.');
      return;
    }
    try {
      if (edit.kind === 'brand') {
        await updateBrandMutation.mutateAsync({
          id: edit.id,
          name: edit.name.trim(),
          slug: edit.slug.trim() || undefined,
        });
      } else if (edit.kind === 'category') {
        await updateCategoryMutation.mutateAsync({
          id: edit.id,
          name: edit.name.trim(),
          slug: edit.slug.trim() || undefined,
          parentId: edit.parentId || null,
        });
      } else {
        await updateCollectionMutation.mutateAsync({
          id: edit.id,
          name: edit.name.trim(),
          slug: edit.slug.trim() || undefined,
        });
      }
      setSuccess(`${edit.name.trim()} updated.`);
      setEdit(null);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not save changes.'));
    }
  }

  async function onDelete(kind: TaxonomyKind, id: string, label: string) {
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    resetMessages();
    try {
      if (kind === 'brand') await deleteBrandMutation.mutateAsync(id);
      else if (kind === 'category') await deleteCategoryMutation.mutateAsync(id);
      else await deleteCollectionMutation.mutateAsync(id);
      setSuccess(`"${label}" deleted.`);
      if (edit?.id === id) setEdit(null);
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not delete item.'));
    }
  }

  function parentLabel(parentId?: string | null): string {
    if (!parentId) return '—';
    return categories.find((category) => category.id === parentId)?.name ?? parentId;
  }

  return (
    <div className="space-y-5">
      {actionError ? <AdminError>{actionError}</AdminError> : null}
      {success ? (
        <p className="rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
          {success}
        </p>
      ) : null}

      {edit ? (
        <AdminPanel
          title={`Edit ${edit.kind}`}
          description="Update taxonomy fields and save."
          actions={
            <AdminButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setEdit(null)}
            >
              Cancel
            </AdminButton>
          }
        >
          <form onSubmit={(event) => void onSaveEdit(event)} className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
                Name
              </span>
              <AdminInput
                value={edit.name}
                onChange={(event) => setEdit({ ...edit, name: event.target.value })}
                disabled={busy}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
                Slug
              </span>
              <AdminInput
                value={edit.slug}
                onChange={(event) => setEdit({ ...edit, slug: event.target.value })}
                disabled={busy}
              />
            </label>
            {edit.kind === 'category' ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
                  Parent category
                </span>
                <AdminSelect
                  value={edit.parentId}
                  onChange={(event) => setEdit({ ...edit, parentId: event.target.value })}
                  disabled={busy}
                >
                  <option value="">None (top level)</option>
                  {categories
                    .filter((category) => category.id !== edit.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </AdminSelect>
              </label>
            ) : null}
            <div className="sm:col-span-2">
              <AdminButton type="submit" disabled={busy}>
                {updateBrandMutation.isPending ||
                updateCategoryMutation.isPending ||
                updateCollectionMutation.isPending
                  ? 'Saving…'
                  : 'Save changes'}
              </AdminButton>
            </div>
          </form>
        </AdminPanel>
      ) : null}

      <AdminPanel title="Brands" description="Product manufacturers and labels.">
        {brandsQuery.isError ? <AdminError>Could not load brands.</AdminError> : null}
        {brandsQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading brands…</p>
        ) : null}
        {!brandsQuery.isLoading && !brandsQuery.isError && brands.length === 0 ? (
          <AdminEmpty>No brands yet.</AdminEmpty>
        ) : null}
        {brands.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Name</AdminTh>
                <AdminTh>Slug</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <AdminTd>
                    <span className="font-semibold text-white">{brand.name}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#b5b0a8]">{brand.slug}</span>
                  </AdminTd>
                  <AdminTd className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => startEdit('brand', brand)}
                      >
                        Edit
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="danger"
                        disabled={busy}
                        onClick={() => void onDelete('brand', brand.id, brand.name)}
                      >
                        Delete
                      </AdminButton>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
        <form
          onSubmit={(event) => void onCreateBrand(event)}
          className="mt-5 grid gap-3 border-t border-[#2d2a27] pt-5 sm:grid-cols-2"
        >
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              New brand name
            </span>
            <AdminInput
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Slug (optional)
            </span>
            <AdminInput
              value={brandSlug}
              onChange={(event) => setBrandSlug(event.target.value)}
              disabled={busy}
            />
          </label>
          <div className="sm:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {createBrandMutation.isPending ? 'Creating…' : 'Add brand'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Categories" description="Hierarchical product taxonomy.">
        {categoriesQuery.isError ? <AdminError>Could not load categories.</AdminError> : null}
        {categoriesQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading categories…</p>
        ) : null}
        {!categoriesQuery.isLoading && !categoriesQuery.isError && categories.length === 0 ? (
          <AdminEmpty>No categories yet.</AdminEmpty>
        ) : null}
        {categories.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Name</AdminTh>
                <AdminTh>Slug</AdminTh>
                <AdminTh>Parent</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <AdminTd>
                    <span className="font-semibold text-white">{category.name}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#b5b0a8]">{category.slug}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#b5b0a8]">{parentLabel(category.parentId)}</span>
                  </AdminTd>
                  <AdminTd className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => startEdit('category', category)}
                      >
                        Edit
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="danger"
                        disabled={busy}
                        onClick={() => void onDelete('category', category.id, category.name)}
                      >
                        Delete
                      </AdminButton>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
        <form
          onSubmit={(event) => void onCreateCategory(event)}
          className="mt-5 grid gap-3 border-t border-[#2d2a27] pt-5 sm:grid-cols-2"
        >
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              New category name
            </span>
            <AdminInput
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Slug (optional)
            </span>
            <AdminInput
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Parent (optional)
            </span>
            <AdminSelect
              value={categoryParentId}
              onChange={(event) => setCategoryParentId(event.target.value)}
              disabled={busy}
            >
              <option value="">None (top level)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </AdminSelect>
          </label>
          <div className="sm:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {createCategoryMutation.isPending ? 'Creating…' : 'Add category'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Collections" description="Curated groupings for merchandising.">
        {collectionsQuery.isError ? <AdminError>Could not load collections.</AdminError> : null}
        {collectionsQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading collections…</p>
        ) : null}
        {!collectionsQuery.isLoading && !collectionsQuery.isError && collections.length === 0 ? (
          <AdminEmpty>No collections yet.</AdminEmpty>
        ) : null}
        {collections.length > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Name</AdminTh>
                <AdminTh>Slug</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <AdminTd>
                    <span className="font-semibold text-white">{collection.name}</span>
                  </AdminTd>
                  <AdminTd>
                    <span className="text-[#b5b0a8]">{collection.slug}</span>
                  </AdminTd>
                  <AdminTd className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <AdminButton
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => startEdit('collection', collection)}
                      >
                        Edit
                      </AdminButton>
                      <AdminButton
                        type="button"
                        variant="danger"
                        disabled={busy}
                        onClick={() => void onDelete('collection', collection.id, collection.name)}
                      >
                        Delete
                      </AdminButton>
                    </div>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
        <form
          onSubmit={(event) => void onCreateCollection(event)}
          className="mt-5 grid gap-3 border-t border-[#2d2a27] pt-5 sm:grid-cols-2"
        >
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              New collection name
            </span>
            <AdminInput
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Slug (optional)
            </span>
            <AdminInput
              value={collectionSlug}
              onChange={(event) => setCollectionSlug(event.target.value)}
              disabled={busy}
            />
          </label>
          <div className="sm:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {createCollectionMutation.isPending ? 'Creating…' : 'Add collection'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}
