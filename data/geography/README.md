# Geographic display assets

The public deployment map uses country outlines from **Natural Earth Admin 0
Countries, 1:50m, version 5.1.1**. Natural Earth makes its raster and vector map
data available in the public domain. The checked-in browser paths are a reduced,
projected rendering generated from that source; they do not add deployment
coordinates to the registry.

- Source: <https://naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/>
- Dataset register: <https://registry.opendata.aws/naturalearth/>
- Terms: <https://www.naturalearthdata.com/about/terms-of-use/>
- Direct archive used by the build script: <https://naturalearth.s3.amazonaws.com/50m_cultural/ne_50m_admin_0_countries.zip>

Boundaries are a visual navigation aid and do not express a position on legal
status or sovereignty. Western Sahara and Somaliland are retained as neutral
context shapes because they are separate features in the selected Natural Earth
view; they are not presented as registry country records.

To regenerate, unpack the archive, install the optional `pyshp` package in a
temporary environment, and run:

```bash
python3 scripts/build_africa_map.py /path/to/ne_50m_admin_0_countries.shp
```
