-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories TEXT[],
    preferred_retailers TEXT[],
    excluded_retailers TEXT[],
    budget_daily DECIMAL(10,2),
    budget_weekly DECIMAL(10,2),
    budget_monthly DECIMAL(10,2),
    price_alerts BOOLEAN DEFAULT false,
    favorite_brands TEXT[],
    max_shipping_cost DECIMAL(10,2),
    prefer_free_shipping BOOLEAN DEFAULT true,
    max_delivery_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retailers/Stores
CREATE TABLE IF NOT EXISTS retailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    trust_score DECIMAL(3,2) DEFAULT 0,
    return_policy TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store locations
CREATE TABLE IF NOT EXISTS store_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    name VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone VARCHAR(50),
    hours TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_store_locations_coords
    ON store_locations USING GIST (
        ll_to_earth(latitude, longitude)
    );

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255),
    retailer_id UUID REFERENCES retailers(id),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    image_urls TEXT[],
    category VARCHAR(100),
    brand VARCHAR(100),
    specifications JSONB,
    in_stock BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    restock_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product availability by location
CREATE TABLE IF NOT EXISTS product_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
    in_stock BOOLEAN DEFAULT true,
    quantity INTEGER,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, store_location_id)
);

-- Product reviews
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store/Retailer reviews
CREATE TABLE IF NOT EXISTS retailer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    store_location_id UUID REFERENCES store_locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    aspects JSONB, -- {"service": 5, "cleanliness": 4, "availability": 5}
    verified_customer BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    images TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review helpfulness tracking
CREATE TABLE IF NOT EXISTS review_helpfulness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL,
    review_type VARCHAR(50) NOT NULL, -- 'product' or 'retailer'
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(review_id, review_type, user_id)
);

-- Agent sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent messages
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address JSONB,
    payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name VARCHAR(500),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    retailer_id UUID REFERENCES retailers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    last4 VARCHAR(4),
    brand VARCHAR(50),
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    gateway_payment_method_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price history
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_retailer ON products(retailer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_retailer_reviews_retailer ON retailer_reviews(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_reviews_location ON retailer_reviews(store_location_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in km
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- AP2 (Agent Payments Protocol) Tables
-- ============================================================================

-- Intent Mandates
CREATE TABLE IF NOT EXISTS intent_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request TEXT NOT NULL,
    max_price DECIMAL(10,2) NOT NULL,
    min_price DECIMAL(10,2),
    valid_until TIMESTAMP NOT NULL,
    approved_merchants TEXT[],
    blocked_merchants TEXT[],
    categories TEXT[],
    shipping_constraints JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'revoked')),
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    algorithm VARCHAR(20) DEFAULT 'ed25519',
    signed_at TIMESTAMP NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart Mandates
CREATE TABLE IF NOT EXISTS cart_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    intent_mandate_id VARCHAR(100) REFERENCES intent_mandates(mandate_id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    merchant_id VARCHAR(255) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    merchant_info JSONB,
    payment_method_id VARCHAR(255),
    shipping_address JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'revoked')),
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    algorithm VARCHAR(20) DEFAULT 'ed25519',
    signed_at TIMESTAMP NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mandate Audit Events
CREATE TABLE IF NOT EXISTS mandate_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(100) UNIQUE NOT NULL,
    mandate_id VARCHAR(100) NOT NULL,
    mandate_type VARCHAR(20) NOT NULL CHECK (mandate_type IN ('intent', 'cart')),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('created', 'signed', 'verified', 'executed', 'revoked', 'expired')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AP2 Transactions
CREATE TABLE IF NOT EXISTS ap2_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    mandate_id VARCHAR(100) REFERENCES cart_mandates(mandate_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'requires_action')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    merchant_id VARCHAR(255) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    payment_provider VARCHAR(50),
    payment_method_id VARCHAR(255),
    authorization_data JSONB,
    receipt_url TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for AP2 tables
CREATE INDEX IF NOT EXISTS idx_intent_mandates_user ON intent_mandates(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_mandates_status ON intent_mandates(status);
CREATE INDEX IF NOT EXISTS idx_intent_mandates_valid_until ON intent_mandates(valid_until);
CREATE INDEX IF NOT EXISTS idx_cart_mandates_user ON cart_mandates(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_mandates_intent ON cart_mandates(intent_mandate_id);
CREATE INDEX IF NOT EXISTS idx_cart_mandates_status ON cart_mandates(status);
CREATE INDEX IF NOT EXISTS idx_mandate_audit_mandate ON mandate_audit_events(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_audit_user ON mandate_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mandate_audit_type ON mandate_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ap2_transactions_user ON ap2_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ap2_transactions_mandate ON ap2_transactions(mandate_id);
CREATE INDEX IF NOT EXISTS idx_ap2_transactions_status ON ap2_transactions(status);
