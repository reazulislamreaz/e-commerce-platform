'use client';

import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { useAccountCoupons } from '@/features/account';

export default function CouponsPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: coupons, loading } = useAccountCoupons(user.id);

  if (loading) {
    return <p className="text-sm text-[#b5b0a8]">Loading coupons…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-white">Coupons</h2>
      <ul className="space-y-3">
        {coupons.map((coupon) => (
          <li
            key={coupon.id}
            className={`rounded-[4px] border p-4 ${
              coupon.used
                ? 'border-[#2d2a27] bg-[#111110] opacity-60'
                : 'border-[#e3bb78]/35 bg-[#111110]'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold tracking-wide text-[#e3bb78]">
                  {coupon.code}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{coupon.title}</p>
                <p className="mt-1 text-[12px] text-[#b5b0a8]">{coupon.description}</p>
                <p className="mt-2 text-[11px] text-[#8b867d]">Expires {coupon.expiresAt}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#b5b0a8]">
                {coupon.used ? 'Used' : 'Available'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
