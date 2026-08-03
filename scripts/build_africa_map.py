#!/usr/bin/env python3
"""Build the browser map paths from Natural Earth Admin 0 country geometry.

Requires the optional ``pyshp`` package and the unpacked Natural Earth 1:50m
Admin 0 Countries shapefile. The generated JSON is a checked-in web asset; the
runtime does not need GIS libraries.
"""

from __future__ import annotations

import argparse
import json
import math
import pathlib
from typing import Iterable

import shapefile  # type: ignore[import-untyped]

ROOT = pathlib.Path(__file__).resolve().parents[1]
WIDTH = 680
HEIGHT = 620
MIN_LON, MAX_LON = -26.0, 64.0
MIN_LAT, MAX_LAT = -38.0, 39.0


def project(point: tuple[float, float]) -> tuple[float, float]:
    longitude, latitude = point
    x = (longitude - MIN_LON) / (MAX_LON - MIN_LON) * WIDTH
    y = (MAX_LAT - latitude) / (MAX_LAT - MIN_LAT) * HEIGHT
    return x, y


def distance_to_segment(point, start, end) -> float:
    px, py = point
    sx, sy = start
    ex, ey = end
    dx, dy = ex - sx, ey - sy
    if dx == 0 and dy == 0:
        return math.hypot(px - sx, py - sy)
    amount = max(0.0, min(1.0, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (sx + amount * dx), py - (sy + amount * dy))


def simplify(points: list[tuple[float, float]], tolerance: float = 0.055):
    if len(points) <= 4:
        return points
    first, last = points[0], points[-1]
    farthest_index = 0
    farthest_distance = 0.0
    for index, point in enumerate(points[1:-1], start=1):
        distance = distance_to_segment(point, first, last)
        if distance > farthest_distance:
            farthest_index, farthest_distance = index, distance
    if farthest_distance <= tolerance:
        return [first, last]
    left = simplify(points[: farthest_index + 1], tolerance)
    right = simplify(points[farthest_index:], tolerance)
    return left[:-1] + right


def ring_paths(shape) -> Iterable[list[tuple[float, float]]]:
    stops = list(shape.parts[1:]) + [len(shape.points)]
    for start, stop in zip(shape.parts, stops):
        ring = [tuple(point) for point in shape.points[start:stop]]
        if len(ring) < 3:
            continue
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        simplified = simplify(ring)
        if len(simplified) >= 3:
            yield simplified


def path_data(shape) -> str:
    commands: list[str] = []
    for ring in ring_paths(shape):
        projected = [project(point) for point in ring]
        commands.append(
            "M"
            + "L".join(f"{x:.1f},{y:.1f}" for x, y in projected)
            + "Z"
        )
    return "".join(commands)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("shapefile", type=pathlib.Path)
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=ROOT / "web" / "generated" / "africa-map-paths.json",
    )
    args = parser.parse_args()

    registry = json.loads((ROOT / "web" / "generated" / "registry-snapshot.json").read_text())
    expected = {country["iso2"]: country["name"] for country in registry["countries"]}
    reader = shapefile.Reader(str(args.shapefile))
    fields = [field[0] for field in reader.fields[1:]]
    countries = []
    seen: set[str] = set()

    for shape_record in reader.iterShapeRecords():
        record = dict(zip(fields, shape_record.record))
        iso2 = record.get("ISO_A2")
        interactive = iso2 in expected
        if not interactive and record.get("ADMIN") == "Western Sahara":
            iso2 = "XH"
        elif not interactive and record.get("ADMIN") == "Somaliland":
            iso2 = "XS"
        elif not interactive:
            continue
        label_point = project((float(record["LABEL_X"]), float(record["LABEL_Y"])))
        min_lon, min_lat, max_lon, max_lat = shape_record.shape.bbox
        min_x, max_y = project((min_lon, min_lat))
        max_x, min_y = project((max_lon, max_lat))
        countries.append(
            {
                "iso2": iso2,
                "name": expected.get(iso2, record.get("ADMIN", iso2)),
                "path": path_data(shape_record.shape),
                "labelX": round(label_point[0], 1),
                "labelY": round(label_point[1], 1),
                "small": abs(max_x - min_x) < 16 or abs(max_y - min_y) < 16,
                "interactive": interactive,
            }
        )
        if interactive:
            seen.add(iso2)

    missing = sorted(set(expected) - seen)
    if missing:
        raise SystemExit(f"Natural Earth geometry is missing registry countries: {missing}")

    payload = {
        "schemaVersion": "1.0",
        "viewBox": f"0 0 {WIDTH} {HEIGHT}",
        "source": {
            "name": "Natural Earth Admin 0 Countries, 1:50m",
            "version": "5.1.1",
            "url": "https://naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
            "downloadUrl": "https://naturalearth.s3.amazonaws.com/50m_cultural/ne_50m_admin_0_countries.zip",
            "licence": "Public domain",
        },
        "countries": sorted(countries, key=lambda country: (not country["interactive"], country["name"])),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"Wrote {len(countries)} paths to {args.output}")


if __name__ == "__main__":
    main()
