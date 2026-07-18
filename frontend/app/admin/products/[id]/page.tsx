'use client';

import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTextarea,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  useAdminBrands,
  useAdminCategories,
  useAdminMutation,
  useAdminProduct,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  brandId: z.string().uuid(),
  description: z.string().trim().min(10).max(5000),
  primaryColor: z.string().trim().min(1).max(80),
  categoryId: z.string().uuid(),
  isNew: z.boolean(),
  featuredPosition: z.number().int().min(0),
});

const priceSchema = z.object({
  amountTaka: z.number().min(0),
  compareAtTaka: z.union([z.literal(''), z.number().min(0)]),
});

type UpdateValues = z.infer<typeof updateSchema>;
type PriceValues = z.infer<typeof priceSchema>;

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const product = useAdminProduct(id);
  const brands = useAdminBrands();
  const categories = useAdminCategories();

  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateProduct = useAdminMutation((values: UpdateValues) =>
    adminApi.updateProduct(id, {
      name: values.name,
      brandId: values.brandId,
      description: values.description,
      primaryColor: values.primaryColor,
      categoryIds: [values.categoryId],
      isNew: values.isNew,
      featuredPosition: values.featuredPosition,
    }),
  );
  const lifecycle = useAdminMutation((action: 'publish' | 'unpublish' | 'archive') =>
    action === 'publish'
      ? adminApi.publishProduct(id)
      : action === 'unpublish'
        ? adminApi.unpublishProduct(id)
        : adminApi.archiveProduct(id),
  );
  const addPrice = useAdminMutation((values: PriceValues) =>
    adminApi.addProductPrice(id, {
      amountTaka: values.amountTaka,
      ...(values.compareAtTaka === '' ? {} : { compareAtTaka: values.compareAtTaka }),
    }),
  );

  const updateForm = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema) as Resolver<UpdateValues>,
    defaultValues: { featuredPosition: 0, isNew: false },
  });
  const priceForm = useForm<PriceValues>({
    resolver: zodResolver(priceSchema) as Resolver<PriceValues>,
    defaultValues: { amountTaka: 0, compareAtTaka: '' },
  });

  useEffect(() => {
    if (!product.data) return;
    updateForm.reset({
      name: product.data.name,
      brandId: brands.data?.find((brand) => brand.name === product.data.brandName)?.id ?? '',
      description: product.data.description,
      primaryColor: product.data.primaryColor,
      categoryId: product.data.categoryIds[0] ?? '',
      isNew: product.data.isNew,
      featuredPosition: product.data.featuredPosition,
    });
  }, [product.data, brands.data, updateForm]);

  const busy = updateProduct.isPending || lifecycle.isPending || addPrice.isPending;

  function resetMessages() {
    setActionError(null);
    setSuccess(null);
  }

  async function onSave(values: UpdateValues) {
    resetMessages();
    try {
      await updateProduct.mutateAsync(values);
      setSuccess('Product details saved.');
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not save product.'));
    }
  }

  async function onLifecycle(action: 'publish' | 'unpublish' | 'archive') {
    if (
      action === 'archive' &&
      !window.confirm('Archive this product? It will be removed from the storefront.')
    ) {
      return;
    }
    resetMessages();
    try {
      await lifecycle.mutateAsync(action);
      setSuccess(
        action === 'publish'
          ? 'Product published.'
          : action === 'unpublish'
            ? 'Product unpublished.'
            : 'Product archived.',
      );
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not update product status.'));
    }
  }

  async function onAddPrice(values: PriceValues) {
    resetMessages();
    try {
      await addPrice.mutateAsync(values);
      setSuccess('Price window added.');
      priceForm.reset({ amountTaka: 0, compareAtTaka: '' });
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not add price window.'));
    }
  }

  if (product.isLoading) {
    return <p className="py-8 text-center text-sm text-[#b5b0a8]">Loading product…</p>;
  }

  if (product.isError || !product.data) {
    return (
      <div className="space-y-3">
        <AdminError>Product not found or failed to load.</AdminError>
        <Link
          href="/admin/products"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78]"
        >
          Back to products
        </Link>
      </div>
    );
  }

  const item = product.data;
  const updateErrors = updateForm.formState.errors;
  const priceErrors = priceForm.formState.errors;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/products"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78] hover:text-[#eec98a]"
        >
          ← Products
        </Link>
        <StatusPill>{item.status}</StatusPill>
      </div>

      {actionError ? <AdminError>{actionError}</AdminError> : null}
      {success ? (
        <p className="rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
          {success}
        </p>
      ) : null}

      <AdminPanel
        title={item.name}
        description={`${item.brandName} · ${item.slug}`}
        actions={
          <>
            {item.status !== 'ACTIVE' ? (
              <AdminButton
                type="button"
                onClick={() => void onLifecycle('publish')}
                disabled={busy}
              >
                Publish
              </AdminButton>
            ) : (
              <AdminButton
                type="button"
                variant="secondary"
                onClick={() => void onLifecycle('unpublish')}
                disabled={busy}
              >
                Unpublish
              </AdminButton>
            )}
            {item.status !== 'ARCHIVED' ? (
              <AdminButton
                type="button"
                variant="danger"
                onClick={() => void onLifecycle('archive')}
                disabled={busy}
              >
                Archive
              </AdminButton>
            ) : null}
          </>
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[#8b867d]">Current price</dt>
            <dd className="font-semibold text-[#e3bb78]">{formatTaka(item.priceTaka)}</dd>
          </div>
          <div>
            <dt className="text-[#8b867d]">Variants</dt>
            <dd className="text-white">{item.variantCount}</dd>
          </div>
          <div>
            <dt className="text-[#8b867d]">Published</dt>
            <dd className="text-white">
              {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Not yet'}
            </dd>
          </div>
        </dl>
        {item.activePrice ? (
          <p className="mt-3 text-xs text-[#b5b0a8]">
            Active window since {new Date(item.activePrice.validFrom).toLocaleDateString()}
            {item.activePrice.compareAtTaka != null
              ? ` · Compare-at ${formatTaka(item.activePrice.compareAtTaka)}`
              : ''}
          </p>
        ) : null}
      </AdminPanel>

      <AdminPanel
        title="Merchandising fields"
        description="Update customer-facing product information."
      >
        <form
          onSubmit={updateForm.handleSubmit((values) => void onSave(values))}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Name" error={updateErrors.name?.message}>
            <AdminInput {...updateForm.register('name')} disabled={busy} />
          </Field>
          <Field label="Brand" error={updateErrors.brandId?.message}>
            <AdminSelect {...updateForm.register('brandId')} disabled={busy || brands.isLoading}>
              <option value="">Select brand</option>
              {brands.data?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </AdminSelect>
          </Field>
          <Field
            label="Description"
            error={updateErrors.description?.message}
            className="md:col-span-2"
          >
            <AdminTextarea rows={5} {...updateForm.register('description')} disabled={busy} />
          </Field>
          <Field label="Primary color" error={updateErrors.primaryColor?.message}>
            <AdminInput {...updateForm.register('primaryColor')} disabled={busy} />
          </Field>
          <Field label="Primary category" error={updateErrors.categoryId?.message}>
            <AdminSelect
              {...updateForm.register('categoryId')}
              disabled={busy || categories.isLoading}
            >
              <option value="">Select category</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </AdminSelect>
          </Field>
          <Field label="Featured position" error={updateErrors.featuredPosition?.message}>
            <AdminInput
              type="number"
              min="0"
              {...updateForm.register('featuredPosition', { valueAsNumber: true })}
              disabled={busy}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-white">
            <input
              type="checkbox"
              {...updateForm.register('isNew')}
              className="accent-[#e3bb78]"
              disabled={busy}
            />
            Show as new arrival
          </label>
          <div className="md:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {updateProduct.isPending ? 'Saving…' : 'Save changes'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel
        title="Price window"
        description="A new price closes the currently active window."
      >
        <form
          onSubmit={priceForm.handleSubmit((values) => void onAddPrice(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Amount (taka)" error={priceErrors.amountTaka?.message}>
            <AdminInput
              type="number"
              min="0"
              {...priceForm.register('amountTaka', { valueAsNumber: true })}
              disabled={busy}
            />
          </Field>
          <Field label="Compare-at (optional)" error={priceErrors.compareAtTaka?.message}>
            <AdminInput
              type="number"
              min="0"
              {...priceForm.register('compareAtTaka', {
                setValueAs: (value) => (value === '' || value == null ? '' : Number(value)),
              })}
              disabled={busy}
            />
          </Field>
          <div className="sm:col-span-2">
            <AdminButton type="submit" disabled={busy}>
              {addPrice.isPending ? 'Adding…' : 'Add price window'}
            </AdminButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="Variants and media">
        {item.variants.length === 0 ? (
          <AdminEmpty>No variants.</AdminEmpty>
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>SKU</AdminTh>
                <AdminTh>Size</AdminTh>
                <AdminTh>Color</AdminTh>
                <AdminTh>State</AdminTh>
              </tr>
            </thead>
            <tbody>
              {item.variants.map((variant) => (
                <tr key={variant.id}>
                  <AdminTd>{variant.sku}</AdminTd>
                  <AdminTd>{variant.size}</AdminTd>
                  <AdminTd>{variant.color}</AdminTd>
                  <AdminTd>{variant.isActive ? 'Active' : 'Inactive'}</AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
        {item.media.length === 0 ? (
          <AdminEmpty>No media assets.</AdminEmpty>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {item.media.map((media) => (
              <li
                key={media.id}
                className="rounded-[4px] border border-[#2d2a27] p-3 text-sm text-[#b5b0a8]"
              >
                <p className="truncate text-white">{media.alt}</p>
                <p className="truncate text-xs">{media.url}</p>
                {media.isPrimary ? (
                  <span className="text-[10px] uppercase text-[#e3bb78]">Primary</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: PropsWithChildren<{ label: string; error?: string; className?: string }>) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-[#d8d4cd]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
