import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  retailer?: string;
  category?: string;
}

interface ProductState {
  products: Product[];
  searchResults: Product[];
  selectedProduct: Product | null;
  loading: boolean;
}

const initialState: ProductState = {
  products: [],
  searchResults: [],
  selectedProduct: null,
  loading: false,
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<Product[]>) => {
      state.searchResults = action.payload;
    },
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setProducts, setSearchResults, setSelectedProduct, setLoading } = productSlice.actions;
export default productSlice.reducer;

