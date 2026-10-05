import json
import os
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor
import re
import threading
import argparse

# Configuration
UNIWARE_URL = os.environ.get("UNIWARE_URL", "https://purpleunited.unicommerce.com").rstrip("/")
UNIWARE_USERNAME = os.environ.get("UNIWARE_USERNAME", "ecommerce@purpleunited.in")
UNIWARE_PASSWORD = os.environ.get("UNIWARE_PASSWORD", "Toothless@2024@")
SUPABASE_URL = "https://vvruwxrhwppozvrprcix.supabase.co"
SUPABASE_KEY = "sb_publishable_wEN47XUvThFsrpIZcPX35A_xkPbdJQ1"
ADMIN_EMAIL = "manannegi17@gmail.com"
ADMIN_PASSWORD = "Manan@dyno@17"
CONFIG_DELETED_SYNC_DATES = "[CONFIG] deleted_sync_dates"

_admin_token_cache = None
_admin_token_expiry = 0

def get_supabase_admin_token():
    global _admin_token_cache, _admin_token_expiry
    now = time.time()
    if _admin_token_cache and now < _admin_token_expiry:
        return _admin_token_cache

    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = json.dumps({
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }).encode('utf-8')

    req = urllib.request.Request(url, data=payload, headers={
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    })

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        _admin_token_cache = data["access_token"]
        _admin_token_expiry = now + 3500
        return _admin_token_cache

def get_deleted_sync_dates(admin_token):
    """
    Fetches persistent set of deleted past sync dates from Supabase
    """
    url = f"{SUPABASE_URL}/rest/v1/uploaded_files?name=eq.{urllib.parse.quote(CONFIG_DELETED_SYNC_DATES)}&select=id,data"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {admin_token}"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0 and isinstance(data[0].get("data"), list):
                return set(data[0]["data"])
    except Exception as e:
        print(f"[Sync Config] Error reading deleted sync dates: {e}")
        raise
    return set()

_uniware_token_cache = None
_uniware_token_expiry = 0

def get_uniware_token(force_refresh=False):
    global _uniware_token_cache, _uniware_token_expiry
    now = time.time()
    if not force_refresh and _uniware_token_cache and now < _uniware_token_expiry:
        return _uniware_token_cache

    query = urllib.parse.urlencode({"grant_type": "password", "client_id": "my-trusted-client",
                                    "username": UNIWARE_USERNAME, "password": UNIWARE_PASSWORD})
    url = f"{UNIWARE_URL}/oauth/token?{query}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        _uniware_token_cache = data["access_token"]
        _uniware_token_expiry = now + 3000
        return _uniware_token_cache

def normalize_channel_name(channel_str):
    if not channel_str:
        return "OTHER"
    c = str(channel_str).upper()
    if "MYNTRA" in c:
        return "MYNTRA"
    if "AJIO" in c:
        return "AJIO"
    if "AMAZON" in c:
        return "AMAZON"
    if "NYKAA" in c:
        return "NYKAA FASHION"
    if "FLIPKART" in c:
        return "FLIPKART"
    if "KAZO" in c:
        return "KAZO"
    if "SHOPIFY" in c or "CUSTOM" in c:
        return "CUSTOM"
    return "OTHER"

def get_today_start_ist():
    now = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_now = now + ist_offset
    start_ist = datetime(ist_now.year, ist_now.month, ist_now.day, 0, 0, 0, tzinfo=timezone.utc) - ist_offset
    return start_ist.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def get_today_realtime_file_name():
    now = datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_now = now + ist_offset
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"[REALTIME_SYNC] {ist_now.day:02d} {months[ist_now.month - 1]} {ist_now.year}"

def search_all_uniware_orders(from_date, to_date):
    token = get_uniware_token()
    url = f"{UNIWARE_URL}/services/rest/v1/oms/saleOrder/search"

    all_codes = []
    display_start = 0
    display_length = 200
    has_more = True

    while has_more:
        payload = json.dumps({
            "fromDate": from_date,
            "toDate": to_date,
            "dateType": "CREATED",
            "searchOptions": {
                "displayStart": display_start,
                "displayLength": display_length
            }
        }).encode('utf-8')

        success = False
        attempts = 0
        while not success and attempts < 3:
            attempts += 1
            req = urllib.request.Request(url, data=payload, headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            })

            try:
                with urllib.request.urlopen(req, timeout=45) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    if data.get("successful") is False or "elements" not in data:
                        raise RuntimeError("Uniware rejected order search")
                    elements = data["elements"]
                    total_records = data.get("totalRecords")
                    all_codes.extend([el["code"] for el in elements if "code" in el])

                    if len(elements) < display_length or (total_records is not None and len(all_codes) >= total_records):
                        has_more = False
                    else:
                        display_start += display_length
                    success = True
            except Exception as e:
                print(f"[Python Sync Worker] Search attempt {attempts} failed at {display_start}: {e}")
                if attempts >= 3:
                    raise RuntimeError(f"Order search failed at offset {display_start}; refusing partial sync") from e
                else:
                    token = get_uniware_token(force_refresh=True)
                    time.sleep(1.0 * attempts)

    if total_records is not None and len(set(all_codes)) < total_records:
        raise RuntimeError("Order search returned fewer orders than Uniware reported")
    return list(dict.fromkeys(all_codes))

def fetch_single_order(code, max_retries=2):
    attempts = 0
    while attempts <= max_retries:
        attempts += 1
        try:
            token = get_uniware_token()
            url = f"{UNIWARE_URL}/services/rest/v1/oms/saleorder/get"
            payload = json.dumps({"code": str(code).strip()}).encode('utf-8')
            req = urllib.request.Request(url, data=payload, headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get("successful") and "saleOrderDTO" in data:
                    return data["saleOrderDTO"]
        except Exception:
            if attempts <= max_retries:
                time.sleep(0.3 * attempts)
    return None

def fetch_orders_concurrently(order_codes, max_workers=8):
    orders = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = executor.map(fetch_single_order, order_codes)
        for res in results:
            if res:
                orders.append(res)
    if len(orders) != len(order_codes):
        raise RuntimeError(f"Fetched {len(orders)} of {len(order_codes)} orders; preserving stored data")
    return orders

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
                    directory = json.load(f)
                    _item_directory_cache = {**directory.get("by_color", {}), **directory.get("by_sku", {})} if "by_sku" in directory else directory
                print(f"[Python Sync Worker] Loaded {len(_item_directory_cache)} SKUs from Item Directory")
                break
            except Exception as e:
                print(f"[Python Sync Worker] Error reading {p}: {e}")
    return _item_directory_cache

def deduce_category_and_division(code_str):
    c = code_str.upper() if code_str else ""
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
            directory_entry = load_item_directory().get(item_sku) or load_item_directory().get(item_color) or {}
            size = it.get("size") or directory_entry.get("size") or "Unknown"

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
                "itemSku": item_sku,
                "orderCode": o.get("code"),
                "orderItemCode": str(it.get("code") or "")
            })

    return rows

def get_uniware_order_count(from_date, to_date):
    token = get_uniware_token()
    url = f"{UNIWARE_URL}/services/rest/v1/oms/saleOrder/search"
    payload = json.dumps({
        "fromDate": from_date,
        "toDate": to_date,
        "dateType": "CREATED",
        "searchOptions": {
            "displayStart": 0,
            "displayLength": 1
        }
    }).encode('utf-8')

    for attempt in range(2):
        try:
            req = urllib.request.Request(url, data=payload, headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {token}"
            })
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data.get("successful") is False or "totalRecords" not in data:
                    raise RuntimeError("Uniware returned an invalid order count")
                return int(data["totalRecords"])
        except Exception as e:
            print(f"[Uniware Count Attempt {attempt+1}] Error: {e}")
            token = get_uniware_token(force_refresh=True)
            time.sleep(1)
    raise RuntimeError("Unable to retrieve Uniware order count")

def get_day_window_ist(days_ago=1, now=None):
    now = now or datetime.now(timezone.utc)
    ist_offset = timedelta(hours=5, minutes=30)
    ist_now = now + ist_offset
    target_ist = ist_now - timedelta(days=days_ago)

    start_utc = datetime(target_ist.year, target_ist.month, target_ist.day, 0, 0, 0, tzinfo=timezone.utc) - ist_offset
    end_utc = datetime(target_ist.year, target_ist.month, target_ist.day, 23, 59, 59, 999000, tzinfo=timezone.utc) - ist_offset

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    date_str = f"{target_ist.day:02d} {months[target_ist.month - 1]} {target_ist.year}"
    file_name = f"[REALTIME_SYNC] {date_str}"

    return start_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"), end_utc.isoformat(timespec="milliseconds").replace("+00:00", "Z"), file_name, date_str, target_ist

def does_manual_file_cover_date(fname, target_day, target_month, target_year, upload_date=None):
    """Only explicit sales dates qualify; part numbers are never calendar dates."""
    fn = re.sub(r"\s*\(part \d+/\d+\)", "", (fname or "").lower()).strip()
    if (fn.startswith(("[realtime_sync]", "[inventory]", "[launch_dates]", "[return]", "[config]"))
            or re.search(r"cancel|return|fy\d+", fn)):
        return False
    months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
    if not 1 <= target_month <= 12:
        return False
    month = months[target_month - 1]
    month_pattern = rf"(?<![a-z])(?:{month}|{month[:3]})(?![a-z])"
    if not re.search(month_pattern, fn):
        return False
    years = re.findall(r"(?<!\d)(?:19|20)\d{2}(?!\d)", fn)
    # Legacy day-month filenames use their upload year, never the current year.
    file_year = int(years[0]) if len(set(years)) == 1 else None
    if not years and upload_date:
        try:
            uploaded = datetime.fromisoformat(upload_date.replace("Z", "+00:00"))
            file_year = uploaded.astimezone(timezone(timedelta(hours=5, minutes=30))).year
        except (ValueError, TypeError):
            pass
    if file_year != target_year:
        return False
    if fn.startswith("[reco]"):
        return True
    match = re.search(rf"(?<!\d)\(?(\d{{1,2}})(?:\s*(?:-|_|to)\s*(\d{{1,2}}))?\)?[\s_-]*{month_pattern}", fn)
    if not match:
        return False
    first, last = int(match[1]), int(match[2] or match[1])
    return 1 <= first <= target_day <= last <= 31


def purge_sync_file_from_supabase(file_name, admin_token):
    try:
        del_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/uploaded_files?name=eq.{urllib.parse.quote(file_name)}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}"},
            method="DELETE"
        )
        with urllib.request.urlopen(del_req, timeout=30) as resp:
            print(f"[Supabase Purge] Purged obsolete sync file '{file_name}'")
    except Exception as e:
        print(f"[Supabase Purge] Failed to delete '{file_name}': {e}")

def audit_and_reconcile_yesterday(admin_token, threshold_diff=0, force=False, days_ago=1, now=None):
    reconciled_any = False

    deleted_dates = get_deleted_sync_dates(admin_token)

    for days_ago in [days_ago]:
        from_date, to_date, file_name, date_str, target_ist = get_day_window_ist(days_ago, now=now)
        print(f"\n[Audit Engine] Auditing {file_name} ({from_date} to {to_date})...")

        # 1. Check if user permanently deleted this past sync date
        if date_str in deleted_dates and not force:
            print(f"[Audit Engine] {date_str} was marked as deleted by user. Purging sync file and skipping.")
            purge_sync_file_from_supabase(file_name, admin_token)
            continue

        # 2. Fetch latest files list from Supabase
        get_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/uploaded_files?select=id,name,record_count,upload_date&order=upload_date.desc",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}"}
        )
        try:
            with urllib.request.urlopen(get_req, timeout=30) as resp:
                all_files = json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f"[Audit Engine] Error querying Supabase metadata: {e}")
            raise

        # 3. Check if a manual verified Excel file covers this date
        manual_file_found = None
        for f in all_files:
            if does_manual_file_cover_date(f.get("name", ""), target_ist.day, target_ist.month, target_ist.year, f.get("upload_date")):
                manual_file_found = f
                break

        if manual_file_found and not force:
            print(f"[Audit Engine] Manual verified file exists for {target_ist.strftime('%d %b %Y')}: '{manual_file_found['name']}'. Keeping archive and skipping.")
            continue

        # 4. Query Uniware real order count for this 24-hr window
        uniware_total_orders = get_uniware_order_count(from_date, to_date)
        print(f"[Audit Engine] Uniware real orders count: {uniware_total_orders}")

        if uniware_total_orders == 0:
            print(f"[Audit Engine] No orders on Uniware for {file_name}. Skipping.")
            continue

        # 5. Check what is currently in Supabase for [REALTIME_SYNC] <date>
        existing_realtime = [f for f in all_files if f.get("name") == file_name]
        stored_unique_orders = 0
        stored_record_count = existing_realtime[0].get("record_count", 0) if existing_realtime else 0

        if existing_realtime:
            file_id = existing_realtime[0]["id"]
            data_req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/uploaded_files?id=eq.{file_id}&select=data",
                headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}"}
            )
            try:
                with urllib.request.urlopen(data_req, timeout=35) as resp:
                    file_rows = json.loads(resp.read().decode('utf-8'))
                    if file_rows and len(file_rows) > 0 and "data" in file_rows[0]:
                        rows_list = file_rows[0]["data"] or []
                        stored_unique_orders = len(set(r.get("orderCode") for r in rows_list if r.get("orderCode")))
                        stored_record_count = len(rows_list)
            except Exception as e:
                print(f"[Audit Engine] Error fetching file data: {e}")

        diff = abs(uniware_total_orders - stored_unique_orders)
        print(f"[Audit Engine] Comparison for {file_name}: Uniware Orders = {uniware_total_orders}, Stored Orders = {stored_unique_orders} (Stored Units = {stored_record_count}), Discrepancy = {diff} orders")

        # 6. Repair any discrepancy (or force / empty) using the full IST day
        if diff > threshold_diff or force or (stored_record_count == 0):
            print(f"[Audit Engine] Discrepancy of {diff} > threshold {threshold_diff}. Commencing full 24-hour ingestion from Uniware...")
            order_codes = search_all_uniware_orders(from_date, to_date)
            if not order_codes:
                raise RuntimeError("Search returned no orders despite a positive Uniware count")
            if order_codes:
                orders = fetch_orders_concurrently(order_codes, max_workers=10)
                if len(orders) < uniware_total_orders:
                    raise RuntimeError("Incomplete historical fetch; preserving stored data")
                rows = transform_all_orders(orders)
                new_file_entry = {
                    "name": file_name,
                    "upload_date": datetime.now(timezone.utc).isoformat(),
                    "record_count": len(rows),
                    "data": rows
                }
                if existing_realtime:
                    file_id = existing_realtime[0]["id"]
                    update_req = urllib.request.Request(
                        f"{SUPABASE_URL}/rest/v1/uploaded_files?id=eq.{file_id}",
                        data=json.dumps(new_file_entry).encode('utf-8'),
                        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
                        method="PATCH"
                    )
                    with urllib.request.urlopen(update_req, timeout=45) as resp:
                        print(f"[Audit Engine] Successfully reconciled {file_name} with {len(rows)} units across {len(orders)} orders in Supabase!")
                        reconciled_any = True
                    
                    # Clean up any duplicate records for this date
                    if len(existing_realtime) > 1:
                        dup_ids = ",".join(str(f['id']) for f in existing_realtime[1:])
                        del_req = urllib.request.Request(
                            f"{SUPABASE_URL}/rest/v1/uploaded_files?id=in.({dup_ids})",
                            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}"},
                            method="DELETE"
                        )
                        try:
                            with urllib.request.urlopen(del_req, timeout=30) as d_resp:
                                print(f"[Audit Engine] Cleaned up {len(existing_realtime)-1} duplicate records for {file_name}")
                        except Exception as de:
                            print(f"[Audit Engine] Could not delete duplicates: {de}")
                else:
                    insert_req = urllib.request.Request(
                        f"{SUPABASE_URL}/rest/v1/uploaded_files",
                        data=json.dumps([new_file_entry]).encode('utf-8'),
                        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
                        method="POST"
                    )
                    with urllib.request.urlopen(insert_req, timeout=45) as resp:
                        print(f"[Audit Engine] Successfully created reconciled {file_name} with {len(rows)} units in Supabase!")
                        reconciled_any = True
        else:
            print(f"[Audit Engine] Difference ({diff}) <= {threshold_diff}. Data is accurate, no fetch needed.")

    return reconciled_any

def _execute_today_sync():
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"\n[{timestamp}] [Python Sync] Starting sync...")

    admin_token = get_supabase_admin_token()

    # 2. Ingest today's live orders from 00:00:00 IST to present
    now_dt = datetime.now(timezone.utc)
    from_date, _, file_name, _, _ = get_day_window_ist(0, now=now_dt)
    to_date = max(now_dt - timedelta(minutes=1), datetime.fromisoformat(from_date.replace("Z", "+00:00"))).isoformat(timespec="milliseconds").replace("+00:00", "Z")

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

        # Clean up any duplicate records for this date
        if len(existing) > 1:
            dup_ids = ",".join(str(f['id']) for f in existing[1:])
            del_req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/uploaded_files?id=in.({dup_ids})",
                headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {admin_token}"},
                method="DELETE"
            )
            try:
                with urllib.request.urlopen(del_req, timeout=30) as d_resp:
                    print(f"[Python Sync] Cleaned up {len(existing)-1} duplicate records for {file_name}")
            except Exception as de:
                print(f"[Python Sync] Could not delete duplicates: {de}")
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

_sync_lock = threading.Lock()


def reconcile_recent_days(admin_token, lookback_days=7, force=False, now=None):
    now = now or datetime.now(timezone.utc)
    failures = []
    reconciled = False
    for days_ago in range(1, lookback_days + 1):
        try:
            reconciled = audit_and_reconcile_yesterday(
                admin_token, threshold_diff=0, force=force, days_ago=days_ago, now=now
            ) or reconciled
        except Exception as exc:
            failures.append(f"{days_ago} day(s) ago: {exc}")
    if failures:
        raise RuntimeError("Historical reconciliation failed: " + "; ".join(failures))
    return reconciled


def execute_sync(force_reconcile_yesterday=False, lookback_days=None):
    # Avoid overlapping HTTP-triggered and background runs within this process.
    if not _sync_lock.acquire(blocking=False):
        return {"success": False, "in_progress": True}
    try:
        result = _execute_today_sync()
        days = lookback_days if lookback_days is not None else int(os.environ.get("SYNC_LOOKBACK_DAYS", "7"))
        if not 1 <= days <= 90:
            raise ValueError("SYNC_LOOKBACK_DAYS must be between 1 and 90")
        result["reconciled"] = reconcile_recent_days(get_supabase_admin_token(), days, force_reconcile_yesterday)
        return result
    finally:
        _sync_lock.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", "--force-reconcile", action="store_true")
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--lookback-days", type=int, default=None)
    args = parser.parse_args()
    if args.loop:
        while True:
            try:
                execute_sync(args.force, args.lookback_days)
            except Exception as exc:
                print(f"[Loop Exception] {exc}", flush=True)
            time.sleep(300)
    else:
        execute_sync(args.force, args.lookback_days)
