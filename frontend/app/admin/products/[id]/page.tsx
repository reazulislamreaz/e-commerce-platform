'use client';

import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { ProductEditor } from '@/features/admin/components/product-editor';
import { ProductInventory } from '@/features/admin/components/product-inventory';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminError,
  AdminInput,
  AdminPanel,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useAdminBrands,
  useAdminCategories,
  useAdminCollections,
  useAdminMutation,
  useAdminProduct,
  useProductInventoryBalances,
  type UpdateAdminProductInput,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

const PRODUCT_INVALIDATE = [adminKeys.productsRoot(), adminKeys.productRoot()] as const;

const priceSchema = z
  .object({
    amountTaka: z.number().min(0),
    compareAtTaka: z.union([z.literal(''), z.number().min(0)]),
  })
  .superRefine((values, context) => {
    if (values.compareAtTaka !== '' && values.compareAtTaka <= values.amountTaka) {
      context.addIssue({
        code: 'custom',
        path: ['compareAtTaka'],
        message: 'Compare-at price must be greater than the sale price',
      });
    }
  });

type PriceValues = z.infer<typeof priceSchema>;
type LifecycleAction = 'publish' | 'unpublish' | 'archive';

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const product = useAdminProduct(id);
  const brands = useAdminBrands();
  const categories = useAdminCategories();
  const collections = useAdminCollections();
  const variantIds = product.data?.variants.map((variant) => variant.id) ?? [];
  const inventory = useProductInventoryBalances(variantIds);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateProduct = useAdminMutation(
    (values: UpdateAdminProductInput) => adminApi.updateProduct(id, values),
    [...PRODUCT_INVALIDATE],
  );
  const lifecycle = useAdminMutation(
    (action: LifecycleAction) =>
      action === 'publish'
        ? adminApi.publishProduct(id)
        : action === 'unpublish'
          ? adminApi.unpublishProduct(id)
          : adminApi.archiveProduct(id),
    [...PRODUCT_INVALIDATE],
  );
  const addPrice = useAdminMutation(
    (values: PriceValues) =>
      adminApi.addProductPrice(id, {
        amountTaka: values.amountTaka,
        ...(values.compareAtTaka === '' ? {} : { compareAtTaka: values.compareAtTaka }),
      }),
    [...PRODUCT_INVALIDATE],
  );
  const priceForm = useForm<PriceValues>({
    resolver: zodResolver(priceSchema) as Resolver<PriceValues>,
    defaultValues: { amountTaka: product.data?.priceTaka ?? 0, compareAtTaka: '' },
  });

  useEffect(() => {
    if (!product.data || priceForm.formState.isDirty) return;
    priceForm.reset({ amountTaka: product.data.priceTaka, compareAtTaka: '' });
  }, [priceForm, product.data]);

  function resetMessages() {
    setActionError(null);
    setSuccess(null);
  }

  async function onSave(values: UpdateAdminProductInput) {
    resetMessages();
    try {
      const updated = await updateProduct.mutateAsync(values);
      setSuccess('Product details saved.');
      return updated;
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not save product.'));
      throw error;
    }
  }

  async function onLifecycle(action: LifecycleAction) {
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
      const updated = await addPrice.mutateAsync(values);
      setSuccess('Price window added.');
      priceForm.reset({ amountTaka: updated.priceTaka, compareAtTaka: '' });
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not add price window.'));
    }
  }

  if (product.isLoading) return <AdminTableSkeleton />;

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
  const busy = updateProduct.isPending || lifecycle.isPending || addPrice.isPending;
  const taxonomyLoading = brands.isLoading || categories.isLoading || collections.isLoading;

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
              <AdminButton onClick={() => void onLifecycle('publish')} disabled={busy}>
                Publish
              </AdminButton>
            ) : (
              <AdminButton
                variant="secondary"
                onClick={() => void onLifecycle('unpublish')}
                disabled={busy}
              >
                Unpublish
              </AdminButton>
            )}
            {item.status !== 'ARCHIVED' ? (
              <AdminButton
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
          <Summary label="Current price" value={formatTaka(item.priceTaka)} accent />
          <Summary label="Variants" value={String(item.variantCount)} />
          <Summary
            label="Published"
            value={item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Not yet'}
          />
        </dl>
      </AdminPanel>

      {brands.isError || categories.isError || collections.isError ? (
        <AdminError>Could not load product taxonomy.</AdminError>
      ) : (
        <ProductEditor
          key={item.id}
          product={item}
          brands={brands.data ?? []}
          categories={categories.data ?? []}
          collections={collections.data ?? []}
          balances={inventory.data}
          inventoryReady={!inventory.isLoading && !inventory.isError}
          disabled={busy || taxonomyLoading}
          onSave={onSave}
        />
      )}

      <AdminPanel
        title="Price window"
        description="A new price closes the current immutable price window."
      >
        <form
          onSubmit={priceForm.handleSubmit((values) => void onAddPrice(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Amount (taka)" error={priceForm.formState.errors.amountTaka?.message}>
            <AdminInput
              type="number"
              min="0"
              step="1"
              {...priceForm.register('amountTaka', { valueAsNumber: true })}
              disabled={busy}
            />
          </Field>
          <Field
            label="Compare-at (optional)"
            error={priceForm.formState.errors.compareAtTaka?.message}
          >
            <AdminInput
              type="number"
              min="0"
              step="1"
              {...priceForm.register('compareAtTaka', {
                setValueAs: (value) => (value === '' || value == null ? '' : Number(value)),
              })}
              disabled={busy}
            />
          </Field>
          <div className="sm:col-span-2">
            <AdminButton type="submit" loading={addPrice.isPending}>
              Add price window
            </AdminButton>
          </div>
        </form>
      </AdminPanel>

      <ProductInventory
        variants={item.variants}
        balances={inventory.data}
        loading={inventory.isLoading}
        error={inventory.isError}
      />
    </div>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-[#8b867d]">{label}</dt>
      <dd className={accent ? 'font-semibold text-[#e3bb78]' : 'text-white'}>{value}</dd>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: PropsWithChildren<{ label: string; error?: string }>) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium text-[#d8d4cd]">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
