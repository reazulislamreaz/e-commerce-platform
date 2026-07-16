import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface WishlistState {
  productIds: string[];
  hydrated: boolean;
}

const initialState: WishlistState = { productIds: [], hydrated: false };

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    wishlistHydrated: (state, action: PayloadAction<string[]>) => {
      state.productIds = action.payload;
      state.hydrated = true;
    },
    wishlistToggled: (state, action: PayloadAction<string>) => {
      const exists = state.productIds.includes(action.payload);
      state.productIds = exists
        ? state.productIds.filter((id) => id !== action.payload)
        : [...state.productIds, action.payload];
    },
    wishlistRemoved: (state, action: PayloadAction<string>) => {
      state.productIds = state.productIds.filter((id) => id !== action.payload);
    },
    wishlistCleared: (state) => {
      state.productIds = [];
    },
  },
});

export const { wishlistHydrated, wishlistToggled, wishlistRemoved, wishlistCleared } =
  wishlistSlice.actions;
export default wishlistSlice.reducer;
