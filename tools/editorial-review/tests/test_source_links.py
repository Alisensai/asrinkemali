from datetime import datetime, timezone
from email.message import Message
from pathlib import Path
import json
import sys
import tempfile
import unittest
from unittest.mock import Mock
from urllib.error import HTTPError

TOOL_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL_DIR))
import source_links


NOW = datetime(2026, 10, 23, 12, 0, tzinfo=timezone.utc)


class FakeResponse:
    def __init__(self, status=200, url="https://archive.example/record/1"):
        self.status = status
        self._url = url

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def geturl(self):
        return self._url

    def read(self, _amount=-1):
        return b"x"


class FakeOpener:
    def __init__(self, *results):
        self.results = list(results)
        self.requests = []

    def open(self, request, timeout):
        self.requests.append((request, timeout))
        result = self.results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


def http_error(status, location=None, url="https://archive.example/record/1"):
    headers = Message()
    if location:
        headers["Location"] = location
    return HTTPError(url, status, "test", headers, None)


class SourceLinkTests(unittest.TestCase):
    def test_http_statuses_are_classified_separately(self):
        self.assertEqual(source_links._category(200), "http_success_not_historical_proof")
        self.assertEqual(source_links._category(301), "redirect_not_followed")
        self.assertEqual(source_links._category(403), "access_restricted_or_rate_limited")
        self.assertEqual(source_links._category(404), "not_found_or_gone")
        self.assertEqual(source_links._category(503), "temporary_service_error")
        self.assertEqual(source_links._category(422), "http_error")

    def test_redirect_is_reported_without_following(self):
        opener = FakeOpener(http_error(302, "https://archive.example/new"))
        result = source_links._request_status("https://archive.example/record/1", 2, opener)
        self.assertEqual(result["status"], "redirect_not_followed")
        self.assertEqual(result["redirect_location"], "https://archive.example/new")
        self.assertEqual(len(opener.requests), 1)

    def test_403_404_and_server_error_are_distinguished(self):
        cases = [
            (403, "access_restricted_or_rate_limited"),
            (404, "not_found_or_gone"),
            (503, "temporary_service_error"),
        ]
        for status, expected in cases:
            with self.subTest(status=status):
                opener = FakeOpener(http_error(status))
                self.assertEqual(
                    source_links._request_status("https://archive.example/record/1", 2, opener)["status"],
                    expected,
                )

    def test_head_not_allowed_uses_single_byte_range_fallback(self):
        opener = FakeOpener(http_error(405), FakeResponse(206))
        result = source_links._request_status("https://archive.example/record/1", 2, opener)
        self.assertEqual(result["method"], "GET")
        self.assertEqual(result["status"], "http_success_not_historical_proof")
        request = opener.requests[1][0]
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.get_header("Range"), "bytes=0-0")

    def test_local_and_non_https_urls_are_rejected(self):
        self.assertIsNone(source_links.normalize_https_url("http://archive.example/record/1"))
        self.assertIsNone(source_links.normalize_https_url("https://localhost/secret"))
        self.assertIsNone(source_links.normalize_https_url("https://127.0.0.1/internal"))
        self.assertEqual(
            source_links.normalize_https_url("https://ARCHIVE.example/record/1"),
            "https://archive.example/record/1",
        )

    def test_success_status_never_claims_historical_truth(self):
        result = source_links._request_status(
            "https://archive.example/record/1", 2, FakeOpener(FakeResponse(200))
        )
        self.assertEqual(result["status"], "http_success_not_historical_proof")
        self.assertFalse(result["historical_truth_verified"])

    def test_timeout_is_distinguished_from_http_failure(self):
        result = source_links._request_status(
            "https://archive.example/record/1", 2, FakeOpener(TimeoutError("deadline"))
        )
        self.assertEqual(result["status"], "timeout")
        self.assertIsNone(result["http_status"])

    def test_cache_prevents_a_second_network_request(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record_dir = root / "content/archive/records"
            record_dir.mkdir(parents=True)
            record = {"source": {"url": "https://archive.example/record/1"}}
            (record_dir / "one.json").write_text(json.dumps(record), encoding="utf-8")
            cache_file = root / "cache.json"
            cache_file.write_text(json.dumps({
                "https://archive.example/record/1": {
                    "status": "not_found_or_gone",
                    "http_status": 404,
                    "checked_at": NOW.isoformat(),
                    "historical_truth_verified": False,
                }
            }), encoding="utf-8")
            requester = Mock()
            result = source_links.check_links(
                root, cache_file=cache_file, requester=requester, now=NOW
            )
            requester.assert_not_called()
            self.assertEqual(result["https://archive.example/record/1"]["cache"], "hit")

    def test_transient_failures_have_shorter_cache_lifetime(self):
        fresh_temporary = {
            "status": "temporary_service_error",
            "checked_at": "2026-10-23T11:58:00+00:00",
        }
        stale_temporary = {
            "status": "temporary_service_error",
            "checked_at": "2026-10-23T11:50:00+00:00",
        }
        recent_success = {
            "status": "http_success_not_historical_proof",
            "checked_at": "2026-10-22T13:00:00+00:00",
        }
        self.assertTrue(source_links._cache_fresh(fresh_temporary, NOW, source_links.timedelta(hours=24)))
        self.assertFalse(source_links._cache_fresh(stale_temporary, NOW, source_links.timedelta(hours=24)))
        self.assertTrue(source_links._cache_fresh(recent_success, NOW, source_links.timedelta(hours=24)))

    def test_rate_limit_caps_requests_and_marks_remaining_urls(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record_dir = root / "content/archive/records"
            record_dir.mkdir(parents=True)
            for index in range(3):
                record = {"source": {"url": f"https://archive.example/record/{index}"}}
                (record_dir / f"{index}.json").write_text(json.dumps(record), encoding="utf-8")
            requester = Mock(return_value={
                "status": "http_success_not_historical_proof",
                "http_status": 200,
                "checked_at": NOW.isoformat(),
                "historical_truth_verified": False,
            })
            sleeps = []
            result = source_links.check_links(
                root,
                max_checks=2,
                delay=1,
                cache_file=root / "cache.json",
                requester=requester,
                resolver=lambda *_args, **_kwargs: [
                    (2, 1, 6, "", ("8.8.8.8", 443))
                ],
                sleep=sleeps.append,
                now=NOW,
            )
            self.assertEqual(requester.call_count, 2)
            self.assertEqual(sum(value["status"] == "not_checked_limit" for value in result.values()), 1)
            self.assertEqual(len(sleeps), 1)
            self.assertGreaterEqual(sleeps[0], 0)

    def test_dns_resolving_to_private_ip_is_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record_dir = root / "content/archive/records"
            record_dir.mkdir(parents=True)
            (record_dir / "one.json").write_text(
                json.dumps({"source": {"url": "https://archive.example/record/1"}}), encoding="utf-8"
            )
            requester = Mock()
            result = source_links.check_links(
                root,
                cache_file=root / "cache.json",
                requester=requester,
                resolver=lambda *_args, **_kwargs: [
                    (2, 1, 6, "", ("192.168.1.10", 443))
                ],
                now=NOW,
            )
            requester.assert_not_called()
            self.assertEqual(result["https://archive.example/record/1"]["status"], "non_public_host_blocked")

    def test_zero_delay_is_rejected_to_prevent_aggressive_requests(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                source_links.check_links(Path(directory), delay=0)


if __name__ == "__main__":
    unittest.main()
