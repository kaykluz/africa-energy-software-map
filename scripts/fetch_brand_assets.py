#!/usr/bin/env python3
"""Fetch only the brand assets explicitly approved in the local manifest."""

from __future__ import annotations

import hashlib
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "brand-assets" / "organisations.json"
PUBLIC = ROOT / "web" / "public"
MAX_BYTES = 5 * 1024 * 1024


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    failures: list[str] = []
    for asset in manifest["assets"]:
        try:
            request = urllib.request.Request(
                asset["assetSourceUrl"],
                headers={"User-Agent": "Mozilla/5.0 Africa Energy Software Map/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read(MAX_BYTES + 1)
                content_type = response.headers.get_content_type()
            if len(payload) > MAX_BYTES:
                raise ValueError("asset is larger than 5 MB")
            if not content_type.startswith("image/"):
                raise ValueError(f"response is {content_type}, not an image")
            if asset["localPath"].endswith(".svg"):
                lowered = payload.lower()
                for unsafe in (b"<script", b"javascript:", b"onload=", b"onerror="):
                    if unsafe in lowered:
                        raise ValueError(f"unsafe SVG token: {unsafe!r}")
            destination = PUBLIC / asset["localPath"].removeprefix("/")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)
            digest = hashlib.sha256(payload).hexdigest()
            print(f"OK {asset['organisationId']} {destination.relative_to(ROOT)} {digest}")
        except Exception as error:  # report the whole explicit batch
            failures.append(f"{asset['organisationId']} {asset['name']}: {error}")
            print(f"ERROR {failures[-1]}")
    if failures:
        raise SystemExit(f"{len(failures)} brand assets failed")


if __name__ == "__main__":
    main()
