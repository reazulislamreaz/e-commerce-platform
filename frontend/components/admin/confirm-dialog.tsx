'use client';

import { AlertTriangle } from 'lucide-react';
import { AdminModal } from '@/components/admin/admin-modal';
import { AdminButton } from '@/components/admin/admin-ui';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Explains exactly what will happen — shown under the title. */
  message: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Destructive-action confirmation styled to match the admin modals. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      dismissDisabled={loading}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" onClick={onConfirm} disabled={loading} loading={loading}>
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="size-4" strokeWidth={1.7} />
        </span>
        <p className="text-sm leading-relaxed text-[#555555]">{message}</p>
      </div>
    </AdminModal>
  );
}
