-- 顧客名を最新の予約データから更新
UPDATE customers c
SET name = (
  SELECT b.customer_name 
  FROM bookings b 
  WHERE b.customer_id = c.id 
  ORDER BY b.created_at DESC 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM bookings b WHERE b.customer_id = c.id
);