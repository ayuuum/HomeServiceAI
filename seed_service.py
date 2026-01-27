import os
import requests
import json

SUPABASE_URL = "https://yfxuqyvsccheqhzjopuj.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def seed_service():
    # 1. Get Organization ID
    slug = "test119-ca665cae"
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/organizations",
        params={"slug": f"eq.{slug}", "select": "id"},
        headers=HEADERS
    )
    if resp.status_code != 200:
        print(f"Error fetching org: {resp.text}")
        return

    data = resp.json()
    if not data:
        print(f"Organization {slug} not found.")
        return

    org_id = data[0]['id']
    print(f"Found Org ID: {org_id}")

    # 2. Check if service exists
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/services",
        params={"organization_id": f"eq.{org_id}", "title": "eq.Test Air Conditioner"},
        headers=HEADERS
    )
    services = resp.json()
    if services:
        print("Service already exists.")
        return

    # 3. Insert Service
    service_payload = {
        "organization_id": org_id,
        "title": "Test Air Conditioner",
        "description": "Standard cleaning test service",
        "base_price": 12000,
        "duration": 60,
        "category": "Air Conditioner",
        "is_active": True
    }
    
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/services",
        json=service_payload,
        headers=HEADERS
    )
    
    if resp.status_code == 201:
        print("Service created successfully!")
    else:
        print(f"Error creating service: {resp.text}")

if __name__ == "__main__":
    seed_service()
