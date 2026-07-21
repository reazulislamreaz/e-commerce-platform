import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

/** Extracts the API's message from a failed admin mutation, with a safe fallback. */
export function mutationErrorMessage(error: unknown, fallback: string): string {
  return getUserFacingErrorMessage(error, fallback);
}
