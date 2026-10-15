"""Consolidate existing sync reports without deleting their recovery copies.

Run without arguments to audit; --apply migrates to date-derived primary keys.
"""
import argparse
from collections import defaultdict
from datetime import datetime
from sync_worker import get_supabase_admin_token, report_request, sync_report_identity, save_sync_report


def repair(apply=False):
    token = get_supabase_admin_token()
    groups = defaultdict(list)
    offset = 0
    while True:
        files = report_request(token, query=f"select=id,name,upload_date,record_count&order=id&limit=500&offset={offset}") or []
        for file in files:
            if file['name'].startswith(('[DAILY_SYNC]', '[REALTIME_SYNC]')):
                key, _ = sync_report_identity(file['name'])
                groups[key].append(file)
        if len(files) < 500:
            break
        offset += 500
    for key, files in sorted(groups.items()):
        winner = max(files, key=lambda f: (f['name'].startswith('[DAILY_SYNC]'), datetime.fromisoformat(f['upload_date'].replace('Z', '+00:00')), f['id']))
        print(f"{winner['name']}: {len(files)} active report(s), {winner['record_count']} rows; canonical={winner['id'] == key}")
        if apply:
            entry = report_request(token, query=f"id=eq.{winner['id']}&select=*")[0]
            save_sync_report(entry, token, entry['upload_date'])
    return len(groups)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(f"Audited {repair(args.apply)} sales dates")
