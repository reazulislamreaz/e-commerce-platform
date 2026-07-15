import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
export interface CartItem {
  productId: string;
  quantity: number;
  variantId?: string;
}
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] as CartItem[] },
  reducers: {
    itemAdded: (state, action: PayloadAction<CartItem>) => {
      const current = state.items.find(
        (item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId,
      );
      if (current) current.quantity += action.payload.quantity;
      else state.items.push(action.payload);
    },
    itemRemoved: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    cartCleared: (state) => {
      state.items = [];
    },
  },
});
export const { itemAdded, itemRemoved, cartCleared } = cartSlice.actions;
export default cartSlice.reducer;
