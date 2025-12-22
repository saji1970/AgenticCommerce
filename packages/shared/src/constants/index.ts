export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  AGENT: {
    CHAT: '/agent/chat',
    SEARCH: '/agent/search',
    COMPARE: '/agent/compare',
    SESSIONS: '/agent/sessions',
    SESSION: (id: string) => `/agent/sessions/${id}`,
  },
  PRODUCTS: {
    SEARCH: '/products/search',
    GET: (id: string) => `/products/${id}`,
    REVIEWS: (id: string) => `/products/${id}/reviews`,
    PRICE_HISTORY: (id: string) => `/products/${id}/price-history`,
  },
  PAYMENTS: {
    SETUP_INTENT: '/payments/setup-intent',
    PAYMENT_INTENT: '/payments/payment-intent',
    CONFIRM: '/payments/confirm',
    METHODS: '/payments/methods',
    DELETE_METHOD: (id: string) => `/payments/methods/${id}`,
    HISTORY: '/payments/history',
  },
  USERS: {
    PROFILE: '/users/profile',
    PREFERENCES: '/users/preferences',
    PURCHASE_HISTORY: '/users/purchase-history',
  },
};

export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

export const SHOPPING_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Books',
  'Toys & Games',
  'Health & Beauty',
  'Automotive',
  'Food & Grocery',
  'Office Supplies',
] as const;
