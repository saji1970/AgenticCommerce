import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './slices/chatSlice';
import mandateReducer from './slices/mandateSlice';
import productReducer from './slices/productSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    mandates: mandateReducer,
    products: productReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

