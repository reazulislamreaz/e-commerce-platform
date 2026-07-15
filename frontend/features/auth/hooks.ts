'use client';
import { useMutation } from '@tanstack/react-query';
import { useAppDispatch } from '@/store/hooks';
import { authenticated } from '@/store/slices/auth-slice';
import { login } from './api';
export function useLogin() {
  const dispatch = useAppDispatch();
  return useMutation({ mutationFn: login, onSuccess: (result) => dispatch(authenticated(result)) });
}
