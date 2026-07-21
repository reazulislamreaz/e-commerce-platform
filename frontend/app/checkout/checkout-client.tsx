'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast, toastErrorFrom, toastFromError } from '@/lib/toast';
import { USER_FACING_ERRORS } from '@/lib/user-facing-error';
import { FormField } from '@/components/common/form-field';
import { formatTaka } from '@/lib/currency';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { cartCleared } from '@/store/slices/cart-slice';
import { selectAuthUser, selectCartHydrated, selectCartItems } from '@/store/selectors';
import { cartSubtotal, resolveCartLines, shippingForSubtotal } from '@/features/cart/pricing';
import { accountRepository, useAccountAddresses, type SavedAddress } from '@/features/account';
import { useProductsByIds } from '@/features/products';
import { trackInitiateCheckout, trackPurchase } from '@/features/analytics/facebook-pixel';
import { setCartRecoveryEmail } from '@/features/cart/api';
import { createClientId } from '@/lib/client-id';

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

function addressFields(
  address: SavedAddress,
): Pick<
  CheckoutInput,
  'fullName' | 'phone' | 'line1' | 'line2' | 'city' | 'district' | 'postalCode'
> {
  return {
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    district: address.district,
    postalCode: address.postalCode,
  };
}

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
  const { data: savedAddresses } = useAccountAddresses(user?.id);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [shippingWaived, setShippingWaived] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, setCouponPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => createClientId());
  const defaultAddressApplied = useRef(false);
  const lastCouponSubtotal = useRef<number | null>(null);

  const lines = useMemo(() => resolveCartLines(items, products.data ?? []), [items, products.data]);
  const checkoutTracked = useRef(false);

  const subtotal = cartSubtotal(lines);
  const shipping = shippingForSubtotal(subtotal, shippingWaived);
  const total = Math.max(0, subtotal - discount) + shipping;

  const shippingAddresses = useMemo(
    () =>
      [...savedAddresses]
        .filter((address) => address.type !== 'billing')
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    [savedAddresses],
  );

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
    reset,
    setValue,
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

  useEffect(() => {
    if (!user || defaultAddressApplied.current || shippingAddresses.length === 0) return;
    const preferred =
      shippingAddresses.find((address) => address.isDefault) ?? shippingAddresses[0];
    defaultAddressApplied.current = true;
    setSelectedAddressId(preferred.id);
    const fields = addressFields(preferred);
    (Object.keys(fields) as (keyof typeof fields)[]).forEach((key) => {
      setValue(key, fields[key], { shouldDirty: false, shouldValidate: false });
    });
  }, [user, shippingAddresses, setValue]);

  useEffect(() => {
    if (!appliedCode) {
      lastCouponSubtotal.current = null;
      return;
    }
    if (lastCouponSubtotal.current === null) {
      lastCouponSubtotal.current = subtotal;
      return;
    }
    if (lastCouponSubtotal.current !== subtotal) {
      if (appliedCode) {
        toast.info('Coupon removed because your bag total changed.', {
          dedupeKey: 'checkout:coupon-removed',
        });
      }
      setDiscount(0);
      setShippingWaived(false);
      setAppliedCode(undefined);
      setCouponError(null);
      lastCouponSubtotal.current = null;
    }
  }, [subtotal, appliedCode]);

  const applySavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    const fields = addressFields(address);
    reset({
      ...getValues(),
      ...fields,
      email: getValues('email') || user?.email || '',
      paymentMethod: 'cod',
    });
  };

  const applyCode = async () => {
    if (!user) {
      const message = 'Please log in to use a coupon code.';
      setCouponError(message);
      toast.warning(message, { dedupeKey: 'checkout:coupon-auth' });
      return;
    }
    setCouponPending(true);
    setCouponError(null);
    try {
      const result = await accountRepository.validateCoupon(couponCode, subtotal);
      setDiscount(result.discount);
      setShippingWaived(result.shippingWaived);
      setAppliedCode(result.code);
      lastCouponSubtotal.current = subtotal;
      toast.success(`Coupon ${result.code} applied.`, { dedupeKey: 'checkout:coupon-apply' });
    } catch (error: unknown) {
      const message = toastFromError(
        error,
        'This coupon code is invalid or has expired. Please check the code and try again.',
      );
      setCouponError(message);
      setDiscount(0);
      setShippingWaived(false);
      setAppliedCode(undefined);
      lastCouponSubtotal.current = null;
      toast.error(message, { dedupeKey: 'checkout:coupon-error' });
    } finally {
      setCouponPending(false);
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
      setIdempotencyKey(createClientId());
      toast.success(`Order #${order.number} placed successfully.`, {
        dedupeKey: `checkout:order:${order.id}`,
      });

      if (user) {
        router.push(`/account/orders/${order.id}?confirmed=1`);
        return;
      }

      try {
        sessionStorage.setItem('elevate:lastOrder', JSON.stringify(order));
      } catch {
        // ignore quota errors
      }
      const params = new URLSearchParams({ order: order.number });
      if (values.email) params.set('email', values.email);
      router.push(`/order-confirmation?${params.toString()}`);
    } catch (error: unknown) {
      const message = toastFromError(error, USER_FACING_ERRORS.ORDER_FAILED);
      setSubmitError(message);
      toastErrorFrom(error, message, 'checkout:order-error');
    } finally {
      setSubmitting(false);
    }
  });

  if (!cartHydrated || (items.length > 0 && products.isLoading && !products.data)) {
    return (
      <main id="main-content" className="flex-1 bg-[#FAFAFA]" aria-busy="true">
        <section className="mx-auto max-w-[1400px] space-y-4 px-5 py-10 sm:px-7">
          <div className="h-3 w-28 animate-pulse rounded-[4px] bg-white" />
          <div className="h-9 w-56 animate-pulse rounded-[4px] bg-white" />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-[4px] border border-[#E5E7EB] bg-white" />
            <div className="h-72 animate-pulse rounded-[4px] border border-[#E5E7EB] bg-white" />
          </div>
        </section>
      </main>
    );
  }

  if (items.length > 0 && products.isError) {
    return (
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] px-5 py-20 text-center"
      >
        <h1 className="text-2xl font-extrabold text-[#111111]">Could not load your bag</h1>
        <p className="mt-3 max-w-sm text-sm text-[#555555]" role="alert">
          We couldn&apos;t load product details for checkout. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void products.refetch()}
          className="mt-8 border border-[#111111] bg-[#111111] px-6 py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111]"
        >
          Try Again
        </button>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#FAFAFA] px-5 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-[#111111]">Nothing to checkout</h1>
        <Link href="/shop" className="mt-6 text-[11px] font-bold uppercase text-[#C9A227]">
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex-1 bg-[#FAFAFA]">
      <section className="mx-auto max-w-[1400px] px-5 py-8 sm:px-7 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#C9A227]">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em] text-[#111111]">
          SHIPPING & PAYMENT
        </h1>

        <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 rounded-[4px] border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
              Shipping Information
            </h2>

            {user && shippingAddresses.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#555555]">
                    Saved addresses
                  </p>
                  <Link
                    href="/account/addresses"
                    className="text-[10px] font-semibold uppercase text-[#C9A227] hover:text-[#D4B03A]"
                  >
                    Manage
                  </Link>
                </div>
                <ul className="space-y-2" role="listbox" aria-label="Saved shipping addresses">
                  {shippingAddresses.map((address) => {
                    const selected = selectedAddressId === address.id;
                    return (
                      <li key={address.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => applySavedAddress(address)}
                          className={`w-full rounded-[4px] border px-3 py-2.5 text-left transition-colors ${
                            selected
                              ? 'border-[#C9A227] bg-white'
                              : 'border-[#E5E7EB] hover:border-[#C9A227]'
                          }`}
                        >
                          <p className="text-[12px] font-semibold text-[#111111]">
                            {address.label}
                            {address.isDefault ? (
                              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-[#C9A227]">
                                Default
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#555555]">
                            {address.fullName} · {address.line1}, {address.city}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] text-[#555555]">
                  Select an address to fill the form, or edit the fields below.
                </p>
              </div>
            )}

            {user && shippingAddresses.length === 0 && (
              <p className="rounded-[4px] border border-dashed border-[#E5E7EB] px-3 py-2.5 text-[12px] text-[#555555]">
                No saved addresses yet.{' '}
                <Link href="/account/addresses" className="text-[#C9A227] hover:text-[#D4B03A]">
                  Add one in your account
                </Link>{' '}
                for faster checkout next time.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Full name"
                error={errors.fullName?.message}
                {...register('fullName')}
              />
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
                <FormField
                  label="Address line 1"
                  error={errors.line1?.message}
                  {...register('line1')}
                />
              </div>
              <div className="sm:col-span-2">
                <FormField label="Address line 2 (optional)" {...register('line2')} />
              </div>
              <FormField label="City" error={errors.city?.message} {...register('city')} />
              <FormField
                label="District"
                error={errors.district?.message}
                {...register('district')}
              />
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
              <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
                Payment Method
              </h2>
              <div className="mt-3 space-y-2">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#555555]">
                  <input
                    type="radio"
                    value="cod"
                    {...register('paymentMethod')}
                    className="accent-[#C9A227]"
                  />
                  Cash on Delivery
                </label>
                <p className="rounded-[4px] border border-dashed border-[#E5E7EB] px-3 py-2.5 text-xs text-[#555555]">
                  bKash and card payments are coming soon.
                </p>
              </div>
            </div>
          </div>

          <aside className="h-fit space-y-4 rounded-[4px] border border-[#E5E7EB] bg-white p-5">
            <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">
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
                    <p className="truncate font-medium text-[#111111]">{product.name}</p>
                    <p className="text-[#555555]">
                      {item.color} / {item.size} × {item.quantity}
                    </p>
                    <p className="text-[#C9A227]">{formatTaka(product.price * item.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-[#E5E7EB] pt-4">
              <label
                htmlFor="checkout-coupon"
                className="text-[11px] font-semibold uppercase tracking-wide text-[#555555]"
              >
                Coupon
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="checkout-coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="ELEVATE10"
                  disabled={couponPending}
                  className="w-full rounded-[4px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111111] outline-none focus:border-[#C9A227] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void applyCode()}
                  disabled={couponPending || !couponCode.trim()}
                  className="rounded-[4px] border border-[#E5E7EB] px-3 text-[10px] font-bold uppercase text-[#111111] hover:border-[#C9A227] disabled:opacity-50"
                >
                  {couponPending ? 'Applying…' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="mt-1.5 text-xs text-red-600">{couponError}</p>}
              {appliedCode && !couponError && (
                <p className="mt-1.5 text-xs text-green-700">Coupon {appliedCode} applied.</p>
              )}
              {!user && (
                <p className="mt-1.5 text-[11px] text-[#555555]">
                  <Link href="/login" className="text-[#C9A227] hover:text-[#D4B03A]">
                    Sign in
                  </Link>{' '}
                  to use coupons.
                </p>
              )}
            </div>

            <dl className="space-y-2 border-t border-[#E5E7EB] pt-4 text-sm">
              <div className="flex justify-between text-[#555555]">
                <dt>Subtotal</dt>
                <dd className="text-[#111111]">{formatTaka(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#555555]">
                  <dt>Discount</dt>
                  <dd className="text-green-700">−{formatTaka(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[#555555]">
                <dt>Shipping</dt>
                <dd className="text-[#111111]">{shipping === 0 ? 'Free' : formatTaka(shipping)}</dd>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold text-[#111111]">
                <dt>Total</dt>
                <dd className="text-[#C9A227]">{formatTaka(total)}</dd>
              </div>
            </dl>

            {!user && (
              <p className="text-[11px] text-[#555555]">
                <Link href="/login" className="text-[#C9A227] hover:text-[#D4B03A]">
                  Sign in
                </Link>{' '}
                to save this order to your account history.
              </p>
            )}

            {submitError && <p className="text-xs text-red-600">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-[11px] font-bold uppercase text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] disabled:opacity-50"
            >
              {submitting ? 'Placing Order…' : 'Place Order'}
            </button>
          </aside>
        </form>
      </section>
    </main>
  );
}
