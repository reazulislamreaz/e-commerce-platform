'use client';

import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type PropsWithChildren } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
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
  AdminTextarea,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useAdminBrands,
  useAdminCategories,
  useAdminMutation,
  useAdminProducts,
  type ProductStatus,
} from '@/features/admin';
import { formatTaka } from '@/lib/currency';

const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  brandId: z.string().uuid('Select a brand'),
  description: z.string().trim().min(10).max(5000),
  primaryColor: z.string().trim().min(1).max(80),
  categoryId: z.string().uuid('Select a category'),
  colorName: z.string().trim().min(1).max(80),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color'),
  sku: z.string().trim().min(1).max(64),
  size: z.string().trim().min(1).max(32),
  variantColor: z.string().trim().min(1).max(80),
  mediaUrl: z.string().url(),
  mediaAlt: z.string().trim().min(1).max(240),
  amountTaka: z.number().min(0),
});

type ProductForm = z.infer<typeof productSchema>;

function mutationMessage(error: unknown) {
  return axios.isAxiosError<{ message?: string }>(error)
    ? (error.response?.data.message ?? 'The request could not be completed.')
    : 'The request could not be completed.';
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const products = useAdminProducts({ limit: 50, status: status || undefined });
  const brands = useAdminBrands();
  const categories = useAdminCategories();
  const createProduct = useAdminMutation(adminApi.createProduct, [
    adminKeys.productsRoot(),
    adminKeys.productRoot(),
  ]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
    defaultValues: { colorHex: '#111111', amountTaka: 0 },
  });

  const onSubmit = handleSubmit(async (values) => {
    const product = await createProduct.mutateAsync({
      name: values.name,
      brandId: values.brandId,
      description: values.description,
      primaryColor: values.primaryColor,
      categoryIds: [values.categoryId],
      colors: [{ name: values.colorName, hex: values.colorHex }],
      variants: [{ sku: values.sku, size: values.size, color: values.variantColor }],
      media: [{ url: values.mediaUrl, alt: values.mediaAlt, isPrimary: true }],
      price: { amountTaka: values.amountTaka },
    });
    reset();
    router.push(`/admin/products/${product.id}`);
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products"
        description="Manage the catalog and create new drafts."
      />
      <AdminPanel
        title="Product list"
        description="Manage draft, active, and archived catalog products."
        actions={
          <AdminSelect
            aria-label="Filter products by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProductStatus | '')}
            className="min-w-40"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </AdminSelect>
        }
      >
        {products.isError ? <AdminError>Could not load products.</AdminError> : null}
        {products.isLoading ? <AdminTableSkeleton /> : null}
        {!products.isLoading && products.data?.data.length === 0 ? (
          <AdminEmpty>No products match this filter.</AdminEmpty>
        ) : null}
        {(products.data?.data.length ?? 0) > 0 ? (
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Product</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Price</AdminTh>
                <AdminTh>Variants</AdminTh>
                <AdminTh>Updated</AdminTh>
              </tr>
            </thead>
            <tbody>
              {products.data?.data.map((product) => (
                <tr key={product.id}>
                  <AdminTd>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-semibold text-white hover:text-[#e3bb78]"
                    >
                      {product.name}
                    </Link>
                    <p className="text-xs text-[#8b867d]">{product.brandName}</p>
                  </AdminTd>
                  <AdminTd>
                    <StatusPill>{product.status}</StatusPill>
                  </AdminTd>
                  <AdminTd>{formatTaka(product.priceTaka)}</AdminTd>
                  <AdminTd>{product.variantCount}</AdminTd>
                  <AdminTd>{new Date(product.updatedAt).toLocaleDateString()}</AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}
      </AdminPanel>

      <AdminPanel
        title="Create draft"
        description="Create the product foundation; publish from its detail page."
      >
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Name" error={errors.name?.message}>
            <AdminInput {...register('name')} />
          </Field>
          <Field label="Brand" error={errors.brandId?.message}>
            <AdminSelect {...register('brandId')} disabled={brands.isLoading}>
              <option value="">Select brand</option>
              {brands.data?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </AdminSelect>
          </Field>
          <Field label="Description" error={errors.description?.message} className="md:col-span-2">
            <AdminTextarea rows={4} {...register('description')} />
          </Field>
          <Field label="Primary color" error={errors.primaryColor?.message}>
            <AdminInput placeholder="Black" {...register('primaryColor')} />
          </Field>
          <Field label="Category" error={errors.categoryId?.message}>
            <AdminSelect {...register('categoryId')} disabled={categories.isLoading}>
              <option value="">Select category</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </AdminSelect>
          </Field>
          <Field label="Color name" error={errors.colorName?.message}>
            <AdminInput placeholder="Black" {...register('colorName')} />
          </Field>
          <Field label="Color hex" error={errors.colorHex?.message}>
            <AdminInput {...register('colorHex')} />
          </Field>
          <Field label="Variant SKU" error={errors.sku?.message}>
            <AdminInput {...register('sku')} />
          </Field>
          <Field label="Variant size" error={errors.size?.message}>
            <AdminInput placeholder="M" {...register('size')} />
          </Field>
          <Field label="Variant color" error={errors.variantColor?.message}>
            <AdminInput placeholder="Black" {...register('variantColor')} />
          </Field>
          <Field label="Opening price (taka)" error={errors.amountTaka?.message}>
            <AdminInput
              type="number"
              min="0"
              step="1"
              {...register('amountTaka', { valueAsNumber: true })}
            />
          </Field>
          <Field
            label="Primary media URL"
            error={errors.mediaUrl?.message}
            className="md:col-span-2"
          >
            <AdminInput type="url" {...register('mediaUrl')} />
          </Field>
          <Field label="Media alt text" error={errors.mediaAlt?.message} className="md:col-span-2">
            <AdminInput {...register('mediaAlt')} />
          </Field>
          {createProduct.isError ? (
            <div className="md:col-span-2">
              <AdminError>{mutationMessage(createProduct.error)}</AdminError>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <AdminButton
              type="submit"
              disabled={createProduct.isPending || brands.isLoading || categories.isLoading}
            >
              {createProduct.isPending ? 'Creating…' : 'Create draft'}
            </AdminButton>
          </div>
        </form>
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
