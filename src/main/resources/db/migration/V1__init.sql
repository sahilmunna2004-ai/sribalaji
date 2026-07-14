-- Create farmers table
CREATE TABLE IF NOT EXISTS farmers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    village VARCHAR(255) NOT NULL,
    crop_details VARCHAR(500),
    photo_path TEXT,
    shop_type VARCHAR(50),
    season VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on farmer name for faster searches
CREATE INDEX IF NOT EXISTS idx_farmers_name ON farmers(name);
CREATE INDEX IF NOT EXISTS idx_farmers_village ON farmers(village);
CREATE INDEX IF NOT EXISTS idx_farmers_season ON farmers(season);

-- Create notebook_pages table for storing multiple images per farmer
CREATE TABLE IF NOT EXISTS notebook_pages (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    year VARCHAR(20)
);

-- Create index on farmer_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_notebook_pages_farmer_id ON notebook_pages(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notebook_pages_year ON notebook_pages(year);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    farmer_id BIGINT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(50),
    amount DECIMAL(10, 2),
    description TEXT,
    interest_applied BOOLEAN DEFAULT FALSE,
    interest_rate DECIMAL(5, 2) DEFAULT 0.0,
    shop_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_id ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_shop_type ON transactions(shop_type);

-- Create stock table
CREATE TABLE IF NOT EXISTS stock (
    id BIGSERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_unit DECIMAL(10, 2),
    supplier_name VARCHAR(255),
    bill_number VARCHAR(100),
    date DATE NOT NULL,
    is_returned BOOLEAN DEFAULT FALSE,
    shop_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for stock queries
CREATE INDEX IF NOT EXISTS idx_stock_item_name ON stock(item_name);
CREATE INDEX IF NOT EXISTS idx_stock_date ON stock(date);
CREATE INDEX IF NOT EXISTS idx_stock_supplier_name ON stock(supplier_name);
CREATE INDEX IF NOT EXISTS idx_stock_shop_type ON stock(shop_type);

-- Create image metadata table for tracking image storage
CREATE TABLE IF NOT EXISTS image_metadata (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    image_path TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for image metadata queries
CREATE INDEX IF NOT EXISTS idx_image_metadata_entity ON image_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_path ON image_metadata(image_path);
