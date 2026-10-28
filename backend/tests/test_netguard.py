import pytest

from nenalet.netguard import BlockedTarget, resolve_public, safe_fetch


@pytest.mark.asyncio
@pytest.mark.parametrize("host", ["127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", "::1", "localhost"])
async def test_private_targets_are_blocked(host):
    with pytest.raises(BlockedTarget):
        await resolve_public(host, 80)


@pytest.mark.asyncio
async def test_non_http_and_odd_ports_blocked():
    with pytest.raises(BlockedTarget):
        await safe_fetch("file:///etc/passwd")
    with pytest.raises(BlockedTarget):
        await safe_fetch("http://example.com:22/")
    with pytest.raises(BlockedTarget):
        await safe_fetch("http://127.0.0.1:8003/orders")
