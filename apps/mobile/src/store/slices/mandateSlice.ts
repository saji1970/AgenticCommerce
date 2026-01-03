import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IntentMandate, CartMandate, PaymentMandate, PriceRule } from '../../types';

interface MandateState {
  intentMandates: IntentMandate[];
  cartMandates: CartMandate[];
  paymentMandates: PaymentMandate[];
  priceRules: PriceRule[];
}

const initialState: MandateState = {
  intentMandates: [],
  cartMandates: [],
  paymentMandates: [],
  priceRules: [],
};

const mandateSlice = createSlice({
  name: 'mandates',
  initialState,
  reducers: {
    setIntentMandates: (state, action: PayloadAction<IntentMandate[]>) => {
      state.intentMandates = action.payload;
    },
    addIntentMandate: (state, action: PayloadAction<IntentMandate>) => {
      state.intentMandates.push(action.payload);
    },
    setCartMandates: (state, action: PayloadAction<CartMandate[]>) => {
      state.cartMandates = action.payload;
    },
    addCartMandate: (state, action: PayloadAction<CartMandate>) => {
      state.cartMandates.push(action.payload);
    },
    setPaymentMandates: (state, action: PayloadAction<PaymentMandate[]>) => {
      state.paymentMandates = action.payload;
    },
    addPaymentMandate: (state, action: PayloadAction<PaymentMandate>) => {
      state.paymentMandates.push(action.payload);
    },
    setPriceRules: (state, action: PayloadAction<PriceRule[]>) => {
      state.priceRules = action.payload;
    },
    addPriceRule: (state, action: PayloadAction<PriceRule>) => {
      state.priceRules.push(action.payload);
    },
    removePriceRule: (state, action: PayloadAction<string>) => {
      state.priceRules = state.priceRules.filter((rule) => rule.id !== action.payload);
    },
  },
});

export const {
  setIntentMandates,
  addIntentMandate,
  setCartMandates,
  addCartMandate,
  setPaymentMandates,
  addPaymentMandate,
  setPriceRules,
  addPriceRule,
  removePriceRule,
} = mandateSlice.actions;
export default mandateSlice.reducer;

