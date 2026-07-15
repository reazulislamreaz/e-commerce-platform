import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/types/auth';
interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
}
const initialState: AuthState = { accessToken: null, user: null };
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authenticated: (_, action: PayloadAction<{ user: AuthUser; accessToken: string }>) =>
      action.payload,
    signedOut: () => initialState,
  },
});
export const { authenticated, signedOut } = authSlice.actions;
export default authSlice.reducer;
