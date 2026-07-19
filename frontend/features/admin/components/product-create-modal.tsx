'use client';

import Image from 'next/image';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PropsWithChildren,
} from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import {
  Banknote,
  Boxes,
  Check,
  CircleDashed,
  ImagePlus,
  Info,
  Loader2,
  Palette,
  Tags,
  Trash2,
  UploadCloud,
  Warehouse,
} from 'lucide-react';
import { AdminModal } from '@/components/admin/admin-modal';
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from '@/components/admin/admin-ui';
import { cn } from '@/lib/utils';
import { adminApi } from '../api';
import {
  adminKeys,
  useAdminBrands,
  useAdminCategories,
  useAdminCollections,
  useAdminMutation,
  useInventoryLocations,
} from '../hooks';
import { mutationErrorMessage } from '../mutation-error';
import {
  createValuesToInput,
  emptyCreateValues,
  productCreateSchema,
  type ProductCreateValues,
} from '../product-editor-schema';
import type { AdminProductDetail } from '../types';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

type ProductCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (product: AdminProductDetail, published: boolean) => void;
};

export function ProductCreateModal({ open, onClose, onCreated }: ProductCreateModalProps) {
  const brands = useAdminBrands();
  const categories = useAdminCategories();
  const collections = useAdminCollections();
  const locations = useInventoryLocations();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [intent, setIntent] = useState<'draft' | 'publish'>('draft');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = useAdminMutation(adminApi.createProduct, [
    adminKeys.productsRoot(),
    adminKeys.productRoot(),
    adminKeys.productStats(),
  ]);
  const publishProduct = useAdminMutation(adminApi.publishProduct, [
    adminKeys.productsRoot(),
    adminKeys.productRoot(),
    adminKeys.productStats(),
  ]);

  const form = useForm<ProductCreateValues>({
    resolver: zodResolver(productCreateSchema) as Resolver<ProductCreateValues>,
    defaultValues: emptyCreateValues,
    mode: 'onBlur',
  });
  const colorFields = useFieldArray({ control: form.control, name: 'colors' });
  const variantFields = useFieldArray({ control: form.control, name: 'variants' });
  const mediaFields = useFieldArray({ control: form.control, name: 'media' });

  const errors = form.formState.errors;
  const watchedName = useWatch({ control: form.control, name: 'name' });
  const watchedAmount = useWatch({ control: form.control, name: 'amountTaka' });
  const watchedMedia = useWatch({ control: form.control, name: 'media' });
  const watchedVariants = useWatch({ control: form.control, name: 'variants' });

  const busy = createProduct.isPending || publishProduct.isPending || uploading;
  const activeLocations = useMemo(
    () => locations.data?.filter((location) => location.isActive) ?? [],
    [locations.data],
  );

  useEffect(() => {
    if (!open || form.getValues('inventoryLocationId') || activeLocations.length === 0) return;
    form.setValue('inventoryLocationId', activeLocations[0].id);
  }, [activeLocations, form, open]);

  const readiness = [
    { label: 'Name and description', done: (watchedName?.trim().length ?? 0) >= 2 },
    { label: 'At least one image', done: (watchedMedia?.length ?? 0) > 0 },
    {
      label: 'At least one variant',
      done: (watchedVariants ?? []).some((variant) => variant.sku.trim().length > 0),
    },
    { label: 'Price above zero', done: Number(watchedAmount) > 0 },
  ];
  const publishable = readiness.every((item) => item.done);

  async function handleFiles(list: FileList | File[]) {
    const files = [...list];
    const accepted = files.filter(
      (file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_UPLOAD_BYTES,
    );
    setUploadError(
      accepted.length === files.length
        ? null
        : 'Some files were skipped — use JPEG, PNG, or WebP under 8 MB.',
    );
    if (accepted.length === 0) return;

    setUploading(true);
    try {
      for (const file of accepted) {
        const uploaded = await adminApi.uploadProductImage(file);
        mediaFields.append({
          url: uploaded.url,
          alt: file.name.replace(/\.[^.]+$/, ''),
          isPrimary: form.getValues('media').length === 0,
        });
      }
    } catch {
      setUploadError('Could not upload this image. Use a JPEG, PNG, or WebP under 8 MB.');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files.length > 0) void handleFiles(event.dataTransfer.files);
  }

  function choosePrimary(index: number) {
    mediaFields.fields.forEach((_, itemIndex) => {
      form.setValue(`media.${itemIndex}.isPrimary`, itemIndex === index, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
  }

  function removeImage(index: number) {
    const wasPrimary = form.getValues(`media.${index}.isPrimary`);
    mediaFields.remove(index);
    if (wasPrimary && form.getValues('media').length > 0) {
      form.setValue('media.0.isPrimary', true, { shouldValidate: true });
    }
  }

  async function submit(publish: boolean) {
    setIntent(publish ? 'publish' : 'draft');
    setSubmitError(null);
    await form.handleSubmit(async (values) => {
      if (publish && values.amountTaka <= 0) {
        form.setError('amountTaka', { message: 'Set a price above zero to publish' });
        return;
      }
      try {
        const created = await createProduct.mutateAsync(createValuesToInput(values));
        let published = false;
        if (publish) {
          try {
            await publishProduct.mutateAsync(created.id);
            published = true;
          } catch (error) {
            // The draft exists — surface why publishing failed and let the admin fix it.
            setSubmitError(
              mutationErrorMessage(error, 'Draft saved, but the product could not be published.'),
            );
            form.reset(emptyCreateValues);
            onCreated(created, false);
            return;
          }
        }
        form.reset(emptyCreateValues);
        onCreated(created, published);
        onClose();
      } catch (error) {
        setSubmitError(mutationErrorMessage(error, 'The product could not be created.'));
      }
    })();
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Add product"
      description="Create a catalog product with pricing, variants, and opening inventory."
      size="xl"
      dismissDisabled={busy}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="secondary"
            onClick={() => void submit(false)}
            disabled={busy}
            loading={createProduct.isPending && intent === 'draft'}
          >
            Save draft
          </AdminButton>
          <AdminButton
            onClick={() => void submit(true)}
            disabled={busy || !publishable}
            loading={(createProduct.isPending || publishProduct.isPending) && intent === 'publish'}
            title={publishable ? undefined : 'Complete the publish checklist first'}
          >
            Publish product
          </AdminButton>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        {submitError ? <AdminError>{submitError}</AdminError> : null}

        <Section
          icon={Info}
          title="Basic information"
          description="Customer-facing name and story."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Name" error={errors.name?.message}>
              <AdminInput placeholder="Essential Hoodie" {...form.register('name')} disabled={busy} />
            </AdminField>
            <AdminField label="Primary color" error={errors.primaryColor?.message}>
              <AdminInput placeholder="Black" {...form.register('primaryColor')} disabled={busy} />
            </AdminField>
            <AdminField
              label="Description"
              error={errors.description?.message}
              className="md:col-span-2"
            >
              <AdminTextarea
                rows={4}
                placeholder="Fabric, fit, and what makes it worth the price."
                {...form.register('description')}
                disabled={busy}
              />
            </AdminField>
          </div>
        </Section>

        <Section
          icon={ImagePlus}
          title="Images"
          description="Drag and drop JPEG, PNG, or WebP files up to 8 MB."
        >
          {uploadError ? <AdminError>{uploadError}</AdminError> : null}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragActive
                ? 'border-[#e3bb78] bg-[#e3bb78]/[0.06]'
                : 'border-[#37332c] bg-[#161513] hover:border-[#4a4438]',
            )}
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-[#e3bb78]" strokeWidth={1.7} />
            ) : (
              <UploadCloud className="size-6 text-[#8b867d]" strokeWidth={1.5} />
            )}
            <p className="text-sm text-[#b5b0a8]">
              {uploading ? 'Uploading…' : 'Drop images here, or'}
            </p>
            {!uploading ? (
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Browse files
              </AdminButton>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.currentTarget.files?.length) void handleFiles(event.currentTarget.files);
                event.currentTarget.value = '';
              }}
            />
          </div>

          {mediaFields.fields.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {mediaFields.fields.map((field, index) => (
                <li
                  key={field.id}
                  className="flex gap-3 rounded-lg border border-[#2d2a27] bg-[#161513] p-3"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-[#e4e3e1]">
                    <Image
                      src={watchedMedia?.[index]?.url ?? field.url}
                      alt={watchedMedia?.[index]?.alt ?? ''}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <AdminInput
                      aria-label={`Image ${index + 1} alt text`}
                      placeholder="Alt text"
                      className="px-2.5 py-1.5 text-xs"
                      {...form.register(`media.${index}.alt`)}
                      disabled={busy}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-[#e3bb78]">
                        <input
                          type="radio"
                          name="create-primary-image"
                          checked={watchedMedia?.[index]?.isPrimary ?? false}
                          onChange={() => choosePrimary(index)}
                          disabled={busy}
                          className="accent-[#e3bb78]"
                        />
                        Primary
                      </label>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={busy}
                        aria-label={`Remove image ${index + 1}`}
                        className="rounded-md p-1 text-[#8b867d] transition-colors hover:bg-red-950/40 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.7} />
                      </button>
                    </div>
                    {errors.media?.[index]?.alt?.message ? (
                      <p className="text-xs text-red-400">{errors.media[index]?.alt?.message}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {typeof errors.media?.message === 'string' ? (
            <p className="mt-2 text-xs text-red-400">{errors.media.message}</p>
          ) : null}
          {errors.media?.root?.message ? (
            <p className="mt-2 text-xs text-red-400">{errors.media.root.message}</p>
          ) : null}
        </Section>

        <Section icon={Banknote} title="Pricing" description="Prices are stored in taka.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Price (taka)" error={errors.amountTaka?.message}>
              <AdminInput
                type="number"
                min="0"
                step="1"
                {...form.register('amountTaka', { valueAsNumber: true })}
                disabled={busy}
              />
            </AdminField>
            <AdminField
              label="Compare-at price (optional)"
              error={errors.compareAtTaka?.message}
              hint="Shown struck through to highlight a discount."
            >
              <AdminInput
                type="number"
                min="0"
                step="1"
                {...form.register('compareAtTaka', {
                  setValueAs: (value) => (value === '' || value == null ? '' : Number(value)),
                })}
                disabled={busy}
              />
            </AdminField>
          </div>
        </Section>

        <Section icon={Tags} title="Category &amp; brand" description="Where the product lives in the catalog.">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminField label="Brand" error={errors.brandId?.message}>
              <AdminSelect {...form.register('brandId')} disabled={busy || brands.isLoading}>
                <option value="">Select brand</option>
                {brands.data?.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Category" error={errors.categoryId?.message}>
              <AdminSelect {...form.register('categoryId')} disabled={busy || categories.isLoading}>
                <option value="">Select category</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Collection (optional)" error={errors.collectionId?.message}>
              <AdminSelect
                {...form.register('collectionId')}
                disabled={busy || collections.isLoading}
              >
                <option value="">No collection</option>
                {collections.data?.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </div>
        </Section>

        <Section
          icon={Palette}
          title="Product attributes"
          description="Swatches shown on the storefront, in order."
        >
          <div className="space-y-2">
            {colorFields.fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <AdminInput
                    aria-label={`Color ${index + 1} name`}
                    placeholder="Black"
                    {...form.register(`colors.${index}.name`)}
                    disabled={busy}
                  />
                </div>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => colorFields.remove(index)}
                  disabled={busy || colorFields.fields.length === 1}
                  aria-label={`Remove color ${index + 1}`}
                >
                  <Trash2 className="size-3.5" strokeWidth={1.7} />
                </AdminButton>
              </div>
            ))}
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => colorFields.append({ name: '' })}
              disabled={busy}
            >
              Add color
            </AdminButton>
            {firstArrayError(errors.colors) ? (
              <p className="text-xs text-red-400">{firstArrayError(errors.colors)}</p>
            ) : null}
          </div>
        </Section>

        <Section
          icon={Warehouse}
          title="Inventory"
          description="Set opening stock per variant at an active inventory location."
        >
          {locations.isError ? (
            <AdminError>Could not load inventory locations.</AdminError>
          ) : (
            <AdminField
              label="Stock location"
              error={errors.inventoryLocationId?.message}
              hint="Required when any variant has an opening quantity above zero."
            >
              <AdminSelect
                {...form.register('inventoryLocationId')}
                disabled={busy || locations.isLoading}
              >
                <option value="">Select inventory location</option>
                {activeLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.code})
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          )}
        </Section>

        <Section
          icon={Boxes}
          title="Variants"
          description="Each size and color combination needs a unique SKU and its own opening quantity."
        >
          <div className="space-y-2">
            {variantFields.fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminInput
                    aria-label={`Variant ${index + 1} SKU`}
                    placeholder="EA-HOOD-BLK-M"
                    {...form.register(`variants.${index}.sku`)}
                    disabled={busy}
                  />
                  <AdminInput
                    aria-label={`Variant ${index + 1} size`}
                    placeholder="M"
                    {...form.register(`variants.${index}.size`)}
                    disabled={busy}
                  />
                  <AdminInput
                    aria-label={`Variant ${index + 1} color`}
                    placeholder="Black"
                    {...form.register(`variants.${index}.color`)}
                    disabled={busy}
                  />
                  <AdminInput
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    aria-label={`Variant ${index + 1} opening quantity`}
                    placeholder="Opening quantity"
                    {...form.register(`variants.${index}.openingQuantity`, {
                      valueAsNumber: true,
                    })}
                    disabled={busy}
                  />
                </div>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => variantFields.remove(index)}
                  disabled={busy || variantFields.fields.length === 1}
                  aria-label={`Remove variant ${index + 1}`}
                >
                  <Trash2 className="size-3.5" strokeWidth={1.7} />
                </AdminButton>
              </div>
            ))}
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                variantFields.append({ sku: '', size: '', color: '', openingQuantity: 0 })
              }
              disabled={busy}
            >
              Add variant
            </AdminButton>
            {firstArrayError(errors.variants) ? (
              <p className="text-xs text-red-400">{firstArrayError(errors.variants)}</p>
            ) : null}
          </div>
        </Section>

        <Section
          icon={Check}
          title="Publishing"
          description="Save as a draft to finish later, or publish directly to the storefront."
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {readiness.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <Check className="size-4 shrink-0 text-emerald-400" strokeWidth={2} />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-[#8b867d]" strokeWidth={1.7} />
                )}
                <span className={item.done ? 'text-white' : 'text-[#8b867d]'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      </form>
    </AdminModal>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: PropsWithChildren<{
  icon: typeof Info;
  title: string;
  description?: string;
  children?: React.ReactNode;
}>) {
  return (
    <section className="rounded-lg border border-[#26231f] bg-[#141312] p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg border border-[#e3bb78]/25 bg-[#e3bb78]/10 text-[#e3bb78]">
          <Icon className="size-3.5" strokeWidth={1.7} />
        </span>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-white">{title}</h3>
          {description ? <p className="text-xs text-[#8b867d]">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function firstArrayError(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'object' && 'root' in error) {
    return firstArrayError((error as { root: unknown }).root);
  }
  if (Array.isArray(error)) {
    for (const item of error) {
      if (!item || typeof item !== 'object') continue;
      for (const field of Object.values(item)) {
        const message = firstArrayError(field);
        if (message) return message;
      }
    }
  }
  return undefined;
}