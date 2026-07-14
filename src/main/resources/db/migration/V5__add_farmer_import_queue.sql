CREATE TABLE IF NOT EXISTS farmer_imports (
    id BIGSERIAL PRIMARY KEY,
    shop_type VARCHAR(50) NOT NULL,
    season VARCHAR(20) NOT NULL,
    serial_number VARCHAR(50),
    detected_name VARCHAR(255),
    detected_phone VARCHAR(20),
    detected_village VARCHAR(255),
    detected_crop_details VARCHAR(500),
    ocr_text TEXT,
    image_path TEXT NOT NULL,
    image_hash VARCHAR(128),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_farmer_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farmer_imports_shop_season_status
ON farmer_imports(shop_type, season, status);

CREATE INDEX IF NOT EXISTS idx_farmer_imports_serial
ON farmer_imports(shop_type, season, serial_number);

CREATE INDEX IF NOT EXISTS idx_farmer_imports_hash
ON farmer_imports(shop_type, season, image_hash);