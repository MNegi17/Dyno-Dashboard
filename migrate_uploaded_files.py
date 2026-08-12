import json
import re
import urllib.request
import urllib.error
import pandas as pd

# 1. Parse Supabase client credentials from src/supabaseClient.js
supabase_url = None
supabase_key = None

with open('src/supabaseClient.js', 'r', encoding='utf-8') as f:
    content = f.read()
    url_match = re.search(r"supabaseUrl\s*=\s*['\"]([^'\"]+)['\"]", content)
    key_match = re.search(r"supabaseKey\s*=\s*['\"]([^'\"]+)['\"]", content)
    if url_match:
        supabase_url = url_match.group(1)
    if key_match:
        supabase_key = key_match.group(1)

if not supabase_url or not supabase_key:
    print("Error: Could not parse Supabase credentials from src/supabaseClient.js")
    exit(1)

print(f"Parsed Supabase URL: {supabase_url}")

# 2. Login to Supabase to get an authenticated Access Token
login_url = f"{supabase_url}/auth/v1/token?grant_type=password"
login_data = json.dumps({
    "email": "manannegi17@gmail.com",
    "password": "Manan@dyno@17"
}).encode('utf-8')

req = urllib.request.Request(
    login_url,
    data=login_data,
    headers={
        "apikey": supabase_key,
        "Content-Type": "application/json"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as res:
        login_res = json.loads(res.read().decode('utf-8'))
        access_token = login_res.get("access_token")
        print("Successfully authenticated as admin.")
except urllib.error.HTTPError as e:
    print(f"Login failed: {e.read().decode('utf-8')}")
    print("\n[!] IMPORTANT: Please ensure you have created the user 'manannegi17@gmail.com' with password 'Manan@dyno@17' in your new Supabase dashboard under Authentication > Users, and then run this script again.")
    exit(1)

# 3. Load CSV
print("Loading uploaded_files_rows.csv...")
df = pd.read_csv("uploaded_files_rows.csv")
print(f"Loaded {len(df)} rows.")

# 4. Insert rows in batches
batch_size = 5
total_rows = len(df)
url = f"{supabase_url}/rest/v1/uploaded_files"

for i in range(0, total_rows, batch_size):
    batch = df.iloc[i:i+batch_size]
    payload = []
    
    for _, row in batch.iterrows():
        # Parse data string back to JSON list/dict
        data_json = json.loads(row['data']) if isinstance(row['data'], str) else row['data']
        payload.append({
            "id": row['id'],
            "name": row['name'],
            "upload_date": row['upload_date'],
            "record_count": int(row['record_count']),
            "data": data_json
        })
    
    # POST to rest endpoint
    post_data = json.dumps(payload).encode('utf-8')
    post_req = urllib.request.Request(
        url,
        data=post_data,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(post_req) as res:
            print(f"Successfully uploaded batch {i//batch_size + 1}/{(total_rows-1)//batch_size + 1} (Rows {i} to {min(i+batch_size, total_rows)})")
    except urllib.error.HTTPError as e:
        print(f"Error uploading batch: {e.read().decode('utf-8')}")
        print("\n[!] IMPORTANT: Please ensure you have created the 'uploaded_files' table in your new Supabase dashboard under SQL Editor using the query from the plan, and then run this script again.")
        exit(1)

print("Migration completed successfully!")
