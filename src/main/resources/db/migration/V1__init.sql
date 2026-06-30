CREATE TABLE farmers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(255),
    village VARCHAR(255),
    crop_details VARCHAR(255),
    photo_path VARCHAR(255),
    shop_type VARCHAR(255)
);

CREATE TABLE notebook_pages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id BIGINT,
    image_path VARCHAR(255),
    upload_date DATE,
    notes CLOB,
    CONSTRAINT fk_notebook_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

CREATE TABLE stock (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(255),
    quantity INTEGER,
    price_per_unit DOUBLE,
    supplier_name VARCHAR(255),
    bill_number VARCHAR(255),
    date DATE,
    is_returned BOOLEAN,
    shop_type VARCHAR(255)
);

CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    farmer_id BIGINT,
    date DATE,
    type VARCHAR(255),
    amount DOUBLE,
    description VARCHAR(255),
    interest_applied BOOLEAN,
    interest_rate DOUBLE,
    shop_type VARCHAR(255),
    CONSTRAINT fk_transaction_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id)
);

MERGE INTO farmers (id, name, phone, village, crop_details, shop_type) KEY(id) VALUES
(1, 'A. Bhadrayya', '9908913521', 'Repalle', 'Paddy - 5 Acres', 'ENTERPRISES'),
(2, 'Kali Somayya', '9866091953', 'Veyaluru', 'Chilli - 3 Acres', 'ENTERPRISES'),
(3, 'Sri Srinivasa Agri Traders', '9848011223', 'Vijayawada', 'Seeds & Fertilizer Wholesale', 'TRADERS'),
(4, 'Guntur Chilli Merchants Association', '9440188990', 'Guntur', 'Chilli Trading & Brokerage', 'TRADERS');

MERGE INTO transactions (id, farmer_id, date, type, amount, description, interest_applied, interest_rate, shop_type) KEY(id) VALUES
(1, 1, '2025-06-11', 'ADVANCE', 4500.0, 'Opening balance (16)', false, 0.0, 'ENTERPRISES'),
(2, 1, '2025-06-27', 'BILL', 1800.0, 'Anuc (2 bags)', false, 0.0, 'ENTERPRISES'),
(3, 1, '2025-07-01', 'BILL', 7000.0, '20-20 fertilizer (5 bags)', false, 0.0, 'ENTERPRISES'),
(4, 1, '2025-07-04', 'BILL', 900.0, '5-10-10 seeds (1 bag)', false, 0.0, 'ENTERPRISES'),
(5, 1, '2025-07-07', 'ADVANCE', 10000.0, 'Cash loan', false, 0.0, 'ENTERPRISES'),
(6, 1, '2025-08-01', 'BILL', 1400.0, 'Urea fertilizer (3 bags)', false, 0.0, 'ENTERPRISES'),
(7, 1, '2025-08-11', 'BILL', 2800.0, '20-20 fertilizer (2 bags)', false, 0.0, 'ENTERPRISES'),
(8, 2, '2025-06-23', 'ADVANCE', 7250.0, 'Opening balance (83)', false, 0.0, 'ENTERPRISES'),
(9, 2, '2025-06-29', 'BILL', 2700.0, 'Seeds purchase (126)', false, 0.0, 'ENTERPRISES'),
(10, 2, '2025-07-02', 'BILL', 4200.0, '20-20 fertilizer (3 bags)', false, 0.0, 'ENTERPRISES'),
(11, 2, '2025-07-11', 'ADVANCE', 3000.0, 'Cash advance loan', false, 0.0, 'ENTERPRISES'),
(12, 2, '2025-07-15', 'BILL', 1400.0, 'Paddy seeds (1 bag)', false, 0.0, 'ENTERPRISES'),
(13, 2, '2025-07-19', 'BILL', 7000.0, '20-20 fertilizer (5 bags)', false, 0.0, 'ENTERPRISES'),
(14, 2, '2025-07-27', 'BILL', 1400.0, 'Urea (5 bags)', false, 0.0, 'ENTERPRISES'),
(15, 3, '2025-06-10', 'BILL', 120000.0, 'Wholesale Paddy Seeds Purchase (100 bags)', false, 0.0, 'TRADERS'),
(16, 3, '2025-06-15', 'PAYMENT', 100000.0, 'Part payment via Bank Transfer', false, 0.0, 'TRADERS'),
(17, 3, '2025-07-05', 'BILL', 80000.0, 'Cotton Seeds Purchase (50 bags)', false, 0.0, 'TRADERS'),
(18, 4, '2025-06-18', 'BILL', 150000.0, 'Urea Fertilizer Purchase (200 bags)', false, 0.0, 'TRADERS'),
(19, 4, '2025-06-25', 'PAYMENT', 150000.0, 'Full settlement payment', false, 0.0, 'TRADERS'),
(20, 4, '2025-07-12', 'BILL', 210000.0, '20-20 Fertilizer Purchase (150 bags)', false, 0.0, 'TRADERS'),
(21, 4, '2025-07-20', 'PAYMENT', 100000.0, 'Cash advance payment', false, 0.0, 'TRADERS');
