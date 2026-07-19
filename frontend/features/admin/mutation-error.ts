import axios from 'axios';

/** Extracts the API's message from a failed admin mutation, with a safe fallback. */
export function mutationErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
