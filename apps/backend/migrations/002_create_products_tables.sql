-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  image_url TEXT,
  product_url TEXT NOT NULL,
  source VARCHAR(100),
  raw_data JSONB,
  ai_extracted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_source ON products(source);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create search_queries table
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  results_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at DESC);
CREATE INDEX idx_search_queries_status ON search_queries(status);

-- Create product_filters table
CREATE TABLE IF NOT EXISTS product_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
  filter_type VARCHAR(50) NOT NULL,
  filter_label VARCHAR(100) NOT NULL,
  filter_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_filters_search_query_id ON product_filters(search_query_id);
CREATE INDEX idx_product_filters_type ON product_filters(filter_type);

-- Create mcp_server_configs table
CREATE TABLE IF NOT EXISTS mcp_server_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  server_type VARCHAR(50) NOT NULL,
  endpoint_url TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcp_configs_active ON mcp_server_configs(is_active);
CREATE INDEX idx_mcp_configs_name ON mcp_server_configs(name);

CREATE TRIGGER update_mcp_configs_updated_at
  BEFORE UPDATE ON mcp_server_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create ai_processing_logs table
CREATE TABLE IF NOT EXISTS ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,
  model_used VARCHAR(50) NOT NULL,
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  cost_estimate DECIMAL(10, 6),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_logs_search_query_id ON ai_processing_logs(search_query_id);
CREATE INDEX idx_ai_logs_created_at ON ai_processing_logs(created_at DESC);
CREATE INDEX idx_ai_logs_operation_type ON ai_processing_logs(operation_type);
