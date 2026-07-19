import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmailClient } from '@/features/auth/components/verify-email-client';
import { AuthFormSkeleton } from '@/components/common/skeleton';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Confirm your email address to activate your Elevate Apparel account.',
  robots: { index: false },
};

export default function VerifyEmailPage() {
  return (
    <>
      <p className="text-center text-[11px] font-semibold uppercase tracking-[.18em] text-[#e0bd7d]">
        Account verification
      </p>
      <div className="mt-6">
        <Suspense fallback={<AuthFormSkeleton />}>
          <VerifyEmailClient />
        </Suspense>
      </div>
    </>
  );
}
