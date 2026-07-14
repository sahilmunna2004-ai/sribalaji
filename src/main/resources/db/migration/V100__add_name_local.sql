-- Add local name column for Telugu/local language support
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS name_local VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_farmers_name_local ON farmers(name_local);

-- Add detected_name_local to farmer_imports
ALTER TABLE IF EXISTS farmer_imports ADD COLUMN IF NOT EXISTS detected_name_local VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_farmer_imports_detected_name_local ON farmer_imports(detected_name_local);
