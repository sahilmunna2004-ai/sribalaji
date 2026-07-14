-- Add crop_item_type and bill_file_path columns to transactions table
ALTER TABLE IF EXISTS transactions
ADD COLUMN IF NOT EXISTS crop_item_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS bill_file_path VARCHAR(500);

-- Create index for crop_item_type to improve query performance
CREATE INDEX IF NOT EXISTS idx_transactions_crop_item_type
ON transactions(crop_item_type);

-- Create index for queries by bill file status
CREATE INDEX IF NOT EXISTS idx_transactions_bill_file
ON transactions(bill_file_path);
