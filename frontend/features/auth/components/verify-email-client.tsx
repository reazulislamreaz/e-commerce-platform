'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useVerifyEmail } from '@/features/auth/hooks';

export function VerifyEmailClient() {
  const token = useSearchParams().get('token');
  const verify = useVerifyEmail();
  const { mutate } = verify;

  useEffect(() => {
    if (token) mutate(token);
  }, [token, mutate]);

  if (!token || verify.isError) {
    const message =
      token &&
      axios.isAxiosError<{ message?: string }>(verify.error) &&
      verify.error.response?.status === 400
        ? (verify.error.response.data.message ?? 'Verification link is invalid or has expired.')
        : 'Verification link is invalid or has expired.';
    return (
      <div className="space-y-5 text-center" role="alert">
        <XCircle aria-hidden className="mx-auto size-12 text-red-400" strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold uppercase tracking-[-.02em] text-white">
            Verification failed
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#b5b0a8]">{message}</p>
        </div>
        <p className="text-sm text-[#b5b0a8]">
          Request a new link from the{' '}
          <Link
            href="/register"
            className="font-semibold text-[#e3bb78] transition-colors hover:text-[#eec98a]"
          >
            registration page
          </Link>{' '}
          or{' '}
          <Link
            href="/login"
            className="font-semibold text-[#e3bb78] transition-colors hover:text-[#eec98a]"
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
        <CheckCircle2 aria-hidden className="mx-auto size-12 text-[#e3bb78]" strokeWidth={1.5} />
        <div>
          <h2 className="text-xl font-bold uppercase tracking-[-.02em] text-white">
            Email verified
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#b5b0a8]">
            Your account is now active. Sign in to start shopping.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block w-full rounded-[4px] bg-[#e5bd78] py-3 text-center text-xs font-bold uppercase tracking-[.08em] text-[#18120b] transition-colors hover:bg-[#eec98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3bb78]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center" role="status">
      <Loader2 aria-hidden className="mx-auto size-10 animate-spin text-[#e3bb78]" />
      <p className="text-sm text-[#b5b0a8]">Verifying your email address…</p>
    </div>
  );
}
