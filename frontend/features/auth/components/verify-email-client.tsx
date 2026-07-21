'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useVerifyEmail } from '@/features/auth/hooks';
import { getUserFacingErrorMessage, USER_FACING_ERRORS } from '@/lib/user-facing-error';

export function VerifyEmailClient() {
  const token = useSearchParams().get('token');
  const verify = useVerifyEmail();
  const { mutate } = verify;

  useEffect(() => {
    if (token) mutate(token);
  }, [token, mutate]);

  if (!token || verify.isError) {
    const message = token
      ? getUserFacingErrorMessage(verify.error, USER_FACING_ERRORS.VERIFICATION_LINK)
      : USER_FACING_ERRORS.VERIFICATION_LINK;
    return (
      <div className="space-y-5 text-center" role="alert">
        <XCircle aria-hidden className="mx-auto size-12 text-red-600" strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold uppercase tracking-[-.02em] text-[#111111]">
            We couldn&apos;t verify your email
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#555555]">{message}</p>
        </div>
        <p className="text-sm text-[#555555]">
          Request a new link from the{' '}
          <Link
            href="/register"
            className="font-semibold text-[#C9A227] transition-colors hover:text-[#D4B03A]"
          >
            registration page
          </Link>{' '}
          or{' '}
          <Link
            href="/login"
            className="font-semibold text-[#C9A227] transition-colors hover:text-[#D4B03A]"
          >
            sign in
          </Link>{' '}
          if your account is already verified.
        </p>
      </div>
    );
  }

  if (verify.isSuccess) {
    return (
      <div className="space-y-5 text-center" role="status">
        <CheckCircle2 aria-hidden className="mx-auto size-12 text-[#C9A227]" strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold uppercase tracking-[-.02em] text-[#111111]">
            Email verified
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#555555]">
            Your account is now active. Sign in to start shopping.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block w-full rounded-[4px] border border-[#111111] bg-[#111111] py-3 text-center text-xs font-bold uppercase tracking-[.08em] text-white transition-colors hover:border-[#C9A227] hover:bg-[#C9A227] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A227]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center" role="status">
      <Loader2 aria-hidden className="mx-auto size-10 animate-spin text-[#C9A227]" />
      <p className="text-sm text-[#555555]">Verifying your email address…</p>
    </div>
  );
}
