'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { AdminModal } from '@/components/admin/admin-modal';
import {
  AdminButton,
  AdminError,
  AdminField,
  AdminInput,
  AdminSelect,
} from '@/components/admin/admin-ui';
import { slugify } from '@/lib/slugify';
import { adminApi } from '../api';
import { adminKeys, useAdminMutation } from '../hooks';
import { mutationErrorMessage } from '../mutation-error';
import {
  TAXONOMY_TYPES,
  TAXONOMY_TYPE_HINTS,
  TAXONOMY_TYPE_LABELS,
  emptyTaxonomyValues,
  taxonomyFormSchema,
  taxonomyRowToFormValues,
  type TaxonomyFormValues,
  type TaxonomyRow,
} from '../taxonomy-schema';
import type { AdminCategory } from '../types';

const TAXONOMY_INVALIDATE = [adminKeys.brands(), adminKeys.categories(), adminKeys.collections()];

type TaxonomyFormModalProps = {
  open: boolean;
  /** When set the modal edits this item; otherwise it creates a new one. */
  item: TaxonomyRow | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

/** Category ids that cannot become the parent of `id` without creating a cycle. */
function selfAndDescendantIds(categories: AdminCategory[], id: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = childrenByParent.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenByParent.set(category.parentId, siblings);
  }
  const blocked = new Set<string>([id]);
  const queue = [id];
  while (queue.length > 0) {
    for (const childId of childrenByParent.get(queue.pop()!) ?? []) {
      if (!blocked.has(childId)) {
        blocked.add(childId);
        queue.push(childId);
      }
    }
  }
  return blocked;
}

export function TaxonomyFormModal({ open, item, ...props }: TaxonomyFormModalProps) {
  if (!open) return null;
  // Remounting per item gives every open a fresh form without effect-driven resets.
  return <TaxonomyFormModalContent key={item?.id ?? 'create'} item={item} {...props} />;
}

function TaxonomyFormModalContent({
  item,
  categories,
  onClose,
  onSaved,
}: Omit<TaxonomyFormModalProps, 'open'>) {
  const isEdit = Boolean(item);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const save = useAdminMutation(
    async ({ values, id }: { values: TaxonomyFormValues; id?: string }) => {
      const name = values.name.trim();
      const slug = values.slug.trim();
      const position = values.position === '' ? undefined : values.position;
      const isActive = values.status === 'ACTIVE';

      if (values.type === 'BRAND') {
        const body = { name, ...(slug ? { slug } : {}), isActive };
        return id ? adminApi.updateBrand(id, body) : adminApi.createBrand(body);
      }
      if (values.type === 'CATEGORY') {
        if (id) {
          return adminApi.updateCategory(id, {
            name,
            ...(slug ? { slug } : {}),
            parentId: values.parentId || null,
            ...(position != null ? { position } : {}),
            isActive,
          });
        }
        return adminApi.createCategory({
          name,
          ...(slug ? { slug } : {}),
          ...(values.parentId ? { parentId: values.parentId } : {}),
          ...(position != null ? { position } : {}),
          isActive,
        });
      }
      const body = {
        name,
        ...(slug ? { slug } : {}),
        ...(position != null ? { position } : {}),
        isActive,
      };
      return id ? adminApi.updateCollection(id, body) : adminApi.createCollection(body);
    },
    TAXONOMY_INVALIDATE,
  );

  const form = useForm<TaxonomyFormValues>({
    resolver: zodResolver(taxonomyFormSchema) as Resolver<TaxonomyFormValues>,
    defaultValues: item ? taxonomyRowToFormValues(item) : emptyTaxonomyValues,
    mode: 'onBlur',
  });
  const errors = form.formState.errors;

  const watchedType = useWatch({ control: form.control, name: 'type' });
  const watchedName = useWatch({ control: form.control, name: 'name' });
  const watchedSlug = useWatch({ control: form.control, name: 'slug' });

  const parentOptions = useMemo(() => {
    if (watchedType !== 'CATEGORY') return [];
    const blocked = item?.type === 'CATEGORY' ? selfAndDescendantIds(categories, item.id) : null;
    return categories.filter((category) => !blocked?.has(category.id));
  }, [watchedType, categories, item]);

  const busy = save.isPending;
  const typeLabel = TAXONOMY_TYPE_LABELS[watchedType].toLowerCase();
  const slugPreview = watchedSlug.trim() || slugify(watchedName);

  async function submit() {
    setSubmitError(null);
    await form.handleSubmit(async (values) => {
      try {
        await save.mutateAsync({ values, ...(item ? { id: item.id } : {}) });
        onSaved(
          isEdit
            ? `${TAXONOMY_TYPE_LABELS[values.type]} “${values.name.trim()}” updated.`
            : `${TAXONOMY_TYPE_LABELS[values.type]} “${values.name.trim()}” created.`,
        );
        onClose();
      } catch (error) {
        setSubmitError(
          mutationErrorMessage(error, `The ${typeLabel} could not be ${isEdit ? 'saved' : 'created'}.`),
        );
      }
    })();
  }

  return (
    <AdminModal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${typeLabel} — ${item?.name}` : 'Add taxonomy'}
      description={
        isEdit
          ? 'Changes apply to the storefront immediately.'
          : 'Create a brand, category, or collection to organize the catalog.'
      }
      size="lg"
      dismissDisabled={busy}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton onClick={() => void submit()} disabled={busy} loading={busy}>
            {isEdit ? 'Save changes' : `Create ${typeLabel}`}
          </AdminButton>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        {submitError ? <AdminError>{submitError}</AdminError> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField
            label="Type"
            error={errors.type?.message}
            hint={TAXONOMY_TYPE_HINTS[watchedType]}
          >
            <AdminSelect {...form.register('type')} disabled={busy || isEdit}>
              {TAXONOMY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TAXONOMY_TYPE_LABELS[type]}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField
            label="Status"
            error={errors.status?.message}
            hint="Inactive items are hidden from storefront taxonomy filters."
          >
            <AdminSelect {...form.register('status')} disabled={busy}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </AdminSelect>
          </AdminField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField label="Name" error={errors.name?.message}>
            <AdminInput
              placeholder={watchedType === 'BRAND' ? 'Elevate Apparel' : 'Outerwear'}
              {...form.register('name')}
              disabled={busy}
            />
          </AdminField>
          <AdminField
            label="Slug (optional)"
            error={errors.slug?.message}
            hint={
              isEdit
                ? 'Leave empty to keep the current slug.'
                : slugPreview
                  ? `Storefront URL segment: /${slugPreview}`
                  : 'Generated from the name when left empty.'
            }
          >
            <AdminInput placeholder="outerwear" {...form.register('slug')} disabled={busy} />
          </AdminField>
        </div>

        {watchedType === 'CATEGORY' ? (
          <AdminField
            label="Parent category"
            error={errors.parentId?.message}
            hint="Nest this category under another to build the taxonomy tree."
          >
            <AdminSelect {...form.register('parentId')} disabled={busy}>
              <option value="">None (top level)</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
        ) : null}

        {watchedType !== 'BRAND' ? (
          <AdminField
            label="Position (optional)"
            error={errors.position?.message}
            hint="Lower numbers appear first in storefront listings."
          >
            <AdminInput
              type="number"
              min="0"
              step="1"
              {...form.register('position', {
                setValueAs: (value) => (value === '' || value == null ? '' : Number(value)),
              })}
              disabled={busy}
            />
          </AdminField>
        ) : null}
      </form>
    </AdminModal>
  );
}
