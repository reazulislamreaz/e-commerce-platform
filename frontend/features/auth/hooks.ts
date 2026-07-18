'use client';

import { useMutation } from '@tanstack/react-query';
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
import type { LoginInput } from './schemas';

async function mergeGuestCommerceState(
  dispatch: ReturnType<typeof useAppDispatch>,
): Promise<void> {
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
    },
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
