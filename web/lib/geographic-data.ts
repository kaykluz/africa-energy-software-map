import {
  africanCountries,
  deployments,
  productById,
  products,
  type Product,
} from "@/lib/registry-data";
import { landscapeItems, type LandscapeItem } from "@/lib/landscape-data";
import { isAfricaWideCoverageLabel } from "@/lib/geography-scope";

export type SoftwareMapLayer =
  | "all_locations"
  | "reviewed_deployment"
  | "catalogue_location"
  | "africa_wide_coverage"
  | "publisher_headquarters";

export type SoftwareLocationType = Exclude<SoftwareMapLayer, "all_locations">;

export type CatalogueSoftwareLocation = {
  item: LandscapeItem;
  countryIso2s: string[];
  africaWide: boolean;
  canonicalProduct?: Product;
};

export type SoftwareMapEntity = {
  key: string;
  name: string;
  organisation: string;
  href: string;
  africaWide: boolean;
  product?: Product;
  catalogueItem?: LandscapeItem;
  locationTypesByCountry: Map<string, Set<SoftwareLocationType>>;
};

export type SoftwareMapIndex = Map<string, SoftwareMapEntity>;

export const softwareMapLayers: Array<[SoftwareMapLayer, string]> = [
  ["all_locations", "All recorded locations"],
  ["reviewed_deployment", "Reviewed deployments"],
  ["catalogue_location", "Documented catalogue locations"],
  ["africa_wide_coverage", "Africa-wide coverage"],
  ["publisher_headquarters", "Publisher headquarters"],
];

const africanIso2s = new Set(africanCountries.map(([iso2]) => iso2));
const countryIso2ByLabel = new Map(
  africanCountries.map(([iso2, name]) => [normaliseCountryLabel(name), iso2]),
);
for (const [label, iso2] of [
  ["Cote d'Ivoire", "CI"],
  ["Ivory Coast", "CI"],
  ["DRC", "CD"],
  ["Congo DRC", "CD"],
  ["Gambia", "GM"],
] as const) {
  countryIso2ByLabel.set(normaliseCountryLabel(label), iso2);
}

const canonicalProductByHref = new Map(
  products.map((product) => [`/products/${product.slug}`, product]),
);

export const catalogueSoftwareLocations: CatalogueSoftwareLocation[] = landscapeItems
  .filter((item) => item.kind === "product" || item.kind === "public_tool")
  .map((item) => ({
    item,
    countryIso2s: catalogueCountryIso2s(item.geographies),
    africaWide: item.geographies.some(isAfricaWideCoverageLabel),
    canonicalProduct: item.canonicalHref
      ? canonicalProductByHref.get(item.canonicalHref)
      : undefined,
  }))
  .filter((record) => record.countryIso2s.length || record.africaWide);

export function normaliseCountryLabel(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function catalogueCountryIso2s(geographies: string[]) {
  return Array.from(new Set(
    geographies.flatMap((geography) =>
      geography
        .split(/[\/,;|]+/)
        .map((part) => countryIso2ByLabel.get(normaliseCountryLabel(part)))
        .filter((iso2): iso2 is string => Boolean(iso2)),
    ),
  ));
}

export function isSoftwareMapLayer(value: string): value is SoftwareMapLayer {
  return softwareMapLayers.some(([id]) => id === value);
}

export function softwareMapLayerLabel(layer: SoftwareMapLayer) {
  return softwareMapLayers.find(([id]) => id === layer)?.[1] ?? layer;
}

function softwareLocationMatches(
  layer: SoftwareMapLayer,
  types: Set<SoftwareLocationType>,
) {
  return layer === "all_locations" || types.has(layer);
}

export function buildSoftwareMapIndex(
  filteredProducts: Product[],
  visibleDeployments: typeof deployments,
  catalogueRecords: CatalogueSoftwareLocation[],
): SoftwareMapIndex {
  const index: SoftwareMapIndex = new Map();
  const filteredProductIds = new Set(filteredProducts.map((product) => product.id));

  function canonicalEntity(product: Product) {
    const key = `product:${product.id}`;
    const existing = index.get(key);
    if (existing) return existing;
    const entity: SoftwareMapEntity = {
      key,
      name: product.name,
      organisation: product.organisation,
      href: `/products/${product.slug}`,
      africaWide: false,
      product,
      locationTypesByCountry: new Map(),
    };
    index.set(key, entity);
    return entity;
  }

  function addLocation(
    entity: SoftwareMapEntity,
    iso2: string,
    type: SoftwareLocationType,
  ) {
    if (!africanIso2s.has(iso2)) return;
    const types = entity.locationTypesByCountry.get(iso2) ?? new Set();
    types.add(type);
    entity.locationTypesByCountry.set(iso2, types);
  }

  for (const deployment of visibleDeployments) {
    const product = productById(deployment.productId);
    if (!product || !filteredProductIds.has(product.id)) continue;
    addLocation(canonicalEntity(product), deployment.countryIso2, "reviewed_deployment");
  }

  for (const product of filteredProducts) {
    if (product.publisherHeadquartersCountryIso2) {
      addLocation(
        canonicalEntity(product),
        product.publisherHeadquartersCountryIso2,
        "publisher_headquarters",
      );
    }
  }

  for (const record of catalogueRecords) {
    if (record.canonicalProduct && !filteredProductIds.has(record.canonicalProduct.id)) continue;
    const key = record.canonicalProduct
      ? `product:${record.canonicalProduct.id}`
      : `catalogue:${record.item.id}`;
    const entity = record.canonicalProduct
      ? canonicalEntity(record.canonicalProduct)
      : index.get(key) ?? {
          key,
          name: record.item.name,
          organisation: record.item.parent || "Catalogue listing",
          href: record.item.canonicalHref || `/landscape?q=${encodeURIComponent(record.item.name)}`,
          africaWide: record.africaWide,
          catalogueItem: record.item,
          locationTypesByCountry: new Map(),
        };
    if (!index.has(key)) index.set(key, entity);
    entity.africaWide ||= record.africaWide;
    for (const iso2 of record.countryIso2s) {
      addLocation(entity, iso2, "catalogue_location");
      if (record.africaWide) {
        addLocation(entity, iso2, "africa_wide_coverage");
      }
    }
  }

  for (const [key, entity] of index) {
    if (!entity.locationTypesByCountry.size && !entity.africaWide) index.delete(key);
  }
  return index;
}

export function softwareEntitiesForCountry(
  index: SoftwareMapIndex,
  iso2: string,
  layer: SoftwareMapLayer,
) {
  return Array.from(index.values())
    .filter((entity) => {
      const types = entity.locationTypesByCountry.get(iso2);
      return Boolean(types && softwareLocationMatches(layer, types));
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function softwareKeysForLayer(
  index: SoftwareMapIndex,
  layer: SoftwareMapLayer,
  country = "all",
) {
  return new Set(
    Array.from(index.values()).flatMap((entity) => {
      if (layer === "africa_wide_coverage") {
        const hasNamedCountry = country === "all" || entity.locationTypesByCountry.has(country);
        return entity.africaWide && hasNamedCountry ? [entity.key] : [];
      }
      const visible = Array.from(entity.locationTypesByCountry.entries()).some(
        ([iso2, types]) =>
          (country === "all" || iso2 === country) && softwareLocationMatches(layer, types),
      );
      return visible ? [entity.key] : [];
    }),
  );
}

export function softwareLocationTypeLabel(type: SoftwareLocationType) {
  return {
    reviewed_deployment: "Reviewed deployment",
    catalogue_location: "Documented catalogue location",
    africa_wide_coverage: "Africa-wide coverage",
    publisher_headquarters: "Publisher headquarters",
  }[type];
}

export function softwareLocationTypeShortLabel(types: Set<SoftwareLocationType>) {
  if (types.size > 1) return `${types.size} location types`;
  const type = Array.from(types)[0];
  return type === "reviewed_deployment"
    ? "Reviewed deployment"
    : type === "catalogue_location"
      ? "Catalogue location"
      : type === "africa_wide_coverage"
        ? "Africa-wide"
        : "Publisher HQ";
}
