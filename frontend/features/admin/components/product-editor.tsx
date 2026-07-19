'use client';

import { useState, type PropsWithChildren } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from 'react-hook-form';
import {
  AdminButton,
  AdminError,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from '@/components/admin/admin-ui';
import { adminApi } from '../api';
import {
  editorValuesToInput,
  productEditorSchema,
  productToEditorValues,
  type ProductEditorValues,
} from '../product-editor-schema';
import type {
  AdminBrand,
  AdminCategory,
  AdminCollection,
  AdminProductDetail,
  InventoryBalance,
} from '../types';

type ProductEditorProps = {
  product: AdminProductDetail;
  brands: AdminBrand[];
  categories: AdminCategory[];
  collections: AdminCollection[];
  balances: InventoryBalance[];
  inventoryReady: boolean;
  disabled?: boolean;
  onSave: (values: ReturnType<typeof editorValuesToInput>) => Promise<AdminProductDetail>;
};

export function ProductEditor({
  product,
  brands,
  categories,
  collections,
  balances,
  inventoryReady,
  disabled = false,
  onSave,
}: ProductEditorProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const form = useForm<ProductEditorValues>({
    resolver: zodResolver(productEditorSchema) as Resolver<ProductEditorValues>,
    defaultValues: productToEditorValues(product),
  });

  const categoryFields = useFieldArray({ control: form.control, name: 'categories' });
  const collectionFields = useFieldArray({ control: form.control, name: 'collections' });
  const colorFields = useFieldArray({ control: form.control, name: 'colors' });
  const variantFields = useFieldArray({ control: form.control, name: 'variants' });
  const mediaFields = useFieldArray({ control: form.control, name: 'media' });
  const mediaValues = useWatch({ control: form.control, name: 'media' });
  const errors = form.formState.errors;
  const busy = disabled || form.formState.isSubmitting || uploadingIndex !== null;

  async function submit(values: ProductEditorValues) {
    try {
      const updated = await onSave(editorValuesToInput(values));
      form.reset(productToEditorValues(updated));
    } catch {
      // The route owns the API error message; keep entered values available for correction.
    }
  }

  async function uploadImage(index: number, file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploadingIndex(index);
    try {
      const uploaded = await adminApi.uploadProductImage(file);
      form.setValue(`media.${index}.url`, uploaded.url, {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (!form.getValues(`media.${index}.alt`)) {
        form.setValue(`media.${index}.alt`, file.name.replace(/\.[^.]+$/, ''), {
          shouldDirty: true,
        });
      }
    } catch {
      setUploadError('Could not upload this image. Use a JPEG, PNG, or WebP under 8 MB.');
    } finally {
      setUploadingIndex(null);
    }
  }

  function choosePrimary(index: number) {
    mediaFields.fields.forEach((_, itemIndex) => {
      form.setValue(`media.${itemIndex}.isPrimary`, itemIndex === index, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  }

  function variantHasStock(existingId: string | undefined) {
    if (!existingId) return false;
    return balances.some(
      (balance) =>
        balance.variantId === existingId && (balance.onHand > 0 || balance.reserved > 0),
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <AdminPanel
        title="Product details"
        description="Customer-facing identity and merchandising settings."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" error={errors.name?.message}>
            <AdminInput {...form.register('name')} disabled={busy} />
          </Field>
          <Field label="Slug" error={errors.slug?.message}>
            <AdminInput {...form.register('slug')} disabled={busy} />
          </Field>
          <Field label="Brand" error={errors.brandId?.message}>
            <AdminSelect {...form.register('brandId')} disabled={busy}>
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </AdminSelect>
          </Field>
          <Field label="Primary color" error={errors.primaryColor?.message}>
            <AdminInput {...form.register('primaryColor')} disabled={busy} />
          </Field>
          <Field label="Description" error={errors.description?.message} className="md:col-span-2">
            <AdminTextarea rows={6} {...form.register('description')} disabled={busy} />
          </Field>
          <Field label="Featured position" error={errors.featuredPosition?.message}>
            <AdminInput
              type="number"
              min="0"
              step="1"
              {...form.register('featuredPosition', { valueAsNumber: true })}
              disabled={busy}
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-white">
            <input
              type="checkbox"
              {...form.register('isNew')}
              className="accent-[#e3bb78]"
              disabled={busy}
            />
            Show as new arrival
          </label>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Taxonomy"
        description="The first category and collection are treated as primary."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ArrayGroup
            label="Categories"
            error={nestedError(errors.categories)}
            onAdd={() => categoryFields.append({ id: '' })}
            disabled={busy}
          >
            {categoryFields.fields.map((field, index) => (
              <ArrayRow
                key={field.id}
                index={index}
                count={categoryFields.fields.length}
                onMove={categoryFields.move}
                onRemove={() => categoryFields.remove(index)}
                removeDisabled={busy || categoryFields.fields.length === 1}
              >
                <AdminSelect
                  aria-label={`Category ${index + 1}`}
                  {...form.register(`categories.${index}.id`)}
                  disabled={busy}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </AdminSelect>
              </ArrayRow>
            ))}
          </ArrayGroup>

          <ArrayGroup
            label="Collections"
            error={nestedError(errors.collections)}
            onAdd={() => collectionFields.append({ id: '' })}
            disabled={busy}
          >
            {collectionFields.fields.length === 0 ? (
              <p className="text-sm text-[#8b867d]">No collections assigned.</p>
            ) : null}
            {collectionFields.fields.map((field, index) => (
              <ArrayRow
                key={field.id}
                index={index}
                count={collectionFields.fields.length}
                onMove={collectionFields.move}
                onRemove={() => collectionFields.remove(index)}
                removeDisabled={busy}
              >
                <AdminSelect
                  aria-label={`Collection ${index + 1}`}
                  {...form.register(`collections.${index}.id`)}
                  disabled={busy}
                >
                  <option value="">Select collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </AdminSelect>
              </ArrayRow>
            ))}
          </ArrayGroup>
        </div>
      </AdminPanel>

      <AdminPanel title="Colors" description="Color order is used on the storefront.">
        <ArrayGroup
          label="Product colors"
          error={nestedError(errors.colors)}
          onAdd={() => colorFields.append({ name: '', hex: '#111111' })}
          disabled={busy}
        >
          {colorFields.fields.map((field, index) => (
            <ArrayRow
              key={field.id}
              index={index}
              count={colorFields.fields.length}
              onMove={colorFields.move}
              onRemove={() => colorFields.remove(index)}
              removeDisabled={busy || colorFields.fields.length === 1}
            >
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_180px]">
                <AdminInput
                  aria-label={`Color ${index + 1} name`}
                  placeholder="Black"
                  {...form.register(`colors.${index}.name`)}
                  disabled={busy}
                />
                <AdminInput
                  aria-label={`Color ${index + 1} hex`}
                  {...form.register(`colors.${index}.hex`)}
                  disabled={busy}
                />
              </div>
            </ArrayRow>
          ))}
        </ArrayGroup>
      </AdminPanel>

      <AdminPanel
        title="Variants"
        description="Existing SKUs stay fixed to preserve their inventory and order history."
      >
        <ArrayGroup
          label="Product variants"
          error={nestedError(errors.variants)}
          onAdd={() => variantFields.append({ sku: '', size: '', color: '' })}
          disabled={busy}
        >
          {variantFields.fields.map((field, index) => {
            const existingId = form.getValues(`variants.${index}.existingId`);
            const hasStock = variantHasStock(existingId);
            const removalBlocked = Boolean(existingId) && (!inventoryReady || hasStock);
            return (
              <div key={field.id}>
                <ArrayRow
                  index={index}
                  count={variantFields.fields.length}
                  onMove={variantFields.move}
                  onRemove={() => variantFields.remove(index)}
                  removeDisabled={busy || variantFields.fields.length === 1 || removalBlocked}
                  removeTitle={
                    removalBlocked
                      ? inventoryReady
                        ? 'Clear this variant’s stock before removing it'
                        : 'Inventory must finish loading before removing an existing variant'
                      : undefined
                  }
                >
                  <div className="grid flex-1 gap-2 md:grid-cols-3">
                    <AdminInput
                      aria-label={`Variant ${index + 1} SKU`}
                      placeholder="SKU"
                      {...form.register(`variants.${index}.sku`)}
                      disabled={busy}
                      readOnly={Boolean(existingId)}
                    />
                    <AdminInput
                      aria-label={`Variant ${index + 1} size`}
                      placeholder="Size"
                      {...form.register(`variants.${index}.size`)}
                      disabled={busy}
                    />
                    <AdminInput
                      aria-label={`Variant ${index + 1} color`}
                      placeholder="Color"
                      {...form.register(`variants.${index}.color`)}
                      disabled={busy}
                    />
                  </div>
                </ArrayRow>
                {hasStock ? (
                  <p className="mt-1 text-xs text-amber-300">
                    This variant has stock and cannot be removed.
                  </p>
                ) : null}
              </div>
            );
          })}
        </ArrayGroup>
      </AdminPanel>

      <AdminPanel
        title="Product images"
        description="Upload JPEG, PNG, or WebP files, or enter an existing image URL."
      >
        {uploadError ? <AdminError>{uploadError}</AdminError> : null}
        <div className="mt-3 space-y-3">
          {mediaFields.fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-[#2d2a27] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#e3bb78]">
                  <input
                    type="radio"
                    name="primary-product-image"
                    checked={mediaValues[index]?.isPrimary ?? false}
                    onChange={() => choosePrimary(index)}
                    disabled={busy}
                    className="accent-[#e3bb78]"
                  />
                  Primary image
                </label>
                <ArrayControls
                  index={index}
                  count={mediaFields.fields.length}
                  onMove={mediaFields.move}
                  onRemove={() => mediaFields.remove(index)}
                  removeDisabled={busy || mediaFields.fields.length === 1}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Image URL" error={errors.media?.[index]?.url?.message}>
                  <AdminInput
                    {...form.register(`media.${index}.url`)}
                    disabled={busy}
                    placeholder="/uploads/products/…"
                  />
                </Field>
                <Field label="Alt text" error={errors.media?.[index]?.alt?.message}>
                  <AdminInput {...form.register(`media.${index}.alt`)} disabled={busy} />
                </Field>
                <Field label="Choose local image" className="md:col-span-2">
                  <AdminInput
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(event) =>
                      void uploadImage(index, event.currentTarget.files?.[0])
                    }
                  />
                  {uploadingIndex === index ? (
                    <span className="mt-1 block text-xs text-[#e3bb78]">Uploading…</span>
                  ) : null}
                </Field>
              </div>
            </div>
          ))}
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() =>
              mediaFields.append({ url: '', alt: '', isPrimary: mediaFields.fields.length === 0 })
            }
            disabled={busy}
          >
            Add image
          </AdminButton>
          {nestedError(errors.media) ? (
            <p className="text-xs text-red-400">{nestedError(errors.media)}</p>
          ) : null}
        </div>
      </AdminPanel>

      <div className="flex justify-end">
        <AdminButton type="submit" loading={form.formState.isSubmitting} disabled={busy}>
          Save product
        </AdminButton>
      </div>
    </form>
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

function ArrayGroup({
  label,
  error,
  onAdd,
  disabled,
  children,
}: PropsWithChildren<{
  label: string;
  error?: string;
  onAdd: () => void;
  disabled: boolean;
}>) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#d8d4cd]">{label}</h3>
        <AdminButton type="button" variant="secondary" size="sm" onClick={onAdd} disabled={disabled}>
          Add
        </AdminButton>
      </div>
      <div className="space-y-2">{children}</div>
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function ArrayRow({
  index,
  count,
  onMove,
  onRemove,
  removeDisabled,
  removeTitle,
  children,
}: PropsWithChildren<{
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  removeDisabled: boolean;
  removeTitle?: string;
}>) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#2d2a27] p-2">
      {children}
      <ArrayControls
        index={index}
        count={count}
        onMove={onMove}
        onRemove={onRemove}
        removeDisabled={removeDisabled}
        removeTitle={removeTitle}
      />
    </div>
  );
}

function ArrayControls({
  index,
  count,
  onMove,
  onRemove,
  removeDisabled,
  removeTitle,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  removeDisabled: boolean;
  removeTitle?: string;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <AdminButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        aria-label="Move up"
      >
        ↑
      </AdminButton>
      <AdminButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onMove(index, index + 1)}
        disabled={index === count - 1}
        aria-label="Move down"
      >
        ↓
      </AdminButton>
      <AdminButton
        type="button"
        variant="danger"
        size="sm"
        onClick={onRemove}
        disabled={removeDisabled}
        title={removeTitle}
        aria-label="Remove"
      >
        ×
      </AdminButton>
    </div>
  );
}

function nestedError(error: FieldErrors | unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('message' in error && typeof error.message === 'string') return error.message;
  if ('root' in error) return nestedError(error.root);
  if (Array.isArray(error)) {
    for (const item of error) {
      const message = nestedError(item);
      if (message) return message;
    }
  }
  return undefined;
}
