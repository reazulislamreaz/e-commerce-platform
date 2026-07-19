'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { FormField } from '@/components/common/form-field';
import { formatTaka } from '@/lib/currency';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { cartCleared } from '@/store/slices/cart-slice';
import { selectAuthUser, selectCartHydrated, selectCartItems } from '@/store/selectors';
import {
  cartSubtotal,
  resolveCartLines,
  shippingForSubtotal,
} from '@/features/cart/pricing';
import { accountRepository } from '@/features/account';
import { useProductsByIds } from '@/features/products';
import { trackInitiateCheckout, trackPurchase } from '@/features/analytics/facebook-pixel';
import { setCartRecoveryEmail } from '@/features/cart/api';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(80),
  phone: z.string().min(10, 'Enter a valid phone number').max(20),
  email: z.email(),
  line1: z.string().min(3, 'Address is required').max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  postalCode: z.string().min(3).max(20),
  paymentMethod: z.literal('cod'),
  notes: z.string().max(300).optional(),
});

type CheckoutInput = z.infer<typeof checkoutSchema>;

export function CheckoutClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const cartHydrated = useAppSelector(selectCartHydrated);
  const user = useAppSelector(selectAuthUser);
  const products = useProductsByIds(
    items.map(({ productId }) => productId),
    cartHydrated,
  );
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [shippingWaived, setShippingWaived] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const lines = useMemo(
    () => resolveCartLines(items, products.data ?? []),
    [items, products.data],
  );
  const checkoutTracked = useRef(false);

  const subtotal = cartSubtotal(lines);
  const shipping = shippingForSubtotal(subtotal, shippingWaived);
  const total = Math.max(0, subtotal - discount) + shipping;

  useEffect(() => {
    if (checkoutTracked.current || lines.length === 0) return;
    checkoutTracked.current = true;
    trackInitiateCheckout({
      content_ids: lines.map(({ item }) => item.productId),
      num_items: lines.reduce((sum, line) => sum + line.item.quantity, 0),
      value: total,
    });
  }, [lines, total]);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email ?? '',
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
      paymentMethod: 'cod',
      city: 'Dhaka',
      district: 'Dhaka',
      postalCode: '1203',
    },
  });

  const applyCode = async () => {
    if (!user) {
      setCouponError('Sign in to apply coupons from your account.');
      return;
    }
    try {
      const result = await accountRepository.validateCoupon(couponCode, subtotal);
      setCouponError(null);
      setDiscount(result.discount);
      setShippingWaived(result.shippingWaived);
      setAppliedCode(result.code);
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string } | undefined)?.message ??
          'Invalid or expired coupon code.')
        : 'Invalid or expired coupon code.';
      setCouponError(message);
      setDiscount(0);
      setShippingWaived(false);
      setAppliedCode(undefined);
    }
  };

  const persistGuestRecoveryEmail = () => {
    if (user) return;
    const email = getValues('email')?.trim();
    if (!email) return;
    void setCartRecoveryEmail(email).catch(() => undefined);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (lines.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!user && values.email) {
        void setCartRecoveryEmail(values.email).catch(() => undefined);
      }

      const order = await accountRepository.placeOrderCheckout(
        {
          fullName: values.fullName,
          phone: values.phone,
          email: values.email,
          line1: values.line1,
          line2: values.line2,
          city: values.city,
          district: values.district,
          postalCode: values.postalCode,
          paymentMethod: 'cod',
          notes: values.notes,
          couponCode: appliedCode,
          items: lines.map(({ item }) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
        idempotencyKey,
      );

      if (user) {
        trackPurchase({
          content_ids: lines.map(({ item }) => item.productId),
          value: order.total,
          order_id: order.number,
        });
      }

      dispatch(cartCleared());
      setIdempotencyKey(crypto.randomUUID());

      if (user) {
        router.push(`/account/orders/${order.id}?confirmed=1`);
        return;
      }

      try {
        sessionStorage.setItem('elevate:lastOrder', JSON.stringify(order));
      } catch {
        // ignore quota errors
      }
      router.push('/order-confirmation');
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string } | undefined)?.message ??
          'Could not place your order. Please try again.')
        : 'Could not place your order. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  });

  if (!cartHydrated || (items.length > 0 && products.isLoading && !products.data)) {
    return (
      <main id="main-content" className="flex-1 bg-black" aria-busy="true">
        <section className="mx-auto max-w-[1400px] space-y-4 px-5 py-10 sm:px-7">
          <div className="h-3 w-28 animate-pulse rounded-[4px] bg-[#1a1815]" />
          <div className="h-9 w-56 animate-pulse rounded-[4px] bg-[#1a1815]" />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-[4px] border border-[#2d2a27] bg-[#111110]" />
            <div className="h-72 animate-pulse rounded-[4px] border border-[#2d2a27] bg-[#111110]" />
          </div>
        </section>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-black px-5 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-white">Nothing to checkout</h1>
        <Link href="/shop" className="mt-6 text-[11px] font-bold uppercase text-[#e3bb78]">
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 bg-black">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-white">
          SHIPPING & PAYMENT
        </h1>

        <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
            <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
              Shipping Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" error={errors.fullName?.message} {...register('fullName')} />
              <FormField label="Phone" error={errors.phone?.message} {...register('phone')} />
              <div className="sm:col-span-2">
                <FormField
                  label="Email"
                  type="email"
                  error={errors.email?.message}
                  {...register('email', { onBlur: persistGuestRecoveryEmail })}
                />
              </div>
              <div className="sm:col-span-2">
                <FormField label="Address line 1" error={errors.line1?.message} {...register('line1')} />
              </div>
              <div className="sm:col-span-2">
                <FormField label="Address line 2 (optional)" {...register('line2')} />
              </div>
              <FormField label="City" error={errors.city?.message} {...register('city')} />
              <FormField label="District" error={errors.district?.message} {...register('district')} />
              <FormField
                label="Postal code"
                error={errors.postalCode?.message}
                {...register('postalCode')}
              />
              <div className="sm:col-span-2">
                <FormField
                  label="Order notes (optional)"
                  error={errors.notes?.message}
                  {...register('notes')}
                />
              </div>
            </div>

            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
                Payment Method
              </h2>
              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[#37332c] px-3 py-2.5 text-sm text-[#e9e5de]">
                  <input
                    type="radio"
                    value="cod"
                    {...register('paymentMethod')}
                    className="accent-[#e5bd79]"
                  />
                  Cash on Delivery
                </label>
                <p className="rounded-[4px] border border-dashed border-[#37332c] px-3 py-2.5 text-xs text-[#8b867d]">
                  bKash and card payments are coming soon.
                </p>
              </div>
            </div>
          </div>

          <aside className="h-fit space-y-4 rounded-[4px] border border-[#2d2a27] bg-[#111110] p-5">
            <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
              Your Order
            </h2>
            <ul className="space-y-3">
              {lines.map(({ item, product }) => (
                <li key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-[4px] bg-[#e4e3e1]">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-[12px]">
                    <p className="truncate font-medium text-white">{product.name}</p>
                    <p className="text-[#8b867d]">
                      {item.color} / {item.size} × {item.quantity}
                    </p>
                    <p className="text-[#e5c17d]">{formatTaka(product.price * item.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-[#2d2a27] pt-4">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#b5b0a8]">
                Coupon
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="ELEVATE10"
                  className="w-full rounded-[4px] border border-[#37332c] bg-[#1a1815] px-3 py-2 text-sm text-white outline-none focus:border-[#e3bb78]"
                />
                <button
                  type="button"
                  onClick={applyCode}
                  className="rounded-[4px] border border-[#37332c] px-3 text-[10px] font-bold uppercase text-white hover:border-[#e3bb78]"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-red-400">{couponError}</p>}
              {appliedCode && !couponError && (
                <p className="mt-1.5 text-xs text-[#8fbf8f]">Coupon {appliedCode} applied.</p>
              )}
            </div>

            <dl className="space-y-2 border-t border-[#2d2a27] pt-4 text-sm">
              <div className="flex justify-between text-[#b5b0a8]">
                <dt>Subtotal</dt>
                <dd className="text-white">{formatTaka(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#b5b0a8]">
                  <dt>Discount</dt>
                  <dd className="text-[#8fbf8f]">−{formatTaka(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[#b5b0a8]">
                <dt>Shipping</dt>
                <dd className="text-white">{shipping === 0 ? 'Free' : formatTaka(shipping)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold text-white">
                <dt>Total</dt>
                <dd className="text-[#e5c17d]">{formatTaka(total)}</dd>
              </div>
            </dl>

            {!user && (
              <p className="text-[11px] text-[#b5b0a8]">
                <Link href="/login" className="text-[#e3bb78] hover:text-[#eec98a]">
                  Sign in
                </Link>{' '}
                to save this order to your account history.
              </p>
            )}

            {submitError && <p className="text-xs text-red-400">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[4px] border border-[#efc677] bg-[#e5bd79] py-3 text-[11px] font-bold uppercase text-[#18120b] hover:bg-[#eec98a] disabled:opacity-50"
            >
              {submitting ? 'Placing Order…' : 'Place Order'}
            </button>
          </aside>
        </form>
      </section>
    </main>
  );
}
