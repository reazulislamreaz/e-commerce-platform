'use client';

import { Pencil } from 'lucide-react';
import { AdminModal } from '@/components/admin/admin-modal';
import { AdminButton, StatusPill } from '@/components/admin/admin-ui';
import { TAXONOMY_TYPE_LABELS, type TaxonomyRow } from '../taxonomy-schema';

type TaxonomyDetailsModalProps = {
  item: TaxonomyRow | null;
  onClose: () => void;
  onEdit: (item: TaxonomyRow) => void;
};

export function TaxonomyDetailsModal({ item, onClose, onEdit }: TaxonomyDetailsModalProps) {
  return (
    <AdminModal
      open={Boolean(item)}
      onClose={onClose}
      title={item ? item.name : 'Taxonomy item'}
      description="Read-only view — use Edit to make changes."
      size="md"
      footer={
        item ? (
          <>
            <AdminButton variant="ghost" onClick={onClose}>
              Close
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => onEdit(item)}>
              <Pencil className="size-3.5" strokeWidth={1.8} />
              Edit
            </AdminButton>
          </>
        ) : undefined
      }
    >
      {item ? (
        <dl className="divide-y divide-[#26231f]/70">
          <DetailRow label="Type">
            <StatusPill>{TAXONOMY_TYPE_LABELS[item.type]}</StatusPill>
          </DetailRow>
          <DetailRow label="Status">
            <StatusPill>{item.isActive ? 'Active' : 'Inactive'}</StatusPill>
          </DetailRow>
          <DetailRow label="Name">
            <span className="font-semibold text-white">{item.name}</span>
          </DetailRow>
          <DetailRow label="Slug">
            <span className="font-mono text-xs text-[#d8d4cd]">/{item.slug}</span>
          </DetailRow>
          {item.type === 'CATEGORY' ? (
            <DetailRow label="Parent">{item.parentName ?? 'None (top level)'}</DetailRow>
          ) : null}
          {item.position != null ? (
            <DetailRow label="Position">{item.position}</DetailRow>
          ) : null}
          <DetailRow label="Products">
            {item.productCount} product{item.productCount === 1 ? '' : 's'}
          </DetailRow>
          <DetailRow label="Created">{formatDateTime(item.createdAt)}</DetailRow>
          <DetailRow label="Updated">{formatDateTime(item.updatedAt)}</DetailRow>
        </dl>
      ) : null}
    </AdminModal>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8b867d]">{label}</dt>
      <dd className="text-right text-sm text-[#e9e5de]">{children}</dd>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
