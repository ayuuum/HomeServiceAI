-- Add notes column to customers table for storing remarks/notes about each customer
ALTER TABLE public.customers 
ADD COLUMN notes text DEFAULT NULL;