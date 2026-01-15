-- Add building name/room number column to customers table
ALTER TABLE customers ADD COLUMN address_building TEXT;

-- Add building name/room number column to bookings table
ALTER TABLE bookings ADD COLUMN customer_address_building TEXT;