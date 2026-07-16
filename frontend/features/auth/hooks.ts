'use client';

import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { authenticated, signedOut } from '@/store/slices/auth-slice';
import { login, logout, register } from './api';
import type { LoginInput } from './schemas';

export function useLogin() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: async (input: LoginInput & { rememberMe?: boolean }) => {
      const { rememberMe, ...credentials } = input;
      const result = await login(credentials);
      return { ...result, rememberMe: rememberMe ?? true };
    },
    onSuccess: (result) =>
      dispatch(
        authenticated({
          user: result.user,
          accessToken: result.accessToken,
          rememberMe: result.rememberMe,
        }),
      ),
  });
}

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: logout,
    onSettled: () => dispatch(signedOut()),
  });
}
