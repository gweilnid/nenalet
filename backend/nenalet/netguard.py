"""Bezpečné stažení cizí stránky.

Stránku stahuje náš server, takže musíme zabránit tomu, aby nás někdo poslal na interní adresy
(localhost, privátní sítě, metadata cloudu). Každý krok přesměrování proto znovu ověříme
a připojujeme se přímo na ověřenou IP adresu (ochrana proti DNS rebindingu).
"""

from __future__ import annotations

import asyncio
import ipaddress
import socket
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit, urlunsplit

import httpx

MAX_BYTES = 1_500_000
MAX_REDIRECTS = 5
TIMEOUT = httpx.Timeout(8.0, connect=4.0)
USER_AGENT = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
)


class BlockedTarget(Exception):
    """Cíl není veřejná internetová adresa."""


@dataclass
class FetchResult:
    final_url: str
    status: int
    content_type: str
    body: bytes
    redirects: list[str] = field(default_factory=list)
    truncated: bool = False


def _is_public(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    return addr.is_global and not addr.is_multicast


async def resolve_public(host: str, port: int) -> str:
    try:
        ipaddress.ip_address(host)
        ips = [host]
    except ValueError:
        loop = asyncio.get_running_loop()
        infos = await loop.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        ips = [info[4][0] for info in infos]
    if not ips:
        raise BlockedTarget(f"{host}: nelze přeložit")
    for ip in ips:
        if not _is_public(ip):
            raise BlockedTarget(f"{host} míří na neveřejnou adresu")
    return ips[0]


def _pinned(url: str, ip: str) -> tuple[str, str]:
    parts = urlsplit(url)
    host_for_url = f"[{ip}]" if ":" in ip else ip
    netloc = host_for_url if parts.port is None else f"{host_for_url}:{parts.port}"
    return urlunsplit((parts.scheme, netloc, parts.path or "/", parts.query, "")), parts.hostname or ""


async def safe_fetch(url: str, client: httpx.AsyncClient | None = None, max_bytes: int = MAX_BYTES) -> FetchResult:
    own = client is None
    client = client or httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=False, verify=True)
    redirects: list[str] = []
    try:
        current = url
        for _ in range(MAX_REDIRECTS + 1):
            parts = urlsplit(current)
            if parts.scheme not in ("http", "https"):
                raise BlockedTarget(f"nepodporovaný protokol {parts.scheme}")
            port = parts.port or (443 if parts.scheme == "https" else 80)
            if port not in (80, 443, 8080, 8443):
                raise BlockedTarget(f"nestandardní port {port}")
            if parts.username or parts.password:
                raise BlockedTarget("adresa obsahuje přihlašovací údaje")
            host = parts.hostname or ""
            ip = await resolve_public(host, port)
            pinned_url, hostname = _pinned(current, ip)
            headers = {"Host": parts.netloc.split("@")[-1], "User-Agent": USER_AGENT, "Accept-Language": "cs,en;q=0.5"}
            extensions = {"sni_hostname": hostname} if parts.scheme == "https" else {}
            req = client.build_request("GET", pinned_url, headers=headers, extensions=extensions)
            resp = await client.send(req, stream=True)
            try:
                if resp.status_code in (301, 302, 303, 307, 308) and "location" in resp.headers:
                    nxt = urljoin(current, resp.headers["location"])
                    redirects.append(nxt)
                    current = nxt
                    continue
                body = bytearray()
                truncated = False
                async for chunk in resp.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > max_bytes:
                        truncated = True
                        break
                return FetchResult(
                    final_url=current,
                    status=resp.status_code,
                    content_type=resp.headers.get("content-type", ""),
                    body=bytes(body[:max_bytes]),
                    redirects=redirects,
                    truncated=truncated,
                )
            finally:
                await resp.aclose()
        raise BlockedTarget("příliš mnoho přesměrování")
    finally:
        if own:
            await client.aclose()
