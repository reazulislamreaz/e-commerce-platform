'use client';

import { useMutation } from '@tanstack/react-query';
import { toast, toastErrorFrom } from '@/lib/toast';
import { useAppDispatch } from '@/store/hooks';
import { authenticated, profileUpdated, signedOut } from '@/store/slices/auth-slice';
import { cartHydrated } from '@/store/slices/cart-slice';
import { wishlistHydrated } from '@/store/slices/wishlist-slice';
import { mergeServerCart, toReduxCartItems } from '@/features/cart/api';
import { mergeWishlist } from '@/features/wishlist/api';
import { readStorage } from '@/lib/storage';
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
import type { LoginInput, RegisterInput } from './schemas';

async function mergeGuestCommerceState(dispatch: ReturnType<typeof useAppDispatch>): Promise<void> {
  try {
    const cart = await mergeServerCart();
    dispatch(cartHydrated(toReduxCartItems(cart)));
  } catch {
    // Guest cart may be empty; ignore merge failures so login still succeeds.
  }

  try {
    const localIds = readStorage<string[]>('wishlist', []);
    const productIds = await mergeWishlist(localIds);
    dispatch(wishlistHydrated(productIds));
  } catch {
    // Ignore wishlist merge failures.
  }
}

export function useLogin() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: async (input: LoginInput & { rememberMe?: boolean }) => {
      const rememberMe = input.rememberMe ?? true;
      // rememberMe also goes to the backend: it extends the refresh session TTL.
      const result = await login({ ...input, rememberMe });
      return { ...result, rememberMe };
    },
    onSuccess: async (result) => {
      dispatch(
        authenticated({
          user: result.user,
          accessToken: result.accessToken,
          rememberMe: result.rememberMe,
        }),
      );
      await mergeGuestCommerceState(dispatch);
      toast.success('Signed in successfully.', { dedupeKey: 'auth:login' });
    },
  });
}

export function useRegister() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await register(input);
      // Sign in immediately so the shopper lands authenticated after signup.
      const rememberMe = true;
      const result = await login({
        email: input.email,
        password: input.password,
        rememberMe,
      });
      return { ...result, rememberMe };
    },
    onSuccess: async (result) => {
      dispatch(
        authenticated({
          user: result.user,
          accessToken: result.accessToken,
          rememberMe: result.rememberMe,
        }),
      );
      await mergeGuestCommerceState(dispatch);
      toast.success('Account created. Welcome!', { dedupeKey: 'auth:register' });
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      toast.success('Email verified. You can sign in now.', { dedupeKey: 'auth:verify' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't verify your email right now. Please try again in a moment.",
        'auth:verify-error',
      );
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: resendVerification,
    onSuccess: () => {
      toast.success('Verification email sent.', { dedupeKey: 'auth:resend' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't resend the verification email. Please try again in a moment.",
        'auth:resend-error',
      );
    },
  });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast.info('Signed out.', { dedupeKey: 'auth:logout' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't sign you out right now. Please try again.",
        'auth:logout-error',
      );
    },
    onSettled: () => dispatch(signedOut()),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.success('Password reset link sent. Check your email.', { dedupeKey: 'auth:forgot' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't send a reset link right now. Please try again in a moment.",
        'auth:forgot-error',
      );
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success('Password updated. You can sign in now.', { dedupeKey: 'auth:reset' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't reset your password right now. Please try again in a moment.",
        'auth:reset-error',
      );
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success('Password updated. Other devices have been signed out.', {
        dedupeKey: 'auth:password',
      });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't update your password right now. Please try again in a moment.",
        'auth:password-error',
      );
    },
  });
}

export function useUpdateProfile() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      dispatch(
        profileUpdated({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
        }),
      );
      toast.success('Profile updated.', { dedupeKey: 'auth:profile' });
    },
    onError: (error) => {
      toastErrorFrom(
        error,
        "We couldn't update your profile right now. Please try again in a moment.",
        'auth:profile-error',
      );
    },
  });
}
