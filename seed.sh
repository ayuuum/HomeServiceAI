#!/bin/bash
SUPABASE_URL="https://yfxuqyvsccheqhzjopuj.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeHVxeXZzY2NoZXFoempvcHVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODk3NzIsImV4cCI6MjA3OTM2NTc3Mn0.yceV0Cnmx81UjOlq0NwdA4k_rg9ZoYczVH9AlxSUs54"

# 1. Get Organization ID via RPC (Public)
echo "Fetching Org ID..."
RPC_RESP=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/get_organization_public" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{ \"org_slug\": \"test119-ca665cae\" }")

# RPC returns an array
ORG_ID=$(echo $RPC_RESP | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ORG_ID" ]; then
  echo "Error: Organization not found"
  echo "Response: $ORG_RESP"
  exit 1
fi

echo "Found Org ID: $ORG_ID"

# 2. Insert Service
echo "Inserting Service..."
curl -s -X POST "$SUPABASE_URL/rest/v1/services" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"title\": \"Experimental Cleaning\",
    \"base_price\": 5000,
    \"duration\": 60,
    \"category\": \"Test\",
    \"is_active\": true
  }"
echo "Done."
