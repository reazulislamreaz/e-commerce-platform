import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface RecentlyViewedState {
  productIds: string[];
  hydrated: boolean;
}

const initialState: RecentlyViewedState = { productIds: [], hydrated: false };
const MAX = 12;

const recentlyViewedSlice = createSlice({
  name: 'recentlyViewed',
  initialState,
  reducers: {
    recentlyViewedHydrated: (state, action: PayloadAction<string[]>) => {
      state.productIds = action.payload;
      state.hydrated = true;
    },
    productViewed: (state, action: PayloadAction<string>) => {
      state.productIds = [
        action.payload,
        ...state.productIds.filter((id) => id !== action.payload),
      ].slice(0, MAX);
    },
  },
});

export const { recentlyViewedHydrated, productViewed } = recentlyViewedSlice.actions;
export default recentlyViewedSlice.reducer;
