'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminError,
  AdminPanel,
  AdminTextarea,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  mutationErrorMessage,
  adminApi,
  adminKeys,
  useAdminMutation,
  useAdminReturn,
} from '@/features/admin';

const RETURN_INVALIDATE = [adminKeys.returnsRoot(), adminKeys.returnRoot()] as const;

export default function AdminReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const returnQuery = useAdminReturn(id);
  const item = returnQuery.data;

  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const approveMutation = useAdminMutation(
    (args: { id: string; note?: string }) => adminApi.approveReturn(args.id, args.note),
    [...RETURN_INVALIDATE],
  );
  const rejectMutation = useAdminMutation(
    (args: { id: string; note?: string }) => adminApi.rejectReturn(args.id, args.note),
    [...RETURN_INVALIDATE],
  );
  const completeMutation = useAdminMutation(
    (args: { id: string; note?: string }) => adminApi.completeReturn(args.id, args.note),
    [...RETURN_INVALIDATE],
  );

  const busy = approveMutation.isPending || rejectMutation.isPending || completeMutation.isPending;

  async function runAction(action: 'approve' | 'reject' | 'complete') {
    if (!item) return;
    setActionError(null);
    setSuccess(null);
    const payload = { id: item.id, ...(note.trim() ? { note: note.trim() } : {}) };
    const requestLabel = item.type === 'exchange' ? 'Exchange' : 'Return';
    try {
      if (action === 'approve') await approveMutation.mutateAsync(payload);
      else if (action === 'reject') await rejectMutation.mutateAsync(payload);
      else await completeMutation.mutateAsync(payload);
      setNote('');
      setSuccess(
        action === 'approve'
          ? `${requestLabel} approved.`
          : action === 'reject'
            ? `${requestLabel} rejected.`
            : `${requestLabel} completed.`,
      );
    } catch (error) {
      setActionError(
        mutationErrorMessage(error, `Could not update ${requestLabel.toLowerCase()}.`),
      );
    }
  }

  if (returnQuery.isLoading) {
    return <AdminTableSkeleton />;
  }

  if (returnQuery.isError || !item) {
    return (
      <div className="space-y-3">
        <AdminError>Return not found or failed to load.</AdminError>
        <Link
          href="/admin/returns"
          className="inline-block text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78]"
        >
          Back to returns
        </Link>
      </div>
    );
  }

  const canDecide = item.status === 'pending';
  const canComplete = item.status === 'approved';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/returns"
          className="text-[10px] font-bold uppercase tracking-[.08em] text-[#e3bb78] hover:text-[#eec98a]"
        >
          ← Returns
        </Link>
        <StatusPill>{item.status}</StatusPill>
      </div>

      <AdminPanel
        title={`${item.type === 'exchange' ? 'Exchange' : 'Return'} · Order #${item.orderNumber}`}
        description={`Requested ${new Date(item.createdAt).toLocaleString()}`}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Type
            </dt>
            <dd className="mt-1 capitalize text-white">{item.type}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Order
            </dt>
            <dd className="mt-1">
              <Link
                href={`/admin/orders/${item.orderId}`}
                className="text-[#e3bb78] hover:text-[#eec98a]"
              >
                #{item.orderNumber}
              </Link>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Reason
            </dt>
            <dd className="mt-1 text-[#e9e5de]">{item.reason}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
            Items
          </p>
          <ul className="space-y-2 text-sm text-[#e9e5de]">
            {item.items.map((line) => (
              <li
                key={line.orderItemId}
                className="flex justify-between gap-3 border-b border-[#2d2a27]/60 py-2 last:border-0"
              >
                <span className="font-mono text-xs text-[#b5b0a8]">{line.orderItemId}</span>
                <span>× {line.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      </AdminPanel>

      {(canDecide || canComplete) && (
        <AdminPanel title="Actions" description="Approve, reject, or complete this request.">
          {actionError ? <AdminError>{actionError}</AdminError> : null}
          {success ? (
            <p className="rounded-[4px] border border-[#e5bd79]/40 bg-[#1a1815] px-3 py-2 text-sm text-[#e3bb78]">
              {success}
            </p>
          ) : null}

          <label className="mt-3 block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b5b0a8]">
              Note (optional)
            </span>
            <AdminTextarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Internal note for the customer record"
              disabled={busy}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            {canDecide ? (
              <>
                <AdminButton
                  type="button"
                  disabled={busy}
                  onClick={() => void runAction('approve')}
                >
                  Approve
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={() => void runAction('reject')}
                >
                  Reject
                </AdminButton>
              </>
            ) : null}
            {canComplete ? (
              <AdminButton type="button" disabled={busy} onClick={() => void runAction('complete')}>
                Complete
              </AdminButton>
            ) : null}
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
