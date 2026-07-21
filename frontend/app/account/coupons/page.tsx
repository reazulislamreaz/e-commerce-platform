'use client';

import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors';
import { useAccountCoupons } from '@/features/account';
import { AccountPanelSkeleton } from '@/components/common/skeleton';

export default function CouponsPage() {
  const user = useAppSelector(selectAuthUser)!;
  const { data: coupons, loading } = useAccountCoupons(user.id);

  if (loading) {
    return <AccountPanelSkeleton />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-[12px] font-bold uppercase tracking-[.14em] text-[#111111]">Coupons</h2>
      <ul className="space-y-3">
        {coupons.map((coupon) => (
          <li
            key={coupon.id}
            className={`rounded-[4px] border p-4 ${
              coupon.used ? 'border-[#E5E7EB] bg-white opacity-60' : 'border-[#C9A227]/35 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-bold tracking-wide text-[#C9A227]">
                  {coupon.code}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111111]">{coupon.title}</p>
                <p className="mt-1 text-[12px] text-[#555555]">{coupon.description}</p>
                <p className="mt-2 text-[11px] text-[#555555]">Expires {coupon.expiresAt}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#555555]">
                {coupon.used ? 'Used' : 'Available'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
