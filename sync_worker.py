"""
Standalone 24/7 Real-Time Sync Worker in Pure Python for Railway Backend
Ingests live Uniware orders from 12:01 AM IST to present with full pagination,
applies dynamic Myntra discount pricing, and updates Supabase.
"""

import json
import time
import math
from datetime import datetime, timezone, timedelta
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

SUPABASE_URL = "https://vvruwxrhwppozvrprcix.supabase.co"
SUPABASE_KEY = "sb_publishable_wEN47XUvThFsrpIZcPX35A_xkPbdJQ1"
ADMIN_EMAIL = "manannegi17@gmail.com"
ADMIN_PASSWORD = "Manan@dyno@17"

UNIWARE_URL = "https://purpleunited.unicommerce.com"
UNIWARE_USER = "ecommerce@purpleunited.in"
UNIWARE_PASS = "Toothless@2024"

# Global token cache
_token_cache = {"token": None, "expires_at": 0}

def get_uniware_token():
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["token"]

    url = f"{UNIWARE_URL}/oauth/token?grant_type=password&client_id=my-trusted-client&username={urllib.parse.quote(UNIWARE_USER)}&password={urllib.parse.quote(UNIWARE_PASS)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = now + data.get("expires_in", 3600)
        return _token_cache["token"]

def get_supabase_admin_token():
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = json.dumps({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        return data["access_token"]

def get_today_start_ist():
    # 12:01 AM IST
    now = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_now = now + ist_offset
    ist_start = datetime(ist_now.year, ist_now.month, ist_now.day, 0, 1, 0, tzinfo=timezone.utc) - ist_offset
    return ist_start.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def get_today_realtime_file_name():
    now = datetime.now(timezone.utc)
    ist_now = now + timedelta(hours=5, minutes=30)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"[REALTIME_SYNC] {ist_now.day:02d} {months[ist_now.month - 1]} {ist_now.year}"

def normalize_channel_name(raw_name):
    if not raw_name:
        return "Unknown"
    upper = str(raw_name).strip().upper()
    if "MYNTRA_ONLINE" in upper or "MYNTRA_ONL" in upper or upper == "PUSPL _MYNTRA_ONL" or upper == "PUSPL__MYNTRA_ONLINE":
        return "MYNTRA"
    if upper == "FIRSTCRY":
        return "FIRSTCRY"
    if "SHOPIFY" in upper or "D2C" in upper or upper == "D2C_SHOPIFY" or upper == "D2C SHOPIFY":
        return "D2C"
    if "COCOBLU_ONLINE" in upper or "COCOBLU_ON" in upper or upper == "PUSPL _COCOBLU_ON" or upper == "AMAZON_COCOBLU" or upper == "COCOBLU":
        return "AMAZON_COCOBLU"
    if upper in ["AMAZON_FLEX_API", "AMAZON_IN_API", "AMAZON"]:
        return "AMAZON"
    if "AJIO" in upper:
        return "AJIO"
    if "FLIPKART" in upper:
        return "FLIPKART"
    if "NYKAA" in upper:
        return "NYKAA"
    if upper == "AMAZON_FBA":
        return "AMAZON_FBA"
    if upper == "MYNTRA_SJIT":
        return "MYNTRA_SJIT"
    return str(raw_name).strip()

def search_all_uniware_orders(from_date, to_date):
    token = get_uniware_token()
    all_codes = []
    display_start = 0
    display_length = 500
    has_more = True

    while has_more:
        url = f"{UNIWARE_URL}/services/rest/v1/oms/saleOrder/search"
        payload = json.dumps({
            "fromDate": from_date,
            "toDate": to_date,
            "dateType": "CREATED",
            "searchOptions": {
                "displayStart": display_start,
                "displayLength": display_length
            }
        }).encode('utf-8')

        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {token}"
        })

        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                elements = data.get("elements", [])
                total_records = data.get("totalRecords", 0)
                all_codes.extend([el["code"] for el in elements if "code" in el])

                if len(elements) < display_length or len(all_codes) >= total_records:
                    has_more = False
                else:
                    display_start += display_length
        except Exception as e:
            print(f"[Python Sync Worker] Error fetching page at {display_start}: {e}")
            break

    return all_codes

def fetch_single_order(code):
    token = get_uniware_token()
    url = f"{UNIWARE_URL}/services/rest/v1/oms/saleorder/get"
    payload = json.dumps({"code": str(code).strip()}).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get("successful") and "saleOrderDTO" in data:
                return data["saleOrderDTO"]
    except Exception:
        pass
    return None

def fetch_orders_concurrently(order_codes, max_workers=8):
    orders = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = executor.map(fetch_single_order, order_codes)
        for res in results:
            if res:
                orders.append(res)
    return orders

import os

_item_directory_cache = {}

def load_item_directory():
    global _item_directory_cache
    if _item_directory_cache:
        return _item_directory_cache

    possible_paths = [
        os.path.join(os.path.dirname(__file__), "src", "data", "item_directory.json"),
        os.path.join("src", "data", "item_directory.json"),
        "item_directory.json"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    _item_directory_cache = json.load(f)
                print(f"[Python Sync Worker] Loaded {len(_item_directory_cache)} SKUs from Item Directory")
                break
            except Exception as e:
                print(f"[Python Sync Worker] Error reading {p}: {e}")
    return _item_directory_cache

def deduce_category_and_division(code_str):
    c = code_str.upper() if code_str else ""
    # Style isolation before dash
    style = c.split("-")[0] if "-" in c else c

    # Footwear
    if any(k in style for k in ["TGCAFS", "TBCABS", "CAFS", "CABS"]):
        return "CASUAL SHOES", "FOOTWEAR"
    if "SL" in style or "SLIDES" in style:
        return "SLIDES", "FOOTWEAR"
    if "MO" in style or "MOULDS" in style:
        return "MOULDS", "FOOTWEAR"
    if "SH" in style and ("SHOES" in style or "SNEAKER" in style):
        return "CASUAL SHOES", "FOOTWEAR"

    # Apparel
    if "JN" in style or "JEANS" in style or "DN" in style or "DENIM" in style:
        return "JEANS", "APPAREL"
    if "TS" in style or "TEE" in style or "TSHIRT" in style:
        return "TSHIRT", "APPAREL"
    if "SH" in style or "SHIRT" in style:
        return "SHIRT", "APPAREL"
    if "DR" in style or "DRESS" in style:
        return "DRESS", "APPAREL"
    if "ST" in style or "SET" in style or "CS" in style:
        return "CLOTHING SET", "APPAREL"
    if "TR" in style or "TROUSER" in style or "TRACK" in style or "PANTS" in style:
        return "TROUSER", "APPAREL"
    if "SK" in style or "SKIRT" in style:
        return "SKIRT", "APPAREL"
    if "TOP" in style:
        return "TOP", "APPAREL"
    if "HD" in style or "HOOD" in style or "SWEAT" in style:
        return "SWEATSHIRT", "APPAREL"
    if "JK" in style or "JACKET" in style:
        return "JACKET", "APPAREL"

    # Accessories
    if "CAP" in style:
        return "CAP", "ACCESSORIES"
    if "SOCK" in style:
        return "SOCKS", "ACCESSORIES"

    return "CLOTHING SET", "APPAREL"

def lookup_item_details(item_sku, item_color_str):
    item_dir = load_item_directory()
    
    if item_sku and item_sku in item_dir:
        entry = item_dir[item_sku]
        cat = entry.get("categories") or entry.get("category")
        div = entry.get("division")
        if cat and div:
            return cat, div
        
    if item_color_str and item_color_str in item_dir:
        entry = item_dir[item_color_str]
        cat = entry.get("categories") or entry.get("category")
        div = entry.get("division")
        if cat and div:
            return cat, div
        
    return deduce_category_and_division(item_color_str or item_sku)

def transform_all_orders(orders):
    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    # 1. Compute Myntra Average Discount
    myntra_discounts = []
    for o in orders:
        ch = normalize_channel_name(o.get("channel"))
        if ch in ["MYNTRA", "MYNTRA_SJIT"]:
            for it in o.get("saleOrderItems", []):
                sp = float(it.get("sellingPrice") or 0)
                mrp = float(it.get("maxRetailPrice") or it.get("mrp") or sp)
                if mrp > 0 and sp > 0:
                    disc = 1.0 - (sp / mrp)
                    if 0.0 <= disc <= 0.95:
                        myntra_discounts.append(disc)

    avg_myntra_disc = sum(myntra_discounts) / len(myntra_discounts) if myntra_discounts else 0.5115

    rows = []
    for o in orders:
        ch = normalize_channel_name(o.get("channel"))
        
        # Parse created date into IST
        created_raw = o.get("created")
        try:
            if isinstance(created_raw, (int, float)):
                dt = datetime.fromtimestamp(created_raw / 1000.0, tz=timezone.utc)
            elif isinstance(created_raw, str):
                dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            else:
                dt = datetime.now(timezone.utc)
        except Exception:
            dt = datetime.now(timezone.utc)

        ist_dt = dt + timedelta(hours=5, minutes=30)
        formatted_date = f"{ist_dt.day:02d} {month_names[ist_dt.month - 1]}"
        month_name = month_names[ist_dt.month - 1]
        fy = str(ist_dt.year if ist_dt.month >= 4 else ist_dt.year - 1)

        for it in o.get("saleOrderItems", []):
            raw_sp = float(it.get("sellingPrice") or 0)
            raw_mrp = float(it.get("maxRetailPrice") or it.get("mrp") or raw_sp)

            # Dynamic pricing for Ajio, Cocoblu, Flipkart
            if ch in ["AJIO", "AMAZON_COCOBLU", "FLIPKART"]:
                final_sp = round(raw_mrp - (raw_mrp * avg_myntra_disc), 2)
            else:
                final_sp = round(raw_sp, 2)

            item_name = str(it.get("itemName") or "").strip()
            color = str(it.get("color") or "").strip()
            item_sku = str(it.get("itemSku") or "").strip()
            if item_name and color:
                item_color = f"{item_name}-{color}"
            elif item_name:
                item_color = item_name
            else:
                item_color = item_sku or "Unknown"

            cat, div = lookup_item_details(item_sku, item_color)
            size = it.get("size") or "Unknown"

            rows.append({
                "fy": fy,
                "new_sp": final_sp,
                "priceVal": final_sp,
                "division": div,
                "categories": cat,
                "monthName": month_name,
                "formattedDate": formatted_date,
                "parsedDate": dt.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "channel_name": ch,
                "item_color": item_color,
                "item_type_size": str(size),
                "mrp": raw_mrp,
                "orderCode": o.get("code"),
                "orderItemCode": str(it.get("code") or "")
            })

    return rows

def execute_sync():
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"\n[{timestamp}] [Python Sync] Starting sync...")
    
    admin_token = get_supabase_admin_token()
    from_date = get_today_start_ist()
    file_name = get_today_realtime_file_name()
    now_dt = datetime.now(timezone.utc) - timedelta(minutes=1)
    to_date = now_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    print(f"[Python Sync] Searching orders from {from_date} to {to_date}...")
    order_codes = search_all_uniware_orders(from_date, to_date)
    print(f"[Python Sync] Total orders discovered: {len(order_codes)}")

    if not order_codes:
        print("[Python Sync] No orders found.")
        return {"success": True, "orders": 0, "rows": 0}

    orders = fetch_orders_concurrently(order_codes, max_workers=8)
    print(f"[Python Sync] Fetched {len(orders)} order details.")

    rows = transform_all_orders(orders)
    print(f"[Python Sync] Generated {len(rows)} normalized rows.")

    # Save to Supabase
    new_file_entry = {
        "name": file_name,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "record_count": len(rows),
        "data": rows
    }

    # Check if exists
    get_req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/uploaded_files?name=eq.{urllib.parse.quote(file_name)}&select=id",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}"}
    )
    with urllib.request.urlopen(get_req, timeout=30) as resp:
        existing = json.loads(resp.read().decode('utf-8'))

    if existing:
        file_id = existing[0]["id"]
        update_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/uploaded_files?id=eq.{file_id}",
            data=json.dumps(new_file_entry).encode('utf-8'),
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            method="PATCH"
        )
        with urllib.request.urlopen(update_req, timeout=30) as resp:
            print(f"[Python Sync] Successfully updated '{file_name}' ({len(rows)} rows) in Supabase!")
    else:
        insert_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/uploaded_files",
            data=json.dumps([new_file_entry]).encode('utf-8'),
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(insert_req, timeout=30) as resp:
            print(f"[Python Sync] Successfully inserted '{file_name}' ({len(rows)} rows) in Supabase!")

    return {"success": True, "orders": len(orders), "rows": len(rows)}

if __name__ == "__main__":
    execute_sync()
