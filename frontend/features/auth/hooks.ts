'use client';

import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { authenticated, profileUpdated, signedOut } from '@/store/slices/auth-slice';
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  updateProfile,
  verifyEmail,
} from './api';
import type { LoginInput } from './schemas';

export function useLogin() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: async (input: LoginInput & { rememberMe?: boolean }) => {
      const rememberMe = input.rememberMe ?? true;
      // rememberMe also goes to the backend: it extends the refresh session TTL.
      const result = await login({ ...input, rememberMe });
      return { ...result, rememberMe };
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

export function useVerifyEmail() {
  return useMutation({ mutationFn: verifyEmail });
}

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: logout,
    onSettled: () => dispatch(signedOut()),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useUpdateProfile() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) =>
      dispatch(
        profileUpdated({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        }),
      ),
  });
}
