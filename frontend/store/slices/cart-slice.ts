import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  quantity: number;
  variantId: string;
  size: string;
  color: string;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

const initialState: CartState = { items: [], hydrated: false };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    cartHydrated: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.hydrated = true;
    },
    itemAdded: (state, action: PayloadAction<CartItem>) => {
      const current = state.items.find(
        (item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId,
      );
      if (current) current.quantity += action.payload.quantity;
      else state.items.push(action.payload);
    },
    itemQuantitySet: (
      state,
      action: PayloadAction<{ productId: string; variantId: string; quantity: number }>,
    ) => {
      const item = state.items.find(
        (entry) =>
          entry.productId === action.payload.productId &&
          entry.variantId === action.payload.variantId,
      );
      if (!item) return;
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter(
          (entry) =>
            !(
              entry.productId === action.payload.productId &&
              entry.variantId === action.payload.variantId
            ),
        );
      } else {
        item.quantity = action.payload.quantity;
      }
    },
    itemRemoved: (
      state,
      action: PayloadAction<{ productId: string; variantId: string }>,
    ) => {
      state.items = state.items.filter(
        (item) =>
          !(
            item.productId === action.payload.productId &&
            item.variantId === action.payload.variantId
          ),
      );
    },
    cartCleared: (state) => {
      state.items = [];
    },
  },
});

export const { cartHydrated, itemAdded, itemQuantitySet, itemRemoved, cartCleared } =
  cartSlice.actions;
export default cartSlice.reducer;

export const selectCartCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
