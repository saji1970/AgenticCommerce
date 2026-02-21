export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ProductsStackParamList = {
  ProductList: { searchQueryId?: string } | undefined;
  ProductDetails: { productId: string };
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
  OrderHistory: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PaymentMethods: undefined;
  MandateManagement: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Products: undefined;
  Intents: undefined;
  Cart: undefined;
  Profile: undefined;
  EditProfile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
