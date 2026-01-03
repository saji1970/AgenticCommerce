import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product } from '../../types';

interface ProductState {
  searchResults: Product[];
  comparisonResults: Product[];
  isLoading: boolean;
}

const initialState: ProductState = {
  searchResults: [],
  comparisonResults: [],
  isLoading: false,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSearchResults: (state, action: PayloadAction<Product[]>) => {
      state.searchResults = action.payload;
    },
    setComparisonResults: (state, action: PayloadAction<Product[]>) => {
      state.comparisonResults = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearResults: (state) => {
      state.searchResults = [];
      state.comparisonResults = [];
    },
  },
});

export const { setSearchResults, setComparisonResults, setLoading, clearResults } = productSlice.actions;
export default productSlice.reducer;

