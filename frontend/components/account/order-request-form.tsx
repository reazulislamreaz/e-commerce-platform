'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { toast, toastErrorFrom } from '@/lib/toast';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import {
  accountRepository,
  useAccountOrders,
  useAccountReturns,
  useCreateReturnRequest,
  type CustomerOrder,
  type ReturnRequest,
} from '@/features/account';
import { useProductsByIds } from '@/features/products';

const schema = z.object({
  orderId: z.string().min(1, 'Select an order'),
  reason: z.string().min(5, 'Please describe the reason').max(400),
  conditionAttested: z.boolean().refine((value) => value, {
    message: 'You must confirm items are unworn with tags attached.',
  }),
});

type Input = z.infer<typeof schema>;

type OrderRequestType = ReturnRequest['type'];

export function OrderRequestForm({
  type,
  title,
  reasonLabel,
  submitLabel,
  listTitle,
  emptyMessage,
}: {
  type: OrderRequestType;
  title: string;
  reasonLabel: string;
  submitLabel: string;
  listTitle: string;
  emptyMessage: string;
}) {
  const user = useAppSelector(selectAuthUser)!;
  const { data: orders, loading: ordersLoading, error: ordersError } = useAccountOrders(user.id);
  const {
    data: requests,
    loading: returnsLoading,
    error: returnsError,
  } = useAccountReturns(user.id);
  const createReturn = useCreateReturnRequest(user.id);
  const filtered = requests.filter((r) => r.type === type);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [exchangeVariants, setExchangeVariants] = useState<Record<string, string>>({});

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { conditionAttested: false },
  });

  const orderId = useWatch({ control, name: 'orderId' });
  const activeSelectedOrder = selectedOrder?.id === orderId ? selectedOrder : null;
  const productIds = useMemo(
    () => [...new Set((activeSelectedOrder?.items ?? []).map((item) => item.productId))],
    [activeSelectedOrder],
  );
  const productsQuery = useProductsByIds(productIds, type === 'exchange' && productIds.length > 0);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    void accountRepository
      .getOrder(orderId)
      .then((order) => {
        if (!cancelled) {
          setSelectedOrder(order);
          setExchangeVariants({});
        }
      })
      .catch(() => {
        if (!cancelled) setSelectedOrder(null);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const onSubmit = handleSubmit(async (values) => {
    const order = activeSelectedOrder ?? orders.find((entry) => entry.id === values.orderId);
    if (!order) {
      toast.warning('Select a valid order.', { dedupeKey: 'order-request:order' });
      return;
    }

    if (type === 'exchange') {
      const missingVariant = order.items.some((item) => {
        const lineId = item.orderItemId;
        return lineId ? !exchangeVariants[lineId] : true;
      });
      if (missingVariant) {
        toast.warning('Choose a replacement variant for each item.', {
          dedupeKey: 'order-request:variant',
        });
        return;
      }
    }

    try {
      await createReturn.mutateAsync({
        orderId: values.orderId,
        type,
        reason: values.reason,
        conditionAttested: values.conditionAttested,
        ...(type === 'exchange'
          ? {
              items: order.items
                .filter((item) => item.orderItemId)
                .map((item) => ({
                  orderItemId: item.orderItemId!,
                  quantity: item.quantity,
                  exchangeVariantId: exchangeVariants[item.orderItemId!],
                })),
            }
          : {}),
      });
      reset();
      setSelectedOrder(null);
      setExchangeVariants({});
    } catch (err: unknown) {
      toastErrorFrom(err, 'Could not submit request. Please try again.', 'order-request:error');
    }
  });

  return (
    <div className="space-y-5">
      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">{title}</h2>
        <form onSubmit={onSubmit} className="mt-4 max-w-lg space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#d8d4cd]">Order</label>
            <select
              {...register('orderId')}
              disabled={ordersLoading}
              className="w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none focus:border-[#e3bb78] disabled:opacity-50"
            >
              <option value="">{ordersLoading ? 'Loading orders…' : 'Select order'}</option>
              {orders
                .filter((order) => order.status === 'delivered')
                .map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.number}
                  </option>
                ))}
            </select>
            {errors.orderId && (
              <p className="mt-1.5 text-xs text-red-400">{errors.orderId.message}</p>
            )}
            {ordersError ? (
              <p className="mt-1.5 text-xs text-red-400">Could not load orders.</p>
            ) : null}
          </div>

          {type === 'exchange' && activeSelectedOrder ? (
            <div className="space-y-3 rounded-[4px] border border-[#2d2a27] bg-[#1a1815] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#e3bb78]">
                Replacement variants
              </p>
              {activeSelectedOrder.items.map((item) => {
                const lineId = item.orderItemId;
                if (!lineId) return null;
                const product = productsQuery.data?.find((entry) => entry.id === item.productId);
                const options =
                  product?.variants?.filter((variant) => variant.id !== item.variantId) ?? [];

                return (
                  <label key={lineId} className="block space-y-1.5 text-sm">
                    <span className="text-[#e9e5de]">
                      {item.name} ({item.color} / {item.size})
                    </span>
                    <select
                      value={exchangeVariants[lineId] ?? ''}
                      onChange={(event) =>
                        setExchangeVariants((current) => ({
                          ...current,
                          [lineId]: event.target.value,
                        }))
                      }
                      disabled={productsQuery.isLoading}
                      className="w-full rounded-[4px] border border-[#37332c] bg-[#111110] px-3 py-2 text-sm text-white outline-none focus:border-[#e3bb78] disabled:opacity-50"
                    >
                      <option value="">
                        {productsQuery.isLoading ? 'Loading sizes…' : 'Select replacement'}
                      </option>
                      {options.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.color} / {variant.size}
                          {variant.stock <= 0 ? ' (out of stock)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          ) : null}

          <FormField label={reasonLabel} error={errors.reason?.message} {...register('reason')} />
          <label className="flex items-start gap-2 text-sm text-[#e9e5de]">
            <input
              type="checkbox"
              {...register('conditionAttested')}
              className="mt-0.5 accent-[#e5bd79]"
            />
            <span>
              I confirm the item(s) are unworn, unwashed, and have all original tags attached.
            </span>
          </label>
          {errors.conditionAttested && (
            <p className="text-xs text-red-400">{errors.conditionAttested.message}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || createReturn.isPending || ordersLoading}
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b] disabled:opacity-50"
          >
            {isSubmitting || createReturn.isPending ? 'Submitting…' : submitLabel}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">{listTitle}</h3>
        {returnsLoading ? (
          <p className="text-sm text-[#b5b0a8]">Loading requests…</p>
        ) : returnsError ? (
          <p className="text-sm text-red-300">Could not load requests.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#b5b0a8]">{emptyMessage}</p>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-4 text-sm"
            >
              <p className="font-semibold text-white">Order #{req.orderNumber}</p>
              <p className="mt-1 text-[#b5b0a8]">{req.reason}</p>
              <p className="mt-2 text-[11px] capitalize text-[#e3bb78]">{req.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
