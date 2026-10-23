"""Optional, rate-limited HTTPS checks for source URLs."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import ipaddress
import json
from pathlib import Path
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


CACHE_TTL_HOURS = 24
USER_AGENT = "AsrinKemali-EditorialSourceCheck/1.0 (+offline-by-default)"


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        return None


def normalize_https_url(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return None
    host = parsed.hostname
    if (
        parsed.scheme != "https"
        or not host
        or port not in {None, 443}
        or parsed.username is not None
        or parsed.password is not None
        or any(char.isspace() for char in value)
        or host.lower() == "localhost"
        or host.lower().endswith((".localhost", ".local"))
    ):
        return None
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        return None
    return urlunsplit(("https", parsed.netloc.lower(), parsed.path or "/", parsed.query, ""))


def _category(status: int) -> str:
    if 200 <= status < 300:
        return "http_success_not_historical_proof"
    if 300 <= status < 400:
        return "redirect_not_followed"
    if status in {401, 403, 407, 429, 451}:
        return "access_restricted_or_rate_limited"
    if status in {404, 410}:
        return "not_found_or_gone"
    if status in {408} or status >= 500:
        return "temporary_service_error"
    return "http_error"


def _request_status(url: str, timeout: float, opener=None) -> dict:
    opener = opener or build_opener(_NoRedirect)
    request = Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with opener.open(request, timeout=timeout) as response:
            status = response.status
            return {
                "status": _category(status),
                "http_status": status,
                "final_url": response.geturl(),
                "redirect_location": None,
                "checked_at": datetime.now(timezone.utc).isoformat(),
                "historical_truth_verified": False,
            }
    except HTTPError as exc:
        location = exc.headers.get("Location") if exc.headers else None
        if exc.code in {405, 501}:
            exc.close()
            return _request_get_fallback(url, timeout, opener)
        exc.close()
        return {
            "status": _category(exc.code),
            "http_status": exc.code,
            "final_url": url,
            "redirect_location": location if 300 <= exc.code < 400 else None,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "historical_truth_verified": False,
        }
    except TimeoutError:
        return _network_result("timeout")
    except URLError as exc:
        reason = exc.reason
        return _network_result("timeout" if isinstance(reason, TimeoutError) else "network_error", str(reason))
    except (OSError, socket.gaierror) as exc:
        return _network_result("network_error", str(exc))


def _request_get_fallback(url: str, timeout: float, opener) -> dict:
    request = Request(url, method="GET", headers={"User-Agent": USER_AGENT, "Range": "bytes=0-0"})
    try:
        with opener.open(request, timeout=timeout) as response:
            response.read(1)
            status = response.status
            return {
                "status": _category(status),
                "http_status": status,
                "final_url": response.geturl(),
                "redirect_location": None,
                "checked_at": datetime.now(timezone.utc).isoformat(),
                "historical_truth_verified": False,
                "method": "GET",
            }
    except HTTPError as exc:
        location = exc.headers.get("Location") if exc.headers else None
        exc.close()
        return {
            "status": _category(exc.code),
            "http_status": exc.code,
            "final_url": url,
            "redirect_location": location if 300 <= exc.code < 400 else None,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "historical_truth_verified": False,
            "method": "GET",
        }
    except TimeoutError:
        return _network_result("timeout", method="GET")
    except URLError as exc:
        reason = exc.reason
        return _network_result(
            "timeout" if isinstance(reason, TimeoutError) else "network_error", str(reason), method="GET"
        )
    except (OSError, socket.gaierror) as exc:
        return _network_result("network_error", str(exc), method="GET")


def _network_result(category: str, detail: str = "", method: str = "HEAD") -> dict:
    return {
        "status": category,
        "http_status": None,
        "final_url": None,
        "redirect_location": None,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "detail": detail,
        "method": method,
        "historical_truth_verified": False,
    }


def _load_cache(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _cache_fresh(value: object, now: datetime, ttl: timedelta) -> bool:
    if not isinstance(value, dict) or not isinstance(value.get("checked_at"), str):
        return False
    status = value.get("status")
    if isinstance(status, str) and status in {
        "timeout", "network_error", "dns_error", "temporary_service_error", "non_public_host_blocked"
    }:
        ttl = timedelta(minutes=5)
    elif status == "access_restricted_or_rate_limited":
        ttl = timedelta(hours=1)
    try:
        checked = datetime.fromisoformat(value["checked_at"].replace("Z", "+00:00"))
    except ValueError:
        return False
    return checked.tzinfo is not None and now - checked <= ttl and now >= checked


def _public_dns_result(host: str, resolver) -> tuple[str | None, str | None]:
    try:
        answers = resolver(host, 443, type=socket.SOCK_STREAM)
    except OSError as exc:
        return "dns_error", f"DNS lookup failed: {exc}"
    addresses = []
    for answer in answers:
        try:
            addresses.append(ipaddress.ip_address(answer[4][0]))
        except (IndexError, ValueError):
            return "dns_error", "DNS returned an invalid IP address."
    if not addresses:
        return "dns_error", "DNS returned no addresses."
    if not all(address.is_global for address in addresses):
        return "non_public_host_blocked", "Host resolves to a non-public IP; request blocked."
    return None, None


def check_links(
    root: Path,
    timeout: float = 5.0,
    delay: float = 1.0,
    max_checks: int = 50,
    cache_file: Path | None = None,
    requester=None,
    resolver=socket.getaddrinfo,
    sleep=time.sleep,
    now: datetime | None = None,
) -> dict[str, dict]:
    """Check a capped set of unique HTTPS URLs; network use is opt-in at the CLI."""
    if timeout <= 0 or max_checks < 1:
        raise ValueError("timeout and max_checks must be positive")
    if delay < 1:
        raise ValueError("delay must be at least one second to avoid aggressive requests")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None or current.utcoffset() is None:
        raise ValueError("now must be timezone-aware")
    current = current.astimezone(timezone.utc)
    cache = _load_cache(cache_file) if cache_file else {}
    results: dict[str, dict] = {}
    urls = set()
    for directory in (root / Path("content/archive/records"), root / Path("data/archive/catalog")):
        if not directory.is_dir():
            continue
        for path in sorted(directory.rglob("*.json")):
            try:
                record = json.loads(path.read_text(encoding="utf-8-sig"))
            except (OSError, UnicodeError, json.JSONDecodeError):
                continue
            source = record.get("source") if isinstance(record, dict) else None
            url = source.get("url") if isinstance(source, dict) else None
            normalized = normalize_https_url(url)
            if normalized:
                urls.add(normalized)

    host_last_request: dict[str, datetime] = {}
    processed = 0
    host_safety: dict[str, tuple[str | None, str | None]] = {}
    for url in sorted(urls):
        cached = cache.get(url)
        if _cache_fresh(cached, current, timedelta(hours=CACHE_TTL_HOURS)):
            results[url] = {**cached, "cache": "hit"}
            continue
        if processed >= max_checks:
            results[url] = {
                "status": "not_checked_limit",
                "http_status": None,
                "redirect_location": None,
                "checked_at": None,
                "historical_truth_verified": False,
                "cache": "miss",
            }
            continue
        processed += 1
        host = urlsplit(url).hostname or ""
        if host not in host_safety:
            host_safety[host] = _public_dns_result(host, resolver)
        blocked_status, dns_error = host_safety[host]
        if blocked_status is not None:
            results[url] = _network_result(blocked_status, dns_error or "Host lookup blocked.")
            results[url]["cache"] = "miss"
            cache[url] = {key: value for key, value in results[url].items() if key != "cache"}
            continue
        previous = host_last_request.get(host)
        if previous is not None:
            elapsed = (datetime.now(timezone.utc) - previous).total_seconds()
            if elapsed < delay:
                sleep(delay - elapsed)
        response = (
            requester(url, timeout)
            if requester is not None
            else _request_status(url, timeout)
        )
        response = {**response, "cache": "miss"}
        results[url] = response
        cache[url] = {key: value for key, value in response.items() if key != "cache"}
        host_last_request[host] = datetime.now(timezone.utc)
    if cache_file is not None:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return results
