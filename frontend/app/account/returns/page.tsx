'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '@/components/common/form-field';
import { useAppSelector } from '@/store/hooks';
import {
  getOrders,
  getReturnRequests,
  saveReturnRequests,
  type ReturnRequest,
} from '@/features/account/storage';

const schema = z.object({
  orderId: z.string().min(1, 'Select an order'),
  reason: z.string().min(5, 'Please describe the reason').max(400),
});

type Input = z.infer<typeof schema>;

export default function ReturnsPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const orders = getOrders(user.id);
  const [requests, setRequests] = useState<ReturnRequest[]>(() =>
    getReturnRequests(user.id).filter((r) => r.type === 'return'),
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((values) => {
    const order = orders.find((o) => o.id === values.orderId);
    if (!order) return;
    const next: ReturnRequest = {
      id: `ret-${crypto.randomUUID()}`,
      orderId: order.id,
      orderNumber: order.number,
      reason: values.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: 'return',
    };
    const all = [...getReturnRequests(user.id), next];
    saveReturnRequests(user.id, all);
    setRequests(all.filter((r) => r.type === 'return'));
    reset();
  });

  return (
    <div className="space-y-5">
      <div className="rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
        <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Return Request
        </h2>
        <form onSubmit={onSubmit} className="mt-4 max-w-lg space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#d8d4cd]">Order</label>
            <select
              {...register('orderId')}
              className="w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3.5 py-3 text-sm text-white outline-none focus:border-[#e3bb78]"
            >
              <option value="">Select order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  #{order.number}
                </option>
              ))}
            </select>
            {errors.orderId && (
              <p className="mt-1.5 text-xs text-red-400">{errors.orderId.message}</p>
            )}
          </div>
          <FormField label="Reason" error={errors.reason?.message} {...register('reason')} />
          <button
            type="submit"
            className="rounded-[4px] border border-[#efc677] bg-[#e5bd79] px-5 py-3 text-[11px] font-bold uppercase text-[#18120b]"
          >
            Submit Return
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
          Your Returns
        </h3>
        {requests.length === 0 ? (
          <p className="text-sm text-[#b5b0a8]">No return requests yet.</p>
        ) : (
          requests.map((req) => (
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
