-- Seed data for farmers table
INSERT INTO farmers (name, phone, village, crop_details, photo_path, shop_type, season) VALUES
('A. Bhadrayya', '9908913521', 'Repalle', 'Paddy - 5 Acres', './data/photos/farmer_1.jpg', 'ENTERPRISES', '2025-26'),
('Kali Somayya', '9866091953', 'Veyaluru', 'Chilli - 3 Acres', './data/photos/farmer_2.jpg', 'ENTERPRISES', '2025-26')
ON CONFLICT DO NOTHING;

-- Seed data for transactions
INSERT INTO transactions (farmer_id, date, type, amount, description, interest_applied, interest_rate, shop_type) VALUES
(1, '2025-06-01', 'BILL', 28400.00, 'Paddy seeds and fertilizer', false, 0.0, 'ENTERPRISES'),
(2, '2025-06-15', 'BILL', 26950.00, 'Chilli seeds and pesticides', false, 0.0, 'ENTERPRISES')
ON CONFLICT DO NOTHING;

-- Seed data for stock
INSERT INTO stock (item_name, quantity, price_per_unit, supplier_name, bill_number, date, is_returned, shop_type) VALUES
('Premium Paddy Seeds', 100, 250.00, 'Sri Srinivasa Agri', 'INV-2025-001', '2025-05-20', false, 'ENTERPRISES'),
('Urea Fertilizer', 50, 600.00, 'Guntur Chilli Merchants', 'INV-2025-002', '2025-05-25', false, 'ENTERPRISES'),
('Chilli Seeds', 25, 150.00, 'Local Supplier', 'INV-2025-003', '2025-06-01', false, 'ENTERPRISES')
ON CONFLICT DO NOTHING;
