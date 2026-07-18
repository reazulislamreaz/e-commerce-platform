'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  accountRepository,
  type CustomerOrder,
  type SavedAddress,
} from '@/features/account';
import { useProductsByIds } from '@/features/products';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(80),
  phone: z.string().min(10, 'Enter a valid phone number').max(20),
  email: z.email(),
  line1: z.string().min(3, 'Address is required').max(120),
  line2: z.string().max(120).optional(),
  city: z.string().min(2).max(80),
  district: z.string().min(2).max(80),
  postalCode: z.string().min(3).max(20),
  paymentMethod: z.enum(['cod', 'bkash', 'card']),
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
  const [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lines = useMemo(
    () => resolveCartLines(items, products.data ?? []),
    [items, products.data],
  );

  const subtotal = cartSubtotal(lines);
  const shipping = shippingForSubtotal(subtotal, appliedCode === 'FREESHIP');
  const total = Math.max(0, subtotal - discount) + shipping;

  const {
    register,
    handleSubmit,
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
    const coupons = await accountRepository.getCoupons(user.id);
    const result = accountRepository.applyCoupon(couponCode, subtotal, coupons);
    if (result.error) {
      setCouponError(result.error);
      setDiscount(0);
      setAppliedCode(undefined);
      return;
    }
    setCouponError(null);
    setDiscount(result.discount);
    setAppliedCode(result.coupon?.code);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (lines.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const stamp = crypto.randomUUID();
      const address: SavedAddress = {
        id: `addr-${stamp}`,
        label: 'Checkout',
        fullName: values.fullName,
        phone: values.phone,
        line1: values.line1,
        line2: values.line2,
        city: values.city,
        district: values.district,
        postalCode: values.postalCode,
        country: 'Bangladesh',
        isDefault: true,
        type: 'shipping',
      };

      const now = new Date().toISOString();
      const order: CustomerOrder = {
        id: `ord-${stamp}`,
        number: accountRepository.createOrderNumber(),
        createdAt: now,
        status: 'confirmed',
        items: lines.map(({ item, product }) => ({
          productId: product.id,
          name: product.name,
          slug: product.slug,
          image: product.image,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: product.price,
        })),
        subtotal,
        shipping,
        discount,
        total,
        couponCode: appliedCode,
        shippingAddress: address,
        paymentMethod: values.paymentMethod,
        trackingNumber: `TRK${stamp.replace(/-/g, '').slice(0, 10).toUpperCase()}`,
        timeline: [
          { label: 'Order placed', at: now, done: true },
          { label: 'Confirmed', at: now, done: true },
          { label: 'Processing', at: '', done: false },
          { label: 'Shipped', at: '', done: false },
          { label: 'Delivered', at: '', done: false },
        ],
      };

      await accountRepository.placeOrder(user?.id ?? null, order);

      if (user && appliedCode) {
        const coupons = await accountRepository.getCoupons(user.id);
        await accountRepository.saveCoupons(
          user.id,
          coupons.map((c) => (c.code === appliedCode ? { ...c, used: true } : c)),
        );
      }

      dispatch(cartCleared());

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
    } catch {
      setSubmitError('Could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  });

  if (!cartHydrated || (items.length > 0 && products.isLoading)) {
    return (
      <main className="flex flex-1 items-center justify-center bg-black px-5 py-20">
        <p className="text-sm text-[#b5b0a8]">Loading checkout…</p>
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
                <FormField label="Email" type="email" error={errors.email?.message} {...register('email')} />
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
            </div>

            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">
                Payment Method
              </h2>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ['cod', 'Cash on Delivery'],
                    ['bkash', 'bKash'],
                    ['card', 'Card / Online Banking'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[#37332c] px-3 py-2.5 text-sm text-[#e9e5de]"
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register('paymentMethod')}
                      className="accent-[#e5bd79]"
                    />
                    {label}
                  </label>
                ))}
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
