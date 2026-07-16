import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  rememberMe: boolean;
  hydrated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  rememberMe: true,
  hydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authHydrated: (
      state,
      action: PayloadAction<{
        accessToken: string | null;
        user: AuthUser | null;
        rememberMe: boolean;
      }>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.rememberMe = action.payload.rememberMe;
      state.hydrated = true;
    },
    authenticated: (
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string; rememberMe?: boolean }>,
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      if (action.payload.rememberMe != null) state.rememberMe = action.payload.rememberMe;
    },
    profileUpdated: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    accessTokenRefreshed: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    signedOut: (state) => {
      state.accessToken = null;
      state.user = null;
      state.hydrated = true;
    },
  },
});

export const {
  authHydrated,
  authenticated,
  accessTokenRefreshed,
  profileUpdated,
  signedOut,
} = authSlice.actions;
export default authSlice.reducer;
