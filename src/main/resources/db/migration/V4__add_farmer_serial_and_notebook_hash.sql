ALTER TABLE farmers
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_farmers_shop_season_serial
ON farmers(shop_type, season, serial_number);

ALTER TABLE notebook_pages
ADD COLUMN IF NOT EXISTS image_hash VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_notebook_pages_farmer_hash
ON notebook_pages(farmer_id, image_hash);