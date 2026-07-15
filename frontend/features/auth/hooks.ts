'use client';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { authenticated, signedOut } from '@/store/slices/auth-slice';
import { login, logout, register } from './api';

export function useLogin() {
  const dispatch = useAppDispatch();
  return useMutation({ mutationFn: login, onSuccess: (result) => dispatch(authenticated(result)) });
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
