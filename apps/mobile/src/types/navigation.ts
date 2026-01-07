export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ProductsStackParamList = {
  ProductSearch: undefined;
  ProductList: { searchQueryId: string };
  ProductDetails: { productId: string };
};

export type AppStackParamList = {
  Home: undefined;
  Products: undefined;
  Profile: undefined;
  EditProfile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
