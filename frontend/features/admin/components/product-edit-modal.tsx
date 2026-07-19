'use client';

import { useState } from 'react';
import { AdminModal } from '@/components/admin/admin-modal';
import { AdminError, AdminSkeleton } from '@/components/admin/admin-ui';
import { adminApi } from '../api';
import {
  adminKeys,
  useAdminBrands,
  useAdminCategories,
  useAdminCollections,
  useAdminMutation,
  useAdminProduct,
  useProductInventoryBalances,
} from '../hooks';
import { mutationErrorMessage } from '../mutation-error';
import type { UpdateAdminProductInput } from '../types';
import { ProductEditor } from './product-editor';

type ProductEditModalProps = {
  productId: string | null;
  onClose: () => void;
};

/** Full edit workflow in a modal — reuses the detail page's ProductEditor. */
export function ProductEditModal({ productId, onClose }: ProductEditModalProps) {
  const open = Boolean(productId);
  const product = useAdminProduct(productId ?? undefined);
  const brands = useAdminBrands();
  const categories = useAdminCategories();
  const collections = useAdminCollections();
  const variantIds = product.data?.variants.map((variant) => variant.id) ?? [];
  const inventory = useProductInventoryBalances(variantIds);

  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateProduct = useAdminMutation(
    (values: UpdateAdminProductInput) => adminApi.updateProduct(productId!, values),
    [adminKeys.productsRoot(), adminKeys.productRoot(), adminKeys.productStats()],
  );

  async function onSave(values: UpdateAdminProductInput) {
    setActionError(null);
    setSuccess(null);
    try {
      const updated = await updateProduct.mutateAsync(values);
      setSuccess('Product details saved.');
      return updated;
    } catch (error) {
      setActionError(mutationErrorMessage(error, 'Could not save product.'));
      throw error;
    }
  }

  function close() {
    setActionError(null);
    setSuccess(null);
    onClose();
  }

  const taxonomyError = brands.isError || categories.isError || collections.isError;
  const taxonomyLoading = brands.isLoading || categories.isLoading || collections.isLoading;

  return (
    <AdminModal
      open={open}
      onClose={close}
      title={product.data ? `Edit — ${product.data.name}` : 'Edit product'}
      description="Changes go live immediately for published products."
      size="xl"
      dismissDisabled={updateProduct.isPending}
    >
      {actionError ? <AdminError>{actionError}</AdminError> : null}
      {success ? (
        <p className="mb-4 rounded-lg border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
          {success}
        </p>
      ) : null}

      {product.isLoading ? (
        <div className="space-y-4">
          <AdminSkeleton className="h-40 w-full" />
          <AdminSkeleton className="h-40 w-full" />
        </div>
      ) : null}
      {product.isError ? <AdminError>Product failed to load.</AdminError> : null}
      {taxonomyError ? <AdminError>Could not load product taxonomy.</AdminError> : null}

      {product.data && !taxonomyError ? (
        <ProductEditor
          key={product.data.id}
          product={product.data}
          brands={brands.data ?? []}
          categories={categories.data ?? []}
          collections={collections.data ?? []}
          balances={inventory.data}
          inventoryReady={!inventory.isLoading && !inventory.isError}
          disabled={updateProduct.isPending || taxonomyLoading}
          onSave={onSave}
        />
      ) : null}
    </AdminModal>
  );
}
