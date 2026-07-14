-- SQL Script to create balaji_traders database and setup
-- Run this in pgAdmin Query Tool connected to the default 'postgres' database

-- Create database if it doesn't exist
CREATE DATABASE balaji_traders
  WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Grant privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE balaji_traders TO postgres;

-- Display success message
SELECT 'Database balaji_traders created successfully!' AS result;
