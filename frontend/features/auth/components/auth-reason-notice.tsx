'use client';

import { useSearchParams } from 'next/navigation';
import { authPromptMessage } from '@/lib/auth-redirect';

/**
 * Soft info banner shown above the login/register forms when a guest was
 * redirected from a protected feature (via `?reason=` / `?next=`), so the
 * reason for signing in is always clear. Renders nothing for direct visits.
 * Must be used inside a Suspense boundary (both auth forms already provide one).
 */
export function AuthReasonNotice() {
  const params = useSearchParams();
  const message = authPromptMessage(params.get('reason'), params.get('next'));
  if (!message) return null;

  return (
    <p
      role="status"
      className="mb-5 rounded-[4px] border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-700"
    >
      {message}
    </p>
  );
}
