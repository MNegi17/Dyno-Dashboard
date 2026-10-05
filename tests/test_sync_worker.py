import json
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch, mock_open
import sync_worker as sync


class SyncTests(unittest.TestCase):
    def test_manual_coverage_regressions(self):
        cases = json.loads((Path(__file__).parent / 'date_coverage_cases.json').read_text())
        for name, day, month, year, uploaded, expected in cases:
            with self.subTest(name=name, day=day, uploaded=uploaded):
                self.assertEqual(sync.does_manual_file_cover_date(name, day, month, year, uploaded), expected)

    def test_nested_catalog_supplies_category_division_and_size(self):
        directory = {'by_sku': {'sku-1': {'categories': 'FLIP FLOPS', 'division': 'FOOTWEAR', 'size': '9'}},
                     'by_color': {'style-red': {'categories': 'TSHIRT', 'division': 'APPAREL'}}}
        with patch.object(sync, '_item_directory_cache', {}), patch('builtins.open', mock_open(read_data=json.dumps(directory))):
            self.assertEqual(len(sync.load_item_directory()), 2)
            self.assertEqual(sync.lookup_item_details('sku-1', ''), ('FLIP FLOPS', 'FOOTWEAR'))
            self.assertEqual(sync.lookup_item_details('', 'style-red'), ('TSHIRT', 'APPAREL'))
            order = {'code': 'order-1', 'created': '2026-10-01T01:00:00Z', 'channel': 'MYNTRA',
                     'saleOrderItems': [{'code': 'item-1', 'itemSku': 'sku-1', 'sellingPrice': 50, 'mrp': 100}]}
            row = sync.transform_all_orders([order])[0]
            self.assertEqual((row['categories'], row['division'], row['item_type_size'], row['itemSku']),
                             ('FLIP FLOPS', 'FOOTWEAR', '9', 'sku-1'))

    def test_ist_midnight_and_year_rollover(self):
        now = datetime(2026, 10, 4, 18, 30, tzinfo=timezone.utc)
        start, end, name, *_ = sync.get_day_window_ist(1, now)
        self.assertEqual((start, end, name), ('2026-10-03T18:30:00.000Z', '2026-10-04T18:29:59.999Z', '[REALTIME_SYNC] 04 Oct 2026'))
        now = datetime(2026, 12, 31, 18, 30, tzinfo=timezone.utc)
        self.assertEqual(sync.get_day_window_ist(1, now)[2], '[REALTIME_SYNC] 31 Dec 2026')

    @patch.object(sync, 'audit_and_reconcile_yesterday')
    def test_catchup_visits_all_seven_days_despite_failure(self, audit):
        audit.side_effect = [RuntimeError('failed'), True, False, False, False, False, False]
        with self.assertRaisesRegex(RuntimeError, 'Historical reconciliation failed'):
            sync.reconcile_recent_days('token')
        self.assertEqual([c.kwargs['days_ago'] for c in audit.call_args_list], list(range(1, 8)))

    @patch.object(sync, 'fetch_single_order')
    def test_partial_details_never_saved(self, fetch):
        fetch.side_effect = lambda code: {'code': code} if code == 'a' else None
        with self.assertRaisesRegex(RuntimeError, 'preserving stored data'):
            sync.fetch_orders_concurrently(['a', 'b'])

    @patch.object(sync.time, 'sleep')
    @patch.object(sync, 'get_uniware_token', return_value='token')
    @patch.object(sync.urllib.request, 'urlopen')
    def test_search_failure_is_not_empty_success(self, urlopen, token, sleep):
        urlopen.side_effect = OSError('unavailable')
        with self.assertRaisesRegex(RuntimeError, 'refusing partial sync'):
            sync.search_all_uniware_orders('start', 'end')

    @patch.object(sync.time, 'sleep')
    @patch.object(sync, 'get_uniware_token', return_value='token')
    @patch.object(sync.urllib.request, 'urlopen')
    def test_api_rejection_is_not_empty_success(self, urlopen, token, sleep):
        urlopen.return_value.__enter__.return_value.read.return_value = b'{"successful": false}'
        with self.assertRaisesRegex(RuntimeError, 'refusing partial sync'):
            sync.search_all_uniware_orders('start', 'end')

    @patch.object(sync.time, 'sleep')
    @patch.object(sync, 'get_uniware_token', return_value='token')
    @patch.object(sync.urllib.request, 'urlopen')
    def test_count_failure_is_not_zero(self, urlopen, token, sleep):
        urlopen.side_effect = OSError('unavailable')
        with self.assertRaisesRegex(RuntimeError, 'Unable to retrieve'):
            sync.get_uniware_order_count('start', 'end')

    @patch.object(sync, '_execute_today_sync')
    def test_overlapping_sync_is_rejected(self, today):
        sync._sync_lock.acquire()
        try:
            self.assertEqual(sync.execute_sync(), {'success': False, 'in_progress': True})
            today.assert_not_called()
        finally:
            sync._sync_lock.release()

    @patch.object(sync, 'reconcile_recent_days', side_effect=RuntimeError('audit failed'))
    @patch.object(sync, 'get_supabase_admin_token', return_value='token')
    @patch.object(sync, '_execute_today_sync', return_value={'success': True})
    def test_audit_failure_propagates_and_releases_lock(self, today, token, audit):
        with self.assertRaisesRegex(RuntimeError, 'audit failed'):
            sync.execute_sync()
        today.assert_called_once()
        self.assertFalse(sync._sync_lock.locked())

    @patch.object(sync, 'transform_all_orders')
    @patch.object(sync, 'fetch_orders_concurrently')
    @patch.object(sync, 'search_all_uniware_orders', return_value=[])
    @patch.object(sync, 'get_supabase_admin_token', return_value='token')
    @patch.object(sync, 'datetime')
    def test_first_minute_does_not_search_previous_day(self, dt, token, search, fetch, transform):
        dt.now.return_value = datetime(2026, 10, 4, 18, 30, 10, tzinfo=timezone.utc)
        dt.side_effect = datetime
        dt.fromisoformat.side_effect = datetime.fromisoformat
        sync._execute_today_sync()
        self.assertEqual(search.call_args.args, ('2026-10-04T18:30:00.000Z', '2026-10-04T18:30:00.000Z'))
        fetch.assert_not_called()


if __name__ == '__main__':
    unittest.main()
