import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/auth-slice';
import cart from './slices/cart-slice';
export const makeStore = () => configureStore({ reducer: { auth, cart } });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
