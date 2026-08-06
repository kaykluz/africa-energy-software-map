"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  africanCountries,
  categories,
  deployments,
  evidenceLabels,
  organisationById,
  originLabels,
  products,
  release,
  stages,
  type EvidenceStatus,
  type Product,
} from "@/lib/registry-data";
import {
  filterProducts,
  normaliseQuery,
  paginate,
  sortProducts,
  type ProductSort,
} from "@/lib/registry-query";
import {
  EvidenceStatusLabel,
  Freshness,
  LifecycleTag,
  OriginLabel,
} from "@/components/semantic-tags";
import { OrganisationMark, ProductMark } from "@/components/brand-mark";
import { DatabaseHeader } from "@/components/database-header";
import {
  type CSSProperties,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import africaMapJson from "@/generated/africa-map-paths.json";
import {
  organisationEcosystemGroupName,
  organisationEcosystemGroups,
  organisationDirectory,
  organisationRoles,
  organisationRoleName,
  organisationSegments,
  organisationSegmentName,
  organisationSectors,
  organisationSectorName,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import {
  organisationCatalogue,
  type OrganisationCatalogueMapData,
  type OrganisationCataloguePage,
} from "@/lib/organisation-catalogue";
import { landscapeSoftwareItems } from "@/lib/landscape-data";
import {
  organisationLinkIndex,
  resolveOrganisationHref,
  type ExactLinkIndex,
} from "@/lib/entity-links";
import {
  buildSoftwareMapIndex,
  catalogueSoftwareLocations,
  isSoftwareMapLayer,
  softwareEntitiesForCountry,
  softwareKeysForLayer,
  softwareLocationTypeLabel,
  softwareLocationTypeShortLabel,
  softwareMapLayerLabel,
  softwareMapLayers,
  type SoftwareLocationType,
  type SoftwareMapIndex,
  type SoftwareMapLayer,
} from "@/lib/geographic-data";
import { isAfricaWideCoverageLabel } from "@/lib/geography-scope";

export type RegistryView = "stack" | "deployments" | "directory";

const emptyCatalogueMapData: OrganisationCatalogueMapData = {
  totalWithDocumentedCountry: 0,
  totalWithAfricaWideCoverage: 0,
  totalWithHeadquarters: 0,
  totalWithAnyLocation: 0,
  assessedIso2s: [],
  countries: {},
};

type CatalogueMapOrganisation = OrganisationCatalogueMapData["countries"][string]["records"][number];
type OrganisationPreviewTarget =
  | { kind: "canonical"; countryIso2: string; record: OrganisationDirectoryRecord; catalogueLocationTypes: CatalogueMapOrganisation["locationTypes"] }
  | { kind: "catalogue"; countryIso2: string; record: CatalogueMapOrganisation };

const viewMeta: Record<
  RegistryView,
  {
    title: string;
  }
> = {
  stack: {
    title: "Database",
  },
  deployments: {
    title: "Where the software is running",
  },
  directory: {
    title: "Reviewed software",
  },
};


export function RegistryExplorer({
  view,
  initialQuery = "",
  initialCategory = "all",
  initialEvidence = "all",
  initialCountry = "all",
  initialStage = "all",
  initialOrigin = "all",
  initialLifecycle = "all",
  initialAccess = "all",
  initialObject = "software",
  initialPresence = "all_presence",
  initialSoftwareLocation = "all_locations",
  initialFocus = "NG",
  initialRepresentation = "map",
  initialGroup = "all",
  initialRole = "all",
  initialSector = "all",
  initialSegment = "all",
  initialOrganisationOrigin = "all",
  initialHeadquarters = "all",
  initialScope = "all",
  catalogueMapData,
  catalogueMapOptions,
  canonicalOrganisationDirectory = organisationDirectory,
}: {
  view: RegistryView;
  initialQuery?: string;
  initialCategory?: string;
  initialEvidence?: string;
  initialCountry?: string;
  initialStage?: string;
  initialOrigin?: string;
  initialLifecycle?: string;
  initialAccess?: string;
  initialObject?: string;
  initialPresence?: string;
  initialSoftwareLocation?: string;
  initialFocus?: string;
  initialRepresentation?: string;
  initialGroup?: string;
  initialRole?: string;
  initialSector?: string;
  initialSegment?: string;
  initialOrganisationOrigin?: string;
  initialHeadquarters?: string;
  initialScope?: string;
  catalogueMapData?: OrganisationCatalogueMapData;
  catalogueMapOptions?: OrganisationCataloguePage["options"];
  canonicalOrganisationDirectory?: OrganisationDirectoryRecord[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [evidenceFilter, setEvidenceFilter] = useState(initialEvidence);
  const [countryFilter, setCountryFilter] = useState(initialCountry);
  const [stageFilter, setStageFilter] = useState(initialStage);
  const [originFilter, setOriginFilter] = useState(initialOrigin);
  const [lifecycleFilter, setLifecycleFilter] = useState(initialLifecycle);
  const [accessFilter, setAccessFilter] = useState(initialAccess);
  const [mapObject] = useState<"software" | "organisations">(
    initialObject === "organisations" ? "organisations" : "software",
  );
  const [organisationLayer, setOrganisationLayer] = useState<OrganisationMapLayer>(
    isOrganisationMapLayer(initialPresence) ? initialPresence : "all_presence",
  );
  const [softwareLayer, setSoftwareLayer] = useState<SoftwareMapLayer>(
    isSoftwareMapLayer(initialSoftwareLocation) ? initialSoftwareLocation : "all_locations",
  );
  const [groupFilter, setGroupFilter] = useState(initialGroup);
  const [roleFilter, setRoleFilter] = useState(
    organisationRoles.find((role) => role.name === initialRole)?.id ?? initialRole,
  );
  const [sectorFilter, setSectorFilter] = useState(initialSector);
  const [segmentFilter, setSegmentFilter] = useState(
    organisationSegments.find((segment) => segment.name === initialSegment)?.id ?? initialSegment,
  );
  const [organisationOriginFilter, setOrganisationOriginFilter] = useState(initialOrganisationOrigin);
  const [headquartersFilter, setHeadquartersFilter] = useState(initialHeadquarters);
  const [scopeFilter, setScopeFilter] = useState(initialScope);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrganisation, setSelectedOrganisation] = useState<OrganisationPreviewTarget | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const canonicalOrganisationLinks = useMemo(
    () => organisationLinkIndex(canonicalOrganisationDirectory),
    [canonicalOrganisationDirectory],
  );
  const organisationOrigins = useMemo(
    () => Array.from(new Set(
      canonicalOrganisationDirectory.map((record) => record.organisation.origin),
    )).sort(),
    [canonicalOrganisationDirectory],
  );

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedProduct || selectedOrganisation) {
        setSelectedProduct(null);
        setSelectedOrganisation(null);
        openerRef.current?.focus();
      } else if (filtersOpen) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [filtersOpen, selectedOrganisation, selectedProduct]);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, {
      query,
      category: categoryFilter,
      evidence: evidenceFilter,
      country: view === "deployments" ? "all" : countryFilter,
      stage: stageFilter,
      origin: originFilter,
      lifecycle: lifecycleFilter,
      access: accessFilter,
    });
  }, [
    accessFilter,
    categoryFilter,
    countryFilter,
    evidenceFilter,
    lifecycleFilter,
    originFilter,
    query,
    stageFilter,
    view,
  ]);

  const filteredCatalogueSoftwareLocations = useMemo(() => {
    const needle = normaliseQuery(query);
    const comparableOnly =
      evidenceFilter !== "all" ||
      originFilter !== "all" ||
      lifecycleFilter !== "all" ||
      accessFilter !== "all";
    return catalogueSoftwareLocations.filter((record) => {
      if (record.canonicalProduct) return true;
      if (comparableOnly) return false;
      const searchable = normaliseQuery([
        record.item.name,
        record.item.parent,
        record.item.summaryAsSubmitted,
      ].filter(Boolean).join(" "));
      return (
        (!needle || searchable.includes(needle)) &&
        (categoryFilter === "all" || record.item.categoryIds.includes(categoryFilter)) &&
        (stageFilter === "all" || record.item.stageIds.includes(stageFilter)) &&
        (countryFilter === "all" || record.countryIso2s.includes(countryFilter))
      );
    });
  }, [
    accessFilter,
    categoryFilter,
    countryFilter,
    evidenceFilter,
    lifecycleFilter,
    originFilter,
    query,
    stageFilter,
  ]);

  const filteredOrganisationRecords = useMemo(() => {
    const needle = normaliseQuery(query);
    return canonicalOrganisationDirectory.filter((record) => {
      const searchable = normaliseQuery([
        record.organisation.name,
        record.organisation.type,
        record.organisation.description,
        record.organisation.origin,
        record.organisation.countryOfOrigin,
        record.organisation.headquarters,
        ...record.aliases,
        ...record.roleIds.map(organisationRoleName),
        ...record.sectorIds.map(organisationSectorName),
        ...record.segmentIds.map(organisationSegmentName),
        ...record.ownedProducts.map((product) => product.name),
      ].join(" "));
      const roleMatches = roleFilter === "all" || record.roleIds.some(
        (roleId) => roleId === roleFilter || organisationRoleName(roleId) === roleFilter,
      );
      const segmentMatches = segmentFilter === "all" || record.segmentIds.some(
        (segmentId) => segmentId === segmentFilter || organisationSegmentName(segmentId) === segmentFilter,
      );
      const africaHeadquartered = africanCountries.some(
        ([, name]) => name === record.organisation.headquarters,
      );
      const scopeMatches =
        scopeFilter === "all" ||
        scopeFilter === "reviewed" ||
        (scopeFilter === "africa_hq" && africaHeadquartered) ||
        (scopeFilter === "international" && !africaHeadquartered);
      return (
        (!needle || searchable.includes(needle)) &&
        (groupFilter === "all" || record.ecosystemGroupIds.includes(groupFilter)) &&
        roleMatches &&
        (sectorFilter === "all" || record.sectorIds.includes(sectorFilter)) &&
        segmentMatches &&
        (organisationOriginFilter === "all" || record.organisation.origin === organisationOriginFilter) &&
        (headquartersFilter === "all" || record.organisation.headquarters === headquartersFilter) &&
        scopeMatches
      );
    });
  }, [
    canonicalOrganisationDirectory,
    groupFilter,
    headquartersFilter,
    organisationOriginFilter,
    query,
    roleFilter,
    sectorFilter,
    segmentFilter,
    scopeFilter,
  ]);

  const filteredProductIds = useMemo(
    () => new Set(filteredProducts.map((product) => product.id)),
    [filteredProducts],
  );
  const visibleSoftwareDeployments = useMemo(
    () => deployments.filter((deployment) => filteredProductIds.has(deployment.productId)),
    [filteredProductIds],
  );
  const softwareMapIndex = useMemo(
    () => buildSoftwareMapIndex(
      filteredProducts,
      visibleSoftwareDeployments,
      filteredCatalogueSoftwareLocations,
    ),
    [filteredCatalogueSoftwareLocations, filteredProducts, visibleSoftwareDeployments],
  );
  const softwareLayerKeys = useMemo(
    () => softwareKeysForLayer(softwareMapIndex, softwareLayer, countryFilter),
    [countryFilter, softwareLayer, softwareMapIndex],
  );
  const softwareLayerCounts = useMemo(() => ({
    all_locations: softwareKeysForLayer(softwareMapIndex, "all_locations", countryFilter).size,
    reviewed_deployment: softwareKeysForLayer(softwareMapIndex, "reviewed_deployment", countryFilter).size,
    catalogue_location: softwareKeysForLayer(softwareMapIndex, "catalogue_location", countryFilter).size,
    africa_wide_coverage: softwareKeysForLayer(softwareMapIndex, "africa_wide_coverage", countryFilter).size,
    publisher_headquarters: softwareKeysForLayer(softwareMapIndex, "publisher_headquarters", countryFilter).size,
  }), [countryFilter, softwareMapIndex]);

  function updateUrl(next: {
    q?: string;
    category?: string;
    evidence?: string;
    country?: string;
    stage?: string;
    origin?: string;
    lifecycle?: string;
    access?: string;
    object?: "software" | "organisations";
    softwareLocation?: SoftwareMapLayer;
    presence?: OrganisationMapLayer;
    focus?: string;
    representation?: string;
    group?: string;
    role?: string;
    sector?: string;
    segment?: string;
    orgOrigin?: string;
    headquarters?: string;
    scope?: string;
  }) {
    const params = new URLSearchParams();
    const values = {
      q: next.q ?? query,
      category: next.category ?? categoryFilter,
      evidence: next.evidence ?? evidenceFilter,
      country: next.country ?? countryFilter,
      stage: next.stage ?? stageFilter,
      origin: next.origin ?? originFilter,
      lifecycle: next.lifecycle ?? lifecycleFilter,
      access: next.access ?? accessFilter,
      object: next.object ?? mapObject,
      softwareLocation: next.softwareLocation ?? softwareLayer,
      presence: next.presence ?? organisationLayer,
      focus: next.focus ?? initialFocus,
      representation: next.representation ?? initialRepresentation,
      group: next.group ?? groupFilter,
      role: next.role ?? roleFilter,
      sector: next.sector ?? sectorFilter,
      segment: next.segment ?? segmentFilter,
      orgOrigin: next.orgOrigin ?? organisationOriginFilter,
      headquarters: next.headquarters ?? headquartersFilter,
      scope: next.scope ?? scopeFilter,
    };
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.category !== "all") params.set("category", values.category);
    if (values.evidence !== "all") params.set("evidence", values.evidence);
    if (values.country !== "all") params.set("country", values.country);
    if (values.stage !== "all") params.set("stage", values.stage);
    if (values.origin !== "all") params.set("origin", values.origin);
    if (values.lifecycle !== "all") params.set("lifecycle", values.lifecycle);
    if (values.access !== "all") params.set("access", values.access);
    if (view === "deployments") {
      if (values.object !== "software") params.set("object", values.object);
      if (values.softwareLocation !== "all_locations") params.set("softwareLocation", values.softwareLocation);
      if (values.presence !== "all_presence") params.set("presence", values.presence);
      if (values.focus !== "NG") params.set("focus", values.focus);
      if (values.representation !== "map") params.set("representation", values.representation);
      if (values.group !== "all") params.set("group", values.group);
      if (values.role !== "all") params.set("role", values.role);
      if (values.sector !== "all") params.set("sector", values.sector);
      if (values.segment !== "all") params.set("segment", values.segment);
      if (values.orgOrigin !== "all") params.set("orgOrigin", values.orgOrigin);
      if (values.headquarters !== "all") params.set("headquarters", values.headquarters);
      if (values.scope !== "all") params.set("scope", values.scope);
    }
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    setQuery("");
    if (view === "deployments" && mapObject === "organisations") {
      setCountryFilter("all");
      setGroupFilter("all");
      setRoleFilter("all");
      setSectorFilter("all");
      setSegmentFilter("all");
      setOrganisationOriginFilter("all");
      setHeadquartersFilter("all");
      setScopeFilter("all");
      updateUrl({
        q: "",
        country: "all",
        group: "all",
        role: "all",
        sector: "all",
        segment: "all",
        orgOrigin: "all",
        headquarters: "all",
        scope: "all",
      });
      return;
    }
    setCategoryFilter("all");
    setEvidenceFilter("all");
    setCountryFilter("all");
    setStageFilter("all");
    setOriginFilter("all");
    setLifecycleFilter("all");
    setAccessFilter("all");
    updateUrl({
      q: "",
      category: "all",
      evidence: "all",
      country: "all",
      stage: "all",
      origin: "all",
      lifecycle: "all",
      access: "all",
    });
  }

  function openProduct(product: Product, element: HTMLElement) {
    openerRef.current = element;
    setSelectedProduct(product);
  }

  function openOrganisation(record: OrganisationPreviewTarget, element: HTMLElement) {
    openerRef.current = element;
    setSelectedOrganisation(record);
  }

  const softwareActiveFilters = [
    categoryFilter !== "all"
      ? categories.find((category) => category.id === categoryFilter)?.name
      : null,
    evidenceFilter !== "all"
      ? evidenceLabels[evidenceFilter as EvidenceStatus]
      : null,
    countryFilter !== "all"
      ? africanCountries.find(([iso2]) => iso2 === countryFilter)?.[1]
      : null,
    stageFilter !== "all"
      ? stages.find((stage) => stage.id === stageFilter)?.name
      : null,
    originFilter !== "all"
      ? originLabels[originFilter as keyof typeof originLabels]
      : null,
    lifecycleFilter !== "all"
      ? lifecycleFilter.replaceAll("_", " ")
      : null,
    accessFilter !== "all" ? accessFilter : null,
  ].filter(Boolean) as string[];

  const organisationActiveFilters = [
    countryFilter !== "all"
      ? africanCountries.find(([iso2]) => iso2 === countryFilter)?.[1]
      : null,
    groupFilter !== "all" ? organisationEcosystemGroupName(groupFilter) : null,
    roleFilter !== "all" ? organisationRoleName(roleFilter) : null,
    sectorFilter !== "all" ? organisationSectorName(sectorFilter) : null,
    segmentFilter !== "all" ? organisationSegmentName(segmentFilter) : null,
    organisationOriginFilter !== "all" ? organisationOriginFilter : null,
    headquartersFilter !== "all" ? `HQ: ${headquartersFilter}` : null,
    scopeFilter !== "all" ? organisationScopeLabel(scopeFilter) : null,
  ].filter(Boolean) as string[];
  const activeFilters = view === "deployments" && mapObject === "organisations"
    ? organisationActiveFilters
    : softwareActiveFilters;

  const preservedSearch = (() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (evidenceFilter !== "all") params.set("evidence", evidenceFilter);
    if (countryFilter !== "all") params.set("country", countryFilter);
    if (stageFilter !== "all") params.set("stage", stageFilter);
    if (originFilter !== "all") params.set("origin", originFilter);
    if (lifecycleFilter !== "all") params.set("lifecycle", lifecycleFilter);
    if (accessFilter !== "all") params.set("access", accessFilter);
    return params.toString();
  })();

  const effectiveCatalogueMapData = catalogueMapData ?? emptyCatalogueMapData;
  const organisationResultCount = organisationMapResultKeys(
    filteredOrganisationRecords,
    effectiveCatalogueMapData,
    organisationLayer,
    countryFilter,
  ).size;
  const resultCount = view === "deployments"
    ? mapObject === "organisations"
      ? organisationResultCount
      : softwareLayerKeys.size
    : filteredProducts.length;
  const organisationDirectoryHref = buildOrganisationDirectoryHref({
    country: countryFilter,
    group: groupFilter,
    headquarters: headquartersFilter,
    layer: organisationLayer,
    origin: organisationOriginFilter,
    query,
    role: roleFilter,
    scope: scopeFilter,
    sector: sectorFilter,
    segment: segmentFilter,
  });
  const softwareDatabaseParams = new URLSearchParams();
  if (query.trim()) softwareDatabaseParams.set("q", query.trim());
  if (stageFilter !== "all") softwareDatabaseParams.set("stage", stageFilter);
  const softwareDatabaseQuery = softwareDatabaseParams.toString();
  const currentMapParams = new URLSearchParams();
  if (query.trim()) currentMapParams.set("q", query.trim());
  if (categoryFilter !== "all") currentMapParams.set("category", categoryFilter);
  if (evidenceFilter !== "all") currentMapParams.set("evidence", evidenceFilter);
  if (countryFilter !== "all") currentMapParams.set("country", countryFilter);
  if (stageFilter !== "all") currentMapParams.set("stage", stageFilter);
  if (originFilter !== "all") currentMapParams.set("origin", originFilter);
  if (lifecycleFilter !== "all") currentMapParams.set("lifecycle", lifecycleFilter);
  if (accessFilter !== "all") currentMapParams.set("access", accessFilter);
  if (mapObject !== "software") currentMapParams.set("object", mapObject);
  if (softwareLayer !== "all_locations") currentMapParams.set("softwareLocation", softwareLayer);
  if (organisationLayer !== "all_presence") currentMapParams.set("presence", organisationLayer);
  if (initialFocus !== "NG") currentMapParams.set("focus", initialFocus);
  if (initialRepresentation !== "map") currentMapParams.set("representation", initialRepresentation);
  if (groupFilter !== "all") currentMapParams.set("group", groupFilter);
  if (roleFilter !== "all") currentMapParams.set("role", roleFilter);
  if (sectorFilter !== "all") currentMapParams.set("sector", sectorFilter);
  if (segmentFilter !== "all") currentMapParams.set("segment", segmentFilter);
  if (organisationOriginFilter !== "all") currentMapParams.set("orgOrigin", organisationOriginFilter);
  if (headquartersFilter !== "all") currentMapParams.set("headquarters", headquartersFilter);
  if (scopeFilter !== "all") currentMapParams.set("scope", scopeFilter);
  const currentMapQuery = currentMapParams.toString();
  const softwareMapParams = new URLSearchParams();
  if (query.trim()) softwareMapParams.set("q", query.trim());
  if (categoryFilter !== "all") softwareMapParams.set("category", categoryFilter);
  if (evidenceFilter !== "all") softwareMapParams.set("evidence", evidenceFilter);
  if (countryFilter !== "all") softwareMapParams.set("country", countryFilter);
  if (stageFilter !== "all") softwareMapParams.set("stage", stageFilter);
  if (originFilter !== "all") softwareMapParams.set("origin", originFilter);
  if (lifecycleFilter !== "all") softwareMapParams.set("lifecycle", lifecycleFilter);
  if (accessFilter !== "all") softwareMapParams.set("access", accessFilter);
  if (softwareLayer !== "all_locations") softwareMapParams.set("softwareLocation", softwareLayer);
  if (initialFocus !== "NG") softwareMapParams.set("focus", initialFocus);
  if (initialRepresentation !== "map") softwareMapParams.set("representation", initialRepresentation);
  const organisationMapParams = new URLSearchParams({ object: "organisations" });
  if (query.trim()) organisationMapParams.set("q", query.trim());
  if (countryFilter !== "all") organisationMapParams.set("country", countryFilter);
  if (organisationLayer !== "all_presence") organisationMapParams.set("presence", organisationLayer);
  if (initialFocus !== "NG") organisationMapParams.set("focus", initialFocus);
  if (initialRepresentation !== "map") organisationMapParams.set("representation", initialRepresentation);
  if (groupFilter !== "all") organisationMapParams.set("group", groupFilter);
  if (roleFilter !== "all") organisationMapParams.set("role", roleFilter);
  if (sectorFilter !== "all") organisationMapParams.set("sector", sectorFilter);
  if (segmentFilter !== "all") organisationMapParams.set("segment", segmentFilter);
  if (organisationOriginFilter !== "all") organisationMapParams.set("orgOrigin", organisationOriginFilter);
  if (headquartersFilter !== "all") organisationMapParams.set("headquarters", headquartersFilter);
  if (scopeFilter !== "all") organisationMapParams.set("scope", scopeFilter);
  const softwareMapHref = softwareMapParams.toString() ? `/deployments?${softwareMapParams.toString()}` : "/deployments";
  const organisationMapHref = `/deployments?${organisationMapParams.toString()}`;

  const meta = viewMeta[view];
  const pageTitle = view === "deployments"
    ? mapObject === "software" ? "Software by country" : "Organisations by country"
    : meta.title;
  const heroStats = view === "deployments" && mapObject === "software"
    ? [
        [softwareLayerCounts.all_locations, "located records"],
        [softwareLayerCounts.reviewed_deployment, "reviewed deployments"],
        [softwareLayerCounts.africa_wide_coverage, "Africa-wide"],
      ]
    : view === "deployments" && mapObject === "organisations"
      ? [
          [organisationResultCount, "located organisations"],
          [organisationMapResultKeys(filteredOrganisationRecords, emptyCatalogueMapData, organisationLayer, countryFilter).size, "reviewed profiles"],
          [organisationMapResultKeys([], effectiveCatalogueMapData, organisationLayer, countryFilter).size, "catalogue records"],
        ]
    : [
        [stages.length, "stages"],
        [products.length, "products"],
        [deployments.length, "evidence points"],
      ];

  return (
    <main
      className={`v2-experience v2-experience-${view}`}
      id="main-content"
      tabIndex={-1}
    >
      {view === "deployments" ? (
        <>
          <DatabaseHeader
            activeObject={mapObject}
            activeView="map"
            cardsHref={mapObject === "software"
              ? softwareDatabaseQuery ? `/explore?${softwareDatabaseQuery}` : "/explore"
              : organisationDirectoryHref}
            mapHref={currentMapQuery ? `/deployments?${currentMapQuery}` : "/deployments"}
            organisationCount={organisationCatalogue.counts.total}
            organisationsHref={organisationMapHref}
            softwareHref={softwareMapHref}
            softwareCount={landscapeSoftwareItems.length}
            wallHref={mapObject === "software"
              ? softwareDatabaseQuery ? `/landscape?${softwareDatabaseQuery}` : "/landscape"
              : "/landscape?object=organisations"}
          />
          <section className="landscape-scoreboard map-database-scoreboard" aria-label="Map totals">
            {heroStats.map(([value, label]) => (
              <div key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </section>
        </>
      ) : <section className="v2-experience-hero">
        <div className="v2-hero-copy">
          <h1>{pageTitle}</h1>
        </div>
        <div className="v2-hero-side">
          <div className="v2-hero-stats">
            {heroStats.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <Link className="v2-hero-contribute" href="/contribute">
            <span>
              <strong>Improve the map</strong>
              <small>Submit data</small>
            </span>
            <i aria-hidden="true">↗</i>
          </Link>
        </div>
      </section>}

      <CommandBar
        activeFilters={activeFilters}
        clearFilters={clearFilters}
        filtersOpen={filtersOpen}
        query={query}
        resultCount={resultCount}
        setFiltersOpen={setFiltersOpen}
        setQuery={(value) => setQuery(value)}
        submitQuery={() => updateUrl({ q: query })}
      />

      {filtersOpen ? (
        <FilterPanel
          categoryFilter={categoryFilter}
          catalogueMode={false}
          catalogueOptions={catalogueMapOptions}
          close={() => setFiltersOpen(false)}
          countryFilter={countryFilter}
          evidenceFilter={evidenceFilter}
          originFilter={originFilter}
          lifecycleFilter={lifecycleFilter}
          accessFilter={accessFilter}
          groupFilter={groupFilter}
          headquartersFilter={headquartersFilter}
          organisationMode={view === "deployments" && mapObject === "organisations"}
          organisationOriginFilter={organisationOriginFilter}
          organisationOrigins={organisationOrigins}
          resultCount={resultCount}
          roleFilter={roleFilter}
          scopeFilter={scopeFilter}
          sectorFilter={sectorFilter}
          segmentFilter={segmentFilter}
          stageFilter={stageFilter}
          setCategoryFilter={(value) => {
            setCategoryFilter(value);
            updateUrl({ category: value });
          }}
          setCountryFilter={(value) => {
            setCountryFilter(value);
            updateUrl({ country: value });
          }}
          setStageFilter={(value) => {
            setStageFilter(value);
            updateUrl({ stage: value });
          }}
          setEvidenceFilter={(value) => {
            setEvidenceFilter(value);
            updateUrl({ evidence: value });
          }}
          setOriginFilter={(value) => {
            setOriginFilter(value);
            updateUrl({ origin: value });
          }}
          setLifecycleFilter={(value) => {
            setLifecycleFilter(value);
            updateUrl({ lifecycle: value });
          }}
          setAccessFilter={(value) => {
            setAccessFilter(value);
            updateUrl({ access: value });
          }}
          setGroupFilter={(value) => {
            setGroupFilter(value);
            updateUrl({ group: value });
          }}
          setRoleFilter={(value) => {
            setRoleFilter(value);
            updateUrl({ role: value });
          }}
          setSectorFilter={(value) => {
            setSectorFilter(value);
            updateUrl({ sector: value });
          }}
          setSegmentFilter={(value) => {
            setSegmentFilter(value);
            updateUrl({ segment: value });
          }}
          setOrganisationOriginFilter={(value) => {
            setOrganisationOriginFilter(value);
            updateUrl({ orgOrigin: value });
          }}
          setHeadquartersFilter={(value) => {
            setHeadquartersFilter(value);
            updateUrl({ headquarters: value });
          }}
          setScopeFilter={(value) => {
            setScopeFilter(value);
            updateUrl({ scope: value });
          }}
        />
      ) : null}

      {view === "stack" ? (
        <StackView
          filteredProducts={filteredProducts}
          initialCategory={initialCategory}
          onOpenProduct={openProduct}
          preservedSearch={preservedSearch}
          query={query}
        />
      ) : null}
      {view === "deployments" ? (
        <DeploymentsView
          catalogueMapData={effectiveCatalogueMapData}
          countryFilter={countryFilter}
          filteredOrganisationRecords={filteredOrganisationRecords}
          softwareMapIndex={softwareMapIndex}
          softwareLayer={softwareLayer}
          softwareLayerCounts={softwareLayerCounts}
          initialFocus={initialFocus}
          initialRepresentation={initialRepresentation}
          objectMode={mapObject}
          organisationDirectoryHref={organisationDirectoryHref}
          organisationLayer={organisationLayer}
          roleFilter={roleFilter}
          sectorFilter={sectorFilter}
          segmentFilter={segmentFilter}
          onFocusCountry={(focus) => updateUrl({ focus })}
          onSoftwareLayerChange={(softwareLocation) => {
            setSoftwareLayer(softwareLocation);
            updateUrl({ softwareLocation });
          }}
          onOrganisationLayerChange={(presence) => {
            setOrganisationLayer(presence);
            updateUrl({ presence });
          }}
          onCountryFilterChange={(country) => {
            setCountryFilter(country);
            updateUrl({ country, focus: country === "all" ? initialFocus : country });
          }}
          onRoleFilterChange={(role) => {
            setRoleFilter(role);
            updateUrl({ role });
          }}
          onSectorFilterChange={(sector) => {
            setSectorFilter(sector);
            updateUrl({ sector });
          }}
          onSegmentFilterChange={(segment) => {
            setSegmentFilter(segment);
            updateUrl({ segment });
          }}
          onRepresentationChange={(representation) => updateUrl({ representation })}
          onOpenProduct={openProduct}
          onOpenOrganisation={openOrganisation}
          preservedSearch={preservedSearch}
        />
      ) : null}
      {view === "directory" ? (
        <DirectoryView
          activeFilters={activeFilters}
          filteredProducts={filteredProducts}
          onOpenProduct={openProduct}
        />
      ) : null}

      {selectedProduct ? (
        <ProductPreview
          close={() => {
            setSelectedProduct(null);
            openerRef.current?.focus();
          }}
          product={selectedProduct}
          organisationLinks={canonicalOrganisationLinks}
        />
      ) : null}
      {selectedOrganisation ? (
        <OrganisationPreview
          close={() => {
            setSelectedOrganisation(null);
            openerRef.current?.focus();
          }}
          target={selectedOrganisation}
        />
      ) : null}
    </main>
  );
}

function CommandBar({
  activeFilters,
  clearFilters,
  filtersOpen,
  query,
  resultCount,
  setFiltersOpen,
  setQuery,
  submitQuery,
}: {
  activeFilters: string[];
  clearFilters: () => void;
  filtersOpen: boolean;
  query: string;
  resultCount: number;
  setFiltersOpen: (value: boolean) => void;
  setQuery: (value: string) => void;
  submitQuery: () => void;
}) {
  return (
    <div className="v2-command-wrap">
      <div className="v2-command-bar">
        <label>
          <span className="sr-only">Search this view</span>
          <i aria-hidden="true">⌕</i>
          <input
            onBlur={submitQuery}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitQuery();
            }}
            placeholder="Search this view"
            type="search"
            value={query}
          />
        </label>
        <span className="v2-command-count" aria-live="polite">
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </span>
        <button
          aria-expanded={filtersOpen}
          className={activeFilters.length ? "has-filters" : ""}
          onClick={() => setFiltersOpen(true)}
          type="button"
        >
          <span aria-hidden="true">≡</span>
          Filter
          {activeFilters.length ? <i>{activeFilters.length}</i> : null}
        </button>
      </div>
      {activeFilters.length ? (
        <div className="v2-active-filters">
          {activeFilters.map((filter) => (
            <span key={filter}>{filter}</span>
          ))}
          <button onClick={clearFilters} type="button">
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FilterPanel({
  accessFilter,
  catalogueMode,
  catalogueOptions,
  categoryFilter,
  close,
  countryFilter,
  evidenceFilter,
  groupFilter,
  headquartersFilter,
  lifecycleFilter,
  organisationMode,
  organisationOriginFilter,
  organisationOrigins,
  originFilter,
  resultCount,
  roleFilter,
  scopeFilter,
  sectorFilter,
  segmentFilter,
  setAccessFilter,
  setCategoryFilter,
  setCountryFilter,
  setEvidenceFilter,
  setGroupFilter,
  setHeadquartersFilter,
  setLifecycleFilter,
  setOrganisationOriginFilter,
  setOriginFilter,
  setRoleFilter,
  setScopeFilter,
  setSectorFilter,
  setSegmentFilter,
  setStageFilter,
  stageFilter,
}: {
  accessFilter: string;
  catalogueMode: boolean;
  catalogueOptions?: OrganisationCataloguePage["options"];
  categoryFilter: string;
  close: () => void;
  countryFilter: string;
  evidenceFilter: string;
  groupFilter: string;
  headquartersFilter: string;
  lifecycleFilter: string;
  organisationMode: boolean;
  organisationOriginFilter: string;
  organisationOrigins: string[];
  originFilter: string;
  resultCount: number;
  roleFilter: string;
  scopeFilter: string;
  sectorFilter: string;
  segmentFilter: string;
  setAccessFilter: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setCountryFilter: (value: string) => void;
  setEvidenceFilter: (value: string) => void;
  setGroupFilter: (value: string) => void;
  setHeadquartersFilter: (value: string) => void;
  setLifecycleFilter: (value: string) => void;
  setOrganisationOriginFilter: (value: string) => void;
  setOriginFilter: (value: string) => void;
  setRoleFilter: (value: string) => void;
  setScopeFilter: (value: string) => void;
  setSectorFilter: (value: string) => void;
  setSegmentFilter: (value: string) => void;
  setStageFilter: (value: string) => void;
  stageFilter: string;
}) {
  const accessModels = Array.from(
    new Set(products.map((product) => product.accessModel)),
  ).sort();
  const lifecycleStates = Array.from(
    new Set(products.map((product) => product.lifecycle)),
  ).sort();
  return (
    <div className="v2-overlay" onMouseDown={close}>
      <section
        aria-labelledby="v2-filter-title"
        aria-modal="true"
        className="v2-filter-panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="v2-sheet-top">
          <span id="v2-filter-title">Filter {organisationMode ? "organisations" : "software"}</span>
          <button onClick={close} type="button">Close</button>
        </div>
        <div className="v2-filter-fields">
          {organisationMode ? catalogueMode ? (
            <>
              <FilterSelect label="Actor role" onChange={setRoleFilter} value={roleFilter}>
                <option value="all">All actor roles</option>
                {(catalogueOptions?.roles ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
              </FilterSelect>
              <FilterSelect label="Energy market" onChange={setSegmentFilter} value={segmentFilter}>
                <option value="all">All energy markets</option>
                {(catalogueOptions?.segments ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
              </FilterSelect>
              <FilterSelect label="Headquarters" onChange={setHeadquartersFilter} value={headquartersFilter}>
                <option value="all">All headquarters</option>
                {(catalogueOptions?.headquarters ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
              </FilterSelect>
              <FilterSelect label="Review layer" onChange={setScopeFilter} value={scopeFilter}>
                <option value="all">All listings</option>
                <option value="africa_hq">Africa-headquartered</option>
                <option value="international">International, active in Africa</option>
                <option value="reviewed">Reviewed profiles</option>
                <option value="pending">Review pending</option>
              </FilterSelect>
            </>
          ) : (
            <>
              <FilterSelect label="Country" onChange={setCountryFilter} value={countryFilter}>
                <option value="all">All countries</option>
                {africanCountries.map(([iso2, name]) => <option key={iso2} value={iso2}>{name}</option>)}
              </FilterSelect>
              <FilterSelect label="Actor group" onChange={setGroupFilter} value={groupFilter}>
                <option value="all">All actor groups</option>
                {organisationEcosystemGroups.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Specific role" onChange={setRoleFilter} value={roleFilter}>
                <option value="all">All specific roles</option>
                {organisationRoles.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Broad sector" onChange={setSectorFilter} value={sectorFilter}>
                <option value="all">All broad sectors</option>
                {organisationSectors.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Energy market" onChange={setSegmentFilter} value={segmentFilter}>
                <option value="all">All energy markets</option>
                {organisationSegments.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Organisation origin" onChange={setOrganisationOriginFilter} value={organisationOriginFilter}>
                <option value="all">All origins</option>
                {organisationOrigins.map((value) => <option key={value} value={value}>{value}</option>)}
              </FilterSelect>
              <FilterSelect label="Headquarters" onChange={setHeadquartersFilter} value={headquartersFilter}>
                <option value="all">All headquarters</option>
                {(catalogueOptions?.headquarters ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
              </FilterSelect>
              <FilterSelect label="Review layer" onChange={setScopeFilter} value={scopeFilter}>
                <option value="all">All listings</option>
                <option value="africa_hq">Africa-headquartered</option>
                <option value="international">International, active in Africa</option>
                <option value="reviewed">Reviewed profiles</option>
                <option value="pending">Review pending</option>
              </FilterSelect>
            </>
          ) : (
            <>
              <FilterSelect label="Country" onChange={setCountryFilter} value={countryFilter}>
                <option value="all">All countries</option>
                {africanCountries.map(([iso2, name]) => <option key={iso2} value={iso2}>{name}</option>)}
              </FilterSelect>
              <FilterSelect label="Stage" onChange={setStageFilter} value={stageFilter}>
                <option value="all">All stages</option>
                {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Category" onChange={setCategoryFilter} value={categoryFilter}>
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Evidence" onChange={setEvidenceFilter} value={evidenceFilter}>
                <option value="all">All evidence</option>
                {Object.entries(evidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </FilterSelect>
              <FilterSelect label="Origin" onChange={setOriginFilter} value={originFilter}>
                <option value="all">All origins</option>
                {Object.entries(originLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </FilterSelect>
              <FilterSelect label="Lifecycle" onChange={setLifecycleFilter} value={lifecycleFilter}>
                <option value="all">All lifecycle states</option>
                {lifecycleStates.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
              </FilterSelect>
              <FilterSelect label="Access" onChange={setAccessFilter} value={accessFilter}>
                <option value="all">All access models</option>
                {accessModels.map((value) => <option key={value} value={value}>{value}</option>)}
              </FilterSelect>
            </>
          )}
        </div>
        <button className="v2-panel-apply" onClick={close} type="button">
          Show {resultCount} {resultCount === 1 ? "result" : "results"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}

function FilterSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function StackView({
  filteredProducts,
  initialCategory,
  onOpenProduct,
  preservedSearch,
  query,
}: {
  filteredProducts: Product[];
  initialCategory: string;
  onOpenProduct: (product: Product, element: HTMLElement) => void;
  preservedSearch: string;
  query: string;
}) {
  const requestedStage =
    categories.find((category) => category.id === initialCategory)?.stageId ??
    "stage_transmit_distribute";
  const [selectedStage, setSelectedStage] = useState(requestedStage);
  const selectedHasResults = filteredProducts.some(
    (product) => product.stageId === selectedStage,
  );
  const effectiveSelectedStage =
    query && !selectedHasResults && filteredProducts[0]
      ? filteredProducts[0].stageId
      : selectedStage;
  const selectedIndex = stages.findIndex(
    (stage) => stage.id === effectiveSelectedStage,
  );

  return (
    <section className="v2-stack-canvas">
      <div className="v2-stage-route" aria-label="Software functional stages">
        <div className="v2-route-line" aria-hidden="true">
          <i style={{ width: `${(selectedIndex / (stages.length - 1)) * 100}%` }} />
        </div>
        {stages.map((stage) => {
          const count = filteredProducts.filter(
            (product) => product.stageId === stage.id,
          ).length;
          return (
            <button
              aria-pressed={stage.id === effectiveSelectedStage}
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              type="button"
            >
              <span>{String(stage.order).padStart(2, "0")}</span>
              <i aria-hidden="true" />
              <strong>{stage.name}</strong>
              <small>{count || "—"}</small>
            </button>
          );
        })}
      </div>

      <div className="v2-stage-scenes">
        {stages.map((stage) => {
          const stageCategories = categories.filter(
            (category) => category.stageId === stage.id,
          );
          const stageProducts = filteredProducts.filter(
            (product) => product.stageId === stage.id,
          );
          const active = stage.id === effectiveSelectedStage;
          return (
            <section
              aria-labelledby={`v2-stage-${stage.id}`}
              className="v2-stage-scene"
              hidden={!active}
              key={stage.id}
            >
              <div className="v2-stage-title">
                <span>{String(stage.order).padStart(2, "0")}</span>
                <div>
                  <h2 id={`v2-stage-${stage.id}`}>{stage.name}</h2>
                  <p>
                    {stageProducts.length}{" "}
                    {stageProducts.length === 1 ? "product" : "products"} ·{" "}
                    {stageCategories.length}{" "}
                    {stageCategories.length === 1 ? "category" : "categories"}
                  </p>
                </div>
              </div>

              <div className="v2-category-field">
                {stageCategories.map((category, categoryIndex) => {
                  const categoryProducts = filteredProducts.filter(
                    (product) => product.categoryId === category.id,
                  );
                  const visibleProducts = categoryProducts.slice(
                    0,
                    query ? 6 : 4,
                  );
                  return (
                    <article
                      className={`v2-category-card v2-market-${category.marketCondition}`}
                      key={category.id}
                      style={{ "--card-index": categoryIndex } as CSSProperties}
                    >
                      <header>
                        <span className="v2-market-signal" aria-hidden="true" />
                        <h3><Link href={`/explore?category=${category.id}`}>{category.name}</Link></h3>
                        <span>{categoryProducts.length || "—"}</span>
                      </header>
                      {categoryProducts.length ? (
                        <div className="v2-product-orbits">
                          {visibleProducts.map((product) => (
                            <ProductOrb
                              key={product.id}
                              onOpenProduct={onOpenProduct}
                              product={product}
                            />
                          ))}
                          {categoryProducts.length > visibleProducts.length ? (
                            <Link
                              className="v2-category-more"
                              href={withSearchParam(
                                "/directory",
                                preservedSearch,
                                "category",
                                category.id,
                              )}
                            >
                              View all {categoryProducts.length} products
                              <span aria-hidden="true">→</span>
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <div className="v2-category-empty">
                          <span aria-hidden="true">＋</span>
                          <strong>
                            {category.researchState === "structurally_thin"
                              ? "Thin market"
                              : "Researching"}
                          </strong>
                          <Link href="/contribute/product">Add lead</Link>
                        </div>
                      )}
                      <details>
                        <summary>Market note</summary>
                        <p>{category.verdict}</p>
                      </details>
                    </article>
                  );
                })}
              </div>

              <div className="v2-stage-next">
                <button
                  disabled={selectedIndex === 0}
                  onClick={() =>
                    setSelectedStage(stages[Math.max(0, selectedIndex - 1)].id)
                  }
                  type="button"
                >
                  ←
                  <span className="sr-only">Previous stage</span>
                </button>
                <span>
                  {selectedIndex + 1} / {stages.length}
                </span>
                <button
                  disabled={selectedIndex === stages.length - 1}
                  onClick={() =>
                    setSelectedStage(
                      stages[Math.min(stages.length - 1, selectedIndex + 1)].id,
                    )
                  }
                  type="button"
                >
                  →
                  <span className="sr-only">Next stage</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="v2-cross-cutting">
        <span>∞</span>
        <strong>Data · interoperability · security</strong>
        <small>Across every stage</small>
        <Link href="/explore?category=cat_data_interoperability_security">Open →</Link>
      </div>
    </section>
  );
}

function ProductOrb({
  onOpenProduct,
  product,
}: {
  onOpenProduct: (product: Product, element: HTMLElement) => void;
  product: Product;
}) {
  const evidenceCount = deployments.filter(
    (deployment) => deployment.productId === product.id,
  ).length;
  return (
    <article className="v2-product-orb">
      <ProductMark
        organisationId={product.organisationId}
        organisationName={product.organisation}
        productId={product.id}
        productName={product.name}
        size={34}
      />
      <span>
        <Link href={`/products/${product.slug}`}><strong>{product.name}</strong></Link>
        <small><OrganisationLink product={product} /></small>
      </span>
      <button
        aria-label={`Preview ${product.name} by ${product.organisation}, ${evidenceCount} evidenced deployments`}
        onClick={(event) => onOpenProduct(product, event.currentTarget)}
        type="button"
      >
        <i aria-hidden="true">{evidenceCount ? evidenceCount : "·"}</i>
      </button>
    </article>
  );
}

function DeploymentsView({
  catalogueMapData,
  countryFilter,
  filteredOrganisationRecords,
  initialFocus,
  initialRepresentation,
  objectMode,
  organisationDirectoryHref,
  organisationLayer,
  roleFilter,
  sectorFilter,
  segmentFilter,
  softwareLayer,
  softwareLayerCounts,
  softwareMapIndex,
  onCountryFilterChange,
  onFocusCountry,
  onOpenProduct,
  onOpenOrganisation,
  onOrganisationLayerChange,
  onRoleFilterChange,
  onSectorFilterChange,
  onSegmentFilterChange,
  onSoftwareLayerChange,
  onRepresentationChange,
  preservedSearch,
}: {
  catalogueMapData: OrganisationCatalogueMapData;
  countryFilter: string;
  filteredOrganisationRecords: OrganisationDirectoryRecord[];
  initialFocus: string;
  initialRepresentation: string;
  objectMode: "software" | "organisations";
  organisationDirectoryHref: string;
  organisationLayer: OrganisationMapLayer;
  roleFilter: string;
  sectorFilter: string;
  segmentFilter: string;
  softwareLayer: SoftwareMapLayer;
  softwareLayerCounts: Record<SoftwareMapLayer, number>;
  softwareMapIndex: SoftwareMapIndex;
  onCountryFilterChange: (value: string) => void;
  onFocusCountry: (iso2: string) => void;
  onOpenProduct: (product: Product, element: HTMLElement) => void;
  onOpenOrganisation: (record: OrganisationPreviewTarget, element: HTMLElement) => void;
  onOrganisationLayerChange: (value: OrganisationMapLayer) => void;
  onRoleFilterChange: (value: string) => void;
  onSectorFilterChange: (value: string) => void;
  onSegmentFilterChange: (value: string) => void;
  onSoftwareLayerChange: (value: SoftwareMapLayer) => void;
  onRepresentationChange: (value: "map" | "grid") => void;
  preservedSearch: string;
}) {
  const [representation, setRepresentation] = useState<"map" | "grid">(
    isMapRepresentation(initialRepresentation) ? initialRepresentation : "map",
  );
  const [selectedCountry, setSelectedCountry] = useState(
    africanCountries.some(([iso2]) => iso2 === initialFocus) ? initialFocus : "NG",
  );
  function selectCountry(iso2: string) {
    setSelectedCountry(iso2);
    onFocusCountry(iso2);
  }
  const softwareResultCount = softwareKeysForLayer(
    softwareMapIndex,
    softwareLayer,
    countryFilter,
  ).size;
  const organisationResultCount = organisationMapResultKeys(
    filteredOrganisationRecords,
    catalogueMapData,
    organisationLayer,
    countryFilter,
  ).size;
  const assessedCountries = new Set(africanCountries.map(([iso2]) => iso2));

  function countryObjectIds(iso2: string) {
    if (objectMode === "software") {
      if (countryFilter !== "all" && countryFilter !== iso2) {
        return new Set<string>();
      }
      return new Set(
        softwareEntitiesForCountry(softwareMapIndex, iso2, softwareLayer)
          .map((entity) => entity.key),
      );
    }
    if (countryFilter !== "all" && countryFilter !== iso2) return new Set<string>();
    const ids = new Set<string>();
    if (organisationLayer !== "catalogue") {
      for (const record of filteredOrganisationRecords) {
        if (organisationLayerCountries(record, organisationLayer).includes(iso2)) {
          ids.add(`/organisations/${record.organisation.slug}`);
        }
      }
    }
    if (["catalogue", "africa_wide", "all_presence", "headquarters"].includes(organisationLayer)) {
      const country = catalogueMapData.countries[iso2];
      const catalogueKeys = organisationLayer === "catalogue"
        ? country?.activityRecordKeys ?? []
        : organisationLayer === "africa_wide"
          ? country?.africaWideRecordKeys ?? []
        : organisationLayer === "headquarters"
          ? country?.headquartersRecordKeys ?? []
          : country?.recordKeys ?? [];
      for (const key of catalogueKeys) ids.add(key);
    }
    return ids;
  }
  function countryObjectCount(iso2: string) {
    return countryObjectIds(iso2).size;
  }
  const mapCountries = africanCountries
    .map(([iso2, name]) => ({
      iso2,
      name,
      count: countryObjectCount(iso2),
      assessed: assessedCountries.has(iso2),
    }));
  const selected = africanCountries.find(([iso2]) => iso2 === selectedCountry);
  const selectedSoftwareEntities = countryFilter !== "all" && countryFilter !== selectedCountry
    ? []
    : softwareEntitiesForCountry(softwareMapIndex, selectedCountry, softwareLayer);
  const selectedOrganisationRecords = filteredOrganisationRecords
    .filter((record) =>
      organisationLayerCountries(record, organisationLayer).includes(selectedCountry),
    )
    .sort((left, right) => left.organisation.name.localeCompare(right.organisation.name));
  const selectedCanonicalHrefs = new Set(
    selectedOrganisationRecords.map((record) => `/organisations/${record.organisation.slug}`),
  );
  const selectedCatalogueListings = (catalogueMapData.countries[selectedCountry]?.records ?? [])
    .filter((record) => {
      if (organisationLayer === "all_presence") return true;
      if (organisationLayer === "catalogue") return record.locationTypes.includes("catalogue_activity");
      if (organisationLayer === "africa_wide") return record.locationTypes.includes("africa_wide");
      if (organisationLayer === "headquarters") return record.locationTypes.includes("headquarters");
      return false;
    })
    .filter((record) => !record.canonicalHref || !selectedCanonicalHrefs.has(record.canonicalHref))
    .sort((left, right) => left.name.localeCompare(right.name));
  const selectedOrganisationGroups = (() => {
    const values: Array<
      | { kind: "canonical"; role: string; record: OrganisationDirectoryRecord; catalogueLocationTypes: CatalogueMapOrganisation["locationTypes"] }
      | { kind: "catalogue"; role: string; record: CatalogueMapOrganisation }
    > = selectedOrganisationRecords.map((record) => ({
      kind: "canonical",
      role: organisationRoleName(record.primaryRole.id),
      record,
      catalogueLocationTypes: catalogueMapData.countries[selectedCountry]?.records
        .find((item) => item.canonicalHref === `/organisations/${record.organisation.slug}`)?.locationTypes ?? [],
    }));
    values.push(...selectedCatalogueListings.map((record) => ({
      kind: "catalogue" as const,
      role: record.primaryRole || "Other and to classify",
      record,
    })));
    const groups = new Map<string, typeof values>();
    for (const value of values) groups.set(value.role, [...(groups.get(value.role) ?? []), value]);
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  })();
  const selectedObjectCount = countryObjectCount(selectedCountry);
  const countryRecordParams = new URLSearchParams({
    view: objectMode === "software" ? "software" : "organisations",
  });
  if (objectMode === "software" && softwareLayer !== "all_locations") {
    countryRecordParams.set("softwareLocation", softwareLayer);
  }
  if (objectMode === "organisations") {
    if (organisationLayer !== "all_presence") countryRecordParams.set("presence", organisationLayer);
    if (roleFilter !== "all") countryRecordParams.set("role", roleFilter);
    if (sectorFilter !== "all") countryRecordParams.set("sector", sectorFilter);
    if (segmentFilter !== "all") countryRecordParams.set("segment", segmentFilter);
  }
  const selectedCountryHref = `/countries/${selectedCountry.toLowerCase()}?${countryRecordParams.toString()}`;
  const mappedObjectLabel = objectMode === "software"
    ? softwareLayer === "africa_wide_coverage"
      ? "Africa-wide software with named locations"
      : "software records"
    : organisationLayer === "catalogue"
      ? "organisations with documented country activity"
      : organisationLayer === "africa_wide"
        ? "Africa-wide organisations with named locations"
      : `${organisationMapLayerLabel(organisationLayer).toLowerCase()} organisations`;
  return (
    <section className="v2-map-canvas">
      <div className="v2-map-controls">
        {objectMode === "software" ? (
          <div className="v2-map-organisation-tools">
            <label className="v2-map-layer-select">
              <span>Location</span>
              <select
                aria-label="Software location layer"
                onChange={(event) => onSoftwareLayerChange(event.target.value as SoftwareMapLayer)}
                value={softwareLayer}
              >
                {softwareMapLayers.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <Link className="v2-map-filtered-link" href={preservedSearch ? `/directory?${preservedSearch}` : "/directory"}>Reviewed data →</Link>
            <Link className="v2-map-filtered-link" href="/landscape">Catalogue →</Link>
          </div>
        ) : (
          <div className="v2-map-organisation-tools v2-map-organisation-facets">
            <label className="v2-map-layer-select">
              <span>Presence</span>
              <select
                aria-label="Organisation presence layer"
                onChange={(event) => onOrganisationLayerChange(event.target.value as OrganisationMapLayer)}
                value={organisationLayer}
              >
                {organisationMapLayers.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="v2-map-layer-select">
              <span>Role</span>
              <select
                aria-label="Organisation role"
                onChange={(event) => onRoleFilterChange(event.target.value)}
                value={roleFilter}
              >
                <option value="all">All roles</option>
                {organisationRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <label className="v2-map-layer-select">
              <span>Sector</span>
              <select
                aria-label="Organisation sector"
                onChange={(event) => onSectorFilterChange(event.target.value)}
                value={sectorFilter}
              >
                <option value="all">All sectors</option>
                {organisationSectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                ))}
              </select>
            </label>
            <label className="v2-map-layer-select">
              <span>Market</span>
              <select
                aria-label="Organisation energy market"
                onChange={(event) => onSegmentFilterChange(event.target.value)}
                value={segmentFilter}
              >
                <option value="all">All energy markets</option>
                {organisationSegments.map((segment) => (
                  <option key={segment.id} value={segment.id}>{segment.name}</option>
                ))}
              </select>
            </label>
            <label className="v2-map-layer-select">
              <span>Country</span>
              <select
                aria-label="Organisation country"
                onChange={(event) => onCountryFilterChange(event.target.value)}
                value={countryFilter}
              >
                <option value="all">All countries</option>
                {africanCountries.map(([iso2, name]) => (
                  <option key={iso2} value={iso2}>{name}</option>
                ))}
              </select>
            </label>
            <Link className="v2-map-filtered-link" href={organisationDirectoryHref}>Filtered directory →</Link>
          </div>
        )}
        <div className="v2-representation-switch" role="group" aria-label="Map representation">
          <button
            aria-pressed={representation === "map"}
            onClick={() => {
              setRepresentation("map");
              onRepresentationChange("map");
            }}
            type="button"
          >
            Map
          </button>
          <button
            aria-pressed={representation === "grid"}
            onClick={() => {
              setRepresentation("grid");
              onRepresentationChange("grid");
            }}
            type="button"
          >
            Grid
          </button>
        </div>
      </div>

      <div className="v2-map-stage">
        <section className="v2-map-visual" aria-label="African country data view">
          <div className="v2-map-caption">
            <span>{objectMode === "software" ? softwareMapLayerLabel(softwareLayer) : organisationMapLayerLabel(organisationLayer)}</span>
            <strong>
              {objectMode === "software"
                ? softwareLayer === "africa_wide_coverage"
                  ? `${softwareResultCount} regional coverage records`
                  : `${softwareResultCount} located software records`
                : `${organisationResultCount} located organisations`}
            </strong>
          </div>

          {objectMode === "software" ? (
            <div aria-label="Software location type totals" className="v2-map-coverage">
              <span className="v2-map-location-totals">
                <i className="reviewed">{softwareLayerCounts.reviewed_deployment} reviewed deployments</i>
                <i className="catalogue">{softwareLayerCounts.catalogue_location} catalogue locations</i>
                <i className="catalogue">{softwareLayerCounts.africa_wide_coverage} Africa-wide</i>
                <i className="headquarters">{softwareLayerCounts.publisher_headquarters} publisher HQ</i>
              </span>
              <small>Africa-wide records are plotted only where a country is named.</small>
              <span className="v2-map-coverage-links">
                <Link href="/contribute/deployment">Add a location</Link>
              </span>
            </div>
          ) : (
            <div aria-label="Organisation location guidance" className="v2-map-coverage">
              <small>Africa-wide stays regional. Countries appear only where a source names activity, an office, entity, project, deployment, availability or headquarters.</small>
              <span className="v2-map-coverage-links"><Link href="/contribute/organisation">Add a presence</Link></span>
            </div>
          )}

          {representation === "map" ? (
            <AfricaCountryMap
              countries={mapCountries}
              objectLabel={mappedObjectLabel}
              selectedCountry={selectedCountry}
              setSelectedCountry={selectCountry}
            />
          ) : (
            <div
              aria-label="African countries, equal-area grid"
              className="v2-country-field"
            >
              {africanCountries.map(([iso2, name], index) => {
                const count = countryObjectCount(iso2);
                return (
                  <button
                    aria-label={`${name}: ${count} ${mappedObjectLabel}`}
                    aria-pressed={selectedCountry === iso2}
                    className={countClass(count)}
                    key={iso2}
                    onClick={() => selectCountry(iso2)}
                    style={{ "--tile-index": index } as CSSProperties}
                    type="button"
                  >
                    <span>{iso2}</span>
                    {count ? <strong>{count}</strong> : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="v2-map-legend">
            <span><i className="known" /> {mappedObjectLabel}</span>
            <span><i className="unknown" /> no matching recorded location</span>
          </div>
        </section>

        <aside className="v2-country-panel">
          <header>
            <span>{selectedCountry}</span>
            <div>
              <h2><Link href={selectedCountryHref}>{selected?.[1] ?? selectedCountry}</Link></h2>
              <p>{selectedObjectCount} {objectMode === "software" ? "software records" : "organisations"}</p>
            </div>
          </header>

          {selectedObjectCount ? (
            <>
              <div className="v2-country-score"><small>{objectMode === "software" ? softwareMapLayerLabel(softwareLayer) : organisationMapLayerLabel(organisationLayer)}</small></div>
              <div className="v2-deployment-list v2-map-result-list">
                {objectMode === "software" ? selectedSoftwareEntities.map((entity) => {
                  const locationTypes = entity.locationTypesByCountry.get(selectedCountry) ?? new Set<SoftwareLocationType>();
                  return (
                    <article key={entity.key}>
                      <span className="v2-deployment-entity">
                        {entity.product ? <ProductMark
                          organisationId={entity.product.organisationId}
                          organisationName={entity.product.organisation}
                          productId={entity.product.id}
                          productName={entity.product.name}
                          size={30}
                        /> : <OrganisationMark name={entity.organisation} organisationId={entity.key} size={30} />}
                        <span>
                          <Link href={entity.href}><strong>{entity.name}</strong></Link>
                          <small>{entity.organisation}</small>
                        </span>
                      </span>
                      <b title={Array.from(locationTypes).map(softwareLocationTypeLabel).join(", ")}>{softwareLocationTypeShortLabel(locationTypes)}</b>
                      {entity.product ? <button
                        aria-label={`Preview ${entity.product.name}`}
                        onClick={(event) => onOpenProduct(entity.product!, event.currentTarget)}
                        type="button"
                      ><i aria-hidden="true">↗</i></button> : <Link aria-label={`Open ${entity.name}`} href={entity.href}><i aria-hidden="true">→</i></Link>}
                    </article>
                  );
                }) : selectedOrganisationGroups.map(([role, items]) => (
                  <section className="v2-map-result-group" key={role}>
                    <header><strong>{role}</strong><span>{items.length}</span></header>
                    {items.map((item) => {
                      if (item.kind === "canonical") {
                        const record = item.record;
                        const types = organisationLocationTypesForCountry(record, selectedCountry);
                        return <article key={record.organisation.id}>
                          <span className="v2-deployment-entity"><OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={30} /><span><Link href={`/organisations/${record.organisation.slug}`}><strong>{record.organisation.name}</strong></Link><small>{organisationLocationTypeShortSummary(types, item.catalogueLocationTypes)}</small></span></span>
                          <b>Reviewed</b>
                          <button aria-label={`Preview ${record.organisation.name}`} onClick={(event) => onOpenOrganisation({ kind: "canonical", countryIso2: selectedCountry, record, catalogueLocationTypes: item.catalogueLocationTypes }, event.currentTarget)} type="button"><i aria-hidden="true">＋</i></button>
                        </article>;
                      }
                      const organisation = item.record;
                      return <article key={organisation.id}>
                        <span className="v2-deployment-entity"><OrganisationMark name={organisation.name} organisationId={organisation.id} size={30} /><span>{organisation.canonicalHref ? <Link href={organisation.canonicalHref}><strong>{organisation.name}</strong></Link> : <button className="v2-map-name-button" onClick={(event) => onOpenOrganisation({ kind: "catalogue", countryIso2: selectedCountry, record: organisation }, event.currentTarget)} type="button"><strong>{organisation.name}</strong></button>}<small>{catalogueLocationTypeShortSummary(organisation.locationTypes)}</small></span></span>
                        <b>{organisation.reviewState === "reviewed" ? "Reviewed" : "Catalogue"}</b>
                        <button aria-label={`Preview ${organisation.name}`} onClick={(event) => onOpenOrganisation({ kind: "catalogue", countryIso2: selectedCountry, record: organisation }, event.currentTarget)} type="button"><i aria-hidden="true">＋</i></button>
                      </article>;
                    })}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div className="v2-country-unknown">
              <span aria-hidden="true">0</span>
              <strong>No recorded locations match this view.</strong>
              <Link href={objectMode === "software" ? "/contribute/deployment" : "/contribute/organisation"}>Add a location →</Link>
            </div>
          )}

          <Link
            className="v2-country-open"
            href={selectedCountryHref}
          >
            Open complete country directory <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </section>
  );
}

type MapCountryRow = {
  iso2: string;
  name: string;
  count: number;
  assessed: boolean;
};

type OrganisationMapLayer =
  | "all_presence"
  | "catalogue"
  | "africa_wide"
  | "evidenced"
  | "company_stated"
  | "software_linked"
  | "offices"
  | "availability"
  | "headquarters"
  | "origin";

const organisationMapLayers: Array<[OrganisationMapLayer, string]> = [
  ["all_presence", "All recorded presence"],
  ["catalogue", "Documented country activity"],
  ["africa_wide", "Africa-wide · named locations"],
  ["evidenced", "Evidenced activity"],
  ["company_stated", "Company-stated"],
  ["software_linked", "Software deployed"],
  ["offices", "Offices, warehouses and entities"],
  ["availability", "Product availability"],
  ["headquarters", "Headquarters"],
  ["origin", "Country of origin"],
];

function isOrganisationMapLayer(value: string): value is OrganisationMapLayer {
  return organisationMapLayers.some(([id]) => id === value);
}

function isMapRepresentation(value: string): value is "map" | "grid" {
  return ["map", "grid"].includes(value);
}

function organisationScopeLabel(scope: string) {
  return {
    africa_hq: "Africa-headquartered",
    africa_wide: "Africa-wide coverage",
    international: "International, active in Africa",
    reviewed: "Reviewed profiles",
    pending: "Review pending",
  }[scope] ?? scope;
}

function buildOrganisationDirectoryHref({
  country,
  group,
  headquarters,
  layer,
  origin,
  query,
  role,
  scope,
  sector,
  segment,
}: {
  country: string;
  group: string;
  headquarters: string;
  layer: OrganisationMapLayer;
  origin: string;
  query: string;
  role: string;
  scope: string;
  sector: string;
  segment: string;
}) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (layer === "catalogue" || layer === "africa_wide") {
    if (role !== "all") params.set("role", role);
    if (group !== "all") params.set("group", group);
    if (sector !== "all") params.set("sector", sector);
    if (segment !== "all") params.set("segment", segment);
    if (country !== "all") params.set("country", country);
    if (headquarters !== "all") params.set("headquarters", headquarters);
    if (scope !== "all") params.set("scope", scope);
    if (layer === "africa_wide") params.set("scope", "africa_wide");
  } else {
    if (group !== "all") params.set("group", group);
    if (role !== "all") params.set("role", role);
    if (sector !== "all") params.set("sector", sector);
    if (segment !== "all") params.set("segment", segment);
    if (origin !== "all") params.set("origin", origin);
    if (country !== "all") params.set("country", country);
    if (layer !== "all_presence") params.set("presence", layer);
  }
  return `/organisations?${params.toString()}`;
}

function organisationMapLayerLabel(layer: OrganisationMapLayer) {
  return organisationMapLayers.find(([id]) => id === layer)?.[1] ?? layer;
}

type OrganisationLocationType =
  | "evidenced"
  | "company_stated"
  | "software_linked"
  | "offices"
  | "availability"
  | "africa_wide"
  | "headquarters"
  | "origin";

function organisationLocationTypesForCountry(
  record: OrganisationDirectoryRecord,
  iso2: string,
): OrganisationLocationType[] {
  const types: OrganisationLocationType[] = [];
  if (record.evidencedCountryIso2s.includes(iso2)) types.push("evidenced");
  if (record.companyStatedCountryIso2s.includes(iso2)) types.push("company_stated");
  if (record.softwareLinkedCountryIso2s.includes(iso2)) types.push("software_linked");
  if (record.officeCountryIso2s.includes(iso2) || record.warehouseCountryIso2s.includes(iso2)) {
    types.push("offices");
  }
  if (record.availabilityCountryIso2s.includes(iso2)) types.push("availability");
  if (organisationHasAfricaWideCoverage(record) && record.countryIso2s.includes(iso2)) {
    types.push("africa_wide");
  }
  if (record.organisation.headquartersCountryIso2 === iso2) types.push("headquarters");
  if (record.organisation.countryOfOriginIso2 === iso2) types.push("origin");
  return types;
}

function organisationLocationTypeLabel(type: OrganisationLocationType) {
  return {
    evidenced: "Evidenced activity",
    company_stated: "Company-stated activity",
    software_linked: "Software deployed",
    offices: "Office, warehouse or legal entity",
    availability: "Product availability",
    africa_wide: "Africa-wide coverage",
    headquarters: "Headquarters",
    origin: "Country of origin",
  }[type];
}

function catalogueLocationTypeLabel(type: "catalogue_activity" | "africa_wide" | "headquarters") {
  return type === "catalogue_activity"
    ? "Documented country activity"
    : type === "africa_wide"
      ? "Africa-wide coverage"
      : "Headquarters";
}

function organisationLocationTypeShortSummary(
  canonicalTypes: OrganisationLocationType[],
  catalogueTypes: Array<"catalogue_activity" | "africa_wide" | "headquarters">,
) {
  const labels = [...canonicalTypes.map(organisationLocationTypeLabel), ...catalogueTypes.map(catalogueLocationTypeLabel)];
  return labels.length > 1 ? `${labels.length} types` : labels[0] ?? "Located";
}

function catalogueLocationTypeShortSummary(
  types: Array<"catalogue_activity" | "africa_wide" | "headquarters">,
) {
  if (types.length > 1) return `${types.length} types`;
  return types[0] === "headquarters"
    ? "HQ"
    : types[0] === "africa_wide"
      ? "Africa-wide"
      : "Catalogue";
}

function organisationHasAfricaWideCoverage(record: OrganisationDirectoryRecord) {
  return record.catalogueListings.some((listing) =>
    listing.africanRegionsActive.some(isAfricaWideCoverageLabel),
  );
}

function organisationLayerCountries(
  record: OrganisationDirectoryRecord,
  layer: OrganisationMapLayer,
) {
  if (layer === "all_presence") {
    return record.countryIso2s;
  }
  if (layer === "catalogue") return [];
  if (layer === "africa_wide") {
    return organisationHasAfricaWideCoverage(record) ? record.countryIso2s : [];
  }
  if (layer === "evidenced") return record.evidencedCountryIso2s;
  if (layer === "company_stated") return record.companyStatedCountryIso2s;
  if (layer === "software_linked") return record.softwareLinkedCountryIso2s;
  if (layer === "offices") {
    return Array.from(new Set([...record.officeCountryIso2s, ...record.warehouseCountryIso2s]));
  }
  if (layer === "availability") return record.availabilityCountryIso2s;
  const iso2 = layer === "headquarters"
    ? record.organisation.headquartersCountryIso2
    : record.organisation.countryOfOriginIso2;
  return iso2 ? [iso2] : [];
}

function organisationMapResultKeys(
  records: OrganisationDirectoryRecord[],
  catalogueMapData: OrganisationCatalogueMapData,
  layer: OrganisationMapLayer,
  country = "all",
) {
  const keys = new Set<string>();
  if (layer !== "catalogue") {
    for (const record of records) {
      const countries = organisationLayerCountries(record, layer);
      if (countries.length && (country === "all" || countries.includes(country))) {
        keys.add(`/organisations/${record.organisation.slug}`);
      }
    }
  }
  if (["catalogue", "africa_wide", "all_presence", "headquarters"].includes(layer)) {
    for (const [iso2, countryData] of Object.entries(catalogueMapData.countries)) {
      if (country !== "all" && iso2 !== country) continue;
      const catalogueKeys = layer === "catalogue"
        ? countryData.activityRecordKeys
        : layer === "africa_wide"
          ? countryData.africaWideRecordKeys
        : layer === "headquarters"
          ? countryData.headquartersRecordKeys
          : countryData.recordKeys;
      for (const key of catalogueKeys) keys.add(key);
    }
  }
  return keys;
}

type AfricaMapCountry = {
  iso2: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  small: boolean;
  interactive: boolean;
};

function AfricaCountryMap({
  countries,
  objectLabel,
  selectedCountry,
  setSelectedCountry,
}: {
  countries: MapCountryRow[];
  objectLabel: string;
  selectedCountry: string;
  setSelectedCountry: (iso2: string) => void;
}) {
  const rows = new Map(countries.map((country) => [country.iso2, country]));
  return (
    <div className="v2-africa-map-wrap">
      <svg
        aria-labelledby="africa-map-title africa-map-description"
        className="v2-africa-map"
        role="group"
        viewBox={africaMapJson.viewBox}
      >
        <title id="africa-map-title">Clickable map of African countries</title>
        <desc id="africa-map-description">Select a country to see {objectLabel}.</desc>
        {(africaMapJson.countries as AfricaMapCountry[]).map((geometry) => {
          const row = rows.get(geometry.iso2);
          if (!geometry.interactive || !row) {
            return <path className="context" d={geometry.path} key={geometry.iso2} />;
          }
          const active = selectedCountry === geometry.iso2;
          return (
            <g
              aria-label={`${row.name}: ${row.assessed ? `${row.count} ${objectLabel}` : "coverage not assessed"}`}
              aria-pressed={active}
              className={`${row.assessed ? countClass(row.count) : "unknown"}${active ? " selected" : ""}`}
              data-country={geometry.iso2}
              key={geometry.iso2}
              onClick={() => setSelectedCountry(geometry.iso2)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedCountry(geometry.iso2);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <path d={geometry.path} />
              {geometry.small ? <circle className="hit-area" cx={geometry.labelX} cy={geometry.labelY} r="11" /> : null}
              {row.count ? (
                <g aria-hidden="true" className="map-count" pointerEvents="none">
                  <circle cx={geometry.labelX} cy={geometry.labelY} r="10" />
                  <text x={geometry.labelX} y={geometry.labelY}>{row.count}</text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p>Country boundaries are for navigation. No site coordinates are shown.</p>
    </div>
  );
}

function DirectoryView({
  activeFilters,
  filteredProducts,
  onOpenProduct,
}: {
  activeFilters: string[];
  filteredProducts: Product[];
  onOpenProduct: (product: Product, element: HTMLElement) => void;
}) {
  const [sort, setSort] = useState<ProductSort>("product");
  const [pageSize, setPageSize] = useState(25);
  const [requestedPage, setRequestedPage] = useState(1);
  const [display, setDisplay] = useState<"table" | "cards">("table");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [includeSources, setIncludeSources] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState([
    "organisation",
    "category",
    "countries",
    "access",
    "evidence",
    "checked",
  ]);

  const rows = useMemo(
    () => sortProducts(filteredProducts, sort),
    [filteredProducts, sort],
  );
  const pageData = useMemo(
    () => paginate(rows, requestedPage, pageSize),
    [pageSize, requestedPage, rows],
  );

  function toggleColumn(value: string) {
    setVisibleColumns((current) =>
      current.includes(value)
        ? current.filter((column) => column !== value)
        : [...current, value],
    );
  }

  function downloadExport() {
    const selected = rows.map((product) => {
      const record: Record<string, string | string[]> = {
        product: product.name,
      };
      if (visibleColumns.includes("organisation"))
        record.organisation = product.organisation;
      if (visibleColumns.includes("category"))
        record.category = product.category;
      if (visibleColumns.includes("countries"))
        record.countries = product.deploymentCountries;
      if (visibleColumns.includes("access"))
        record.access_model = product.accessModel;
      if (visibleColumns.includes("evidence")) {
        record.evidence = product.evidence.map(
          (value) => evidenceLabels[value],
        );
      }
      if (visibleColumns.includes("checked"))
        record.last_checked = product.lastChecked;
      if (includeSources) record.source_urls = [product.website];
      return record;
    });
    const content =
      exportFormat === "json"
        ? JSON.stringify(
            {
              release: release.version,
              generated: new Date().toISOString(),
              filters: activeFilters,
              records: selected,
            },
            null,
            2,
          )
        : toCsv(selected);
    const blob = new Blob([content], {
      type: exportFormat === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `africa-energy-software-map-${release.version}.${exportFormat}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <section className="v2-data-canvas">
      <div className="v2-data-tools">
        <label>
          <span>Sort</span>
          <select
            onChange={(event) => {
              setSort(event.target.value as ProductSort);
              setRequestedPage(1);
            }}
            value={sort}
          >
            <option value="product">Product</option>
            <option value="organisation">Organisation</option>
            <option value="category">Category</option>
            <option value="checked">Last checked</option>
          </select>
        </label>

        <label>
          <span>Page size</span>
          <select
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setRequestedPage(1);
            }}
            value={pageSize}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>

        <div className="v2-columns-wrap">
          <button
            aria-expanded={columnsOpen}
            onClick={() => setColumnsOpen((value) => !value)}
            type="button"
          >
            Columns
          </button>
          {columnsOpen ? (
            <fieldset className="v2-columns-menu">
              <legend>Visible columns</legend>
              {[
                ["organisation", "Organisation"],
                ["category", "Category"],
                ["countries", "Countries"],
                ["access", "Access"],
                ["evidence", "Evidence"],
                ["checked", "Checked"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    checked={visibleColumns.includes(value)}
                    onChange={() => toggleColumn(value)}
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>

        <div className="v2-data-view" role="group" aria-label="Directory view">
          <button
            aria-pressed={display === "table"}
            onClick={() => setDisplay("table")}
            type="button"
          >
            Rows
          </button>
          <button
            aria-pressed={display === "cards"}
            onClick={() => setDisplay("cards")}
            type="button"
          >
            Cards
          </button>
        </div>

        <button
          className="v2-export-action"
          onClick={() => setExportOpen(true)}
          type="button"
        >
          Export current view <span aria-hidden="true">↓</span>
        </button>
      </div>

      {display === "table" ? (
        <div className="v2-data-table-wrap">
          <table className="v2-data-table">
            <caption>
              {rows.length} reviewed products, sorted by{" "}
              {sort.replace("_", " ")}
            </caption>
            <thead>
              <tr>
                <th scope="col">Product</th>
                {visibleColumns.includes("organisation") ? <th scope="col">Organisation</th> : null}
                {visibleColumns.includes("category") ? <th scope="col">Category</th> : null}
                {visibleColumns.includes("countries") ? <th scope="col">Country</th> : null}
                {visibleColumns.includes("access") ? <th scope="col">Access</th> : null}
                {visibleColumns.includes("evidence") ? <th scope="col">Evidence</th> : null}
                {visibleColumns.includes("checked") ? <th scope="col">Checked</th> : null}
                <th scope="col"><span className="sr-only">Preview</span></th>
              </tr>
            </thead>
            <tbody>
              {pageData.items.map((product, index) => (
                <tr key={product.id}>
                  <th scope="row">
                    <span className="v2-data-product-cell">
                      <ProductMark
                        organisationId={product.organisationId}
                        organisationName={product.organisation}
                        productId={product.id}
                        productName={product.name}
                        size={32}
                      />
                      <span>
                        <small>{String((pageData.page - 1) * pageData.pageSize + index + 1).padStart(2, "0")}</small>
                        <Link href={`/products/${product.slug}`}>{product.name}</Link>
                      </span>
                    </span>
                  </th>
                  {visibleColumns.includes("organisation") ? <td><OrganisationLink product={product} /></td> : null}
                  {visibleColumns.includes("category") ? <td><Link href={`/explore?category=${product.categoryId}`}>{product.category}</Link></td> : null}
                  {visibleColumns.includes("countries") ? (
                    <td>{product.deploymentCountries.length ? product.deploymentCountries.map((iso2, countryIndex) => (
                      <Fragment key={iso2}>
                        {countryIndex ? ", " : null}
                        <Link href={`/countries/${iso2.toLowerCase()}`}>{countryLabel(iso2)}</Link>
                      </Fragment>
                    )) : "—"}</td>
                  ) : null}
                  {visibleColumns.includes("access") ? <td>{product.accessModel}</td> : null}
                  {visibleColumns.includes("evidence") ? (
                    <td><EvidenceStatusLabel compact status={product.evidence[0]} /></td>
                  ) : null}
                  {visibleColumns.includes("checked") ? <td>{product.lastChecked}</td> : null}
                  <td>
                    <button
                      aria-label={`Preview ${product.name}`}
                      onClick={(event) =>
                        onOpenProduct(product, event.currentTarget)
                      }
                      type="button"
                    >
                      ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="v2-data-cards">
          {pageData.items.map((product, index) => (
            <article key={product.id}>
              <span>
                {String(
                  (pageData.page - 1) * pageData.pageSize + index + 1,
                ).padStart(2, "0")}
              </span>
              <ProductMark
                organisationId={product.organisationId}
                organisationName={product.organisation}
                productId={product.id}
                productName={product.name}
                size={48}
              />
              <Link className="v2-data-card-product" href={`/products/${product.slug}`}><strong>{product.name}</strong></Link>
              <OrganisationLink product={product} />
              <Link className="v2-data-card-category" href={`/explore?category=${product.categoryId}`}>{product.category}</Link>
              <button
                aria-label={`Preview ${product.name}`}
                onClick={(event) => onOpenProduct(product, event.currentTarget)}
                type="button"
              ><b aria-hidden="true">↗</b></button>
            </article>
          ))}
        </div>
      )}

      <nav aria-label="Directory pages" className="v2-pagination">
        <button
          disabled={pageData.page === 1}
          onClick={() => setRequestedPage(pageData.page - 1)}
          type="button"
        >
          ← Previous
        </button>
        <span>
          Page {pageData.page} of {pageData.totalPages}
          <small>{pageData.total} records</small>
        </span>
        <button
          disabled={pageData.page === pageData.totalPages}
          onClick={() => setRequestedPage(pageData.page + 1)}
          type="button"
        >
          Next →
        </button>
      </nav>

      <div className="v2-data-foot">
        <span>{release.version} · {release.date}</span>
        <div>
          <Link href="/landscape">Open the software wall →</Link>
          <Link href="/data">Dataset notes →</Link>
        </div>
      </div>

      {exportOpen ? (
        <div className="v2-overlay" onMouseDown={() => setExportOpen(false)}>
          <section
            aria-labelledby="v2-export-title"
            aria-modal="true"
            className="v2-export-panel"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="v2-sheet-top">
              <span id="v2-export-title">Export</span>
              <button onClick={() => setExportOpen(false)} type="button">Close</button>
            </div>
            <div className="v2-export-number">
              <strong>{rows.length}</strong>
              <span>records</span>
            </div>
            <fieldset className="v2-export-formats">
              <legend>Format</legend>
              <label>
                <input checked={exportFormat === "csv"} name="format" onChange={() => setExportFormat("csv")} type="radio" />
                <span>CSV</span>
              </label>
              <label>
                <input checked={exportFormat === "json"} name="format" onChange={() => setExportFormat("json")} type="radio" />
                <span>JSON</span>
              </label>
            </fieldset>
            <label className="v2-source-check">
              <input checked={includeSources} onChange={(event) => setIncludeSources(event.target.checked)} type="checkbox" />
              Include source URLs
            </label>
            <p>Reviewed release {release.version} · source links included on request</p>
            <button className="v2-panel-apply" onClick={downloadExport} type="button">
              Download {exportFormat.toUpperCase()} <span aria-hidden="true">↓</span>
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function OrganisationPreview({
  close,
  target,
}: {
  close: () => void;
  target: OrganisationPreviewTarget;
}) {
  const isCanonical = target.kind === "canonical";
  const name = isCanonical ? target.record.organisation.name : target.record.name;
  const id = isCanonical ? target.record.organisation.id : target.record.id;
  const href = isCanonical
    ? `/organisations/${target.record.organisation.slug}`
    : target.record.canonicalHref || `/organisations?q=${encodeURIComponent(target.record.name)}`;
  const role = isCanonical
    ? organisationRoleName(target.record.primaryRole.id)
    : target.record.primaryRole || "Role not classified";
  const country = africanCountries.find(([iso2]) => iso2 === target.countryIso2)?.[1] ?? target.countryIso2;
  const locationTypes = isCanonical
    ? [
        ...organisationLocationTypesForCountry(target.record, target.countryIso2).map(organisationLocationTypeLabel),
        ...target.catalogueLocationTypes.map(catalogueLocationTypeLabel),
      ]
    : target.record.locationTypes.map(catalogueLocationTypeLabel);
  const roles = isCanonical ? target.record.roleIds.map(organisationRoleName) : [role];
  const markets = isCanonical ? target.record.segmentIds.map(organisationSegmentName) : [];
  const productsForOrganisation = isCanonical ? target.record.ownedProducts : [];
  const website = isCanonical ? target.record.organisation.website : target.record.website;
  return (
    <div className="v2-overlay v2-drawer-overlay" onMouseDown={close}>
      <aside aria-labelledby="v2-organisation-preview-title" aria-modal="true" className="v2-product-drawer v2-organisation-drawer" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="v2-sheet-top"><span>Organisation</span><button onClick={close} type="button">Close</button></div>
        <header className="v2-preview-head">
          <OrganisationMark name={name} organisationId={id} size={64} />
          <span>{role}</span>
          <h2 id="v2-organisation-preview-title"><Link href={href}>{name}</Link></h2>
          <Link href={`/countries/${target.countryIso2.toLowerCase()}?view=organisations`}>{country} ↗</Link>
        </header>
        <div className="v2-preview-metrics">
          <div><strong>{roles.length}</strong><span>{roles.length === 1 ? "role" : "roles"}</span></div>
          <div><strong>{isCanonical ? target.record.countryCount : 1}</strong><span>{isCanonical ? "countries" : "location"}</span></div>
          <div><strong>{productsForOrganisation.length}</strong><span>linked software</span></div>
        </div>
        <div className="v2-preview-overview">
          {isCanonical && target.record.organisation.description ? <p>{target.record.organisation.description}</p> : null}
          <section className="v2-organisation-preview-section"><h3>Why it appears in {country}</h3><div className="v2-preview-tags">{Array.from(new Set(locationTypes)).map((value) => <span key={value}>{value}</span>)}</div></section>
          <section className="v2-organisation-preview-section"><h3>Roles and markets</h3><div className="v2-preview-tags">{[...roles, ...markets].map((value) => <span key={value}>{value}</span>)}</div></section>
          {productsForOrganisation.length ? <section className="v2-organisation-preview-section"><h3>Software</h3><div className="v2-organisation-preview-links">{productsForOrganisation.map((product) => <Link href={`/products/${product.slug}`} key={product.id}>{product.name}<span>→</span></Link>)}</div></section> : null}
        </div>
        <div className="v2-preview-actions"><Link href={href}>Full record <span aria-hidden="true">→</span></Link>{website ? <a href={website} rel="noreferrer" target="_blank">Website ↗</a> : null}<Link href="/contribute/organisation">Correct</Link></div>
      </aside>
    </div>
  );
}

function ProductPreview({
  close,
  organisationLinks,
  product,
}: {
  close: () => void;
  organisationLinks: ExactLinkIndex;
  product: Product;
}) {
  const [tab, setTab] = useState<"overview" | "evidence">("overview");
  const productDeployments = deployments.filter(
    (deployment) => deployment.productId === product.id,
  );
  return (
    <div className="v2-overlay v2-drawer-overlay" onMouseDown={close}>
      <aside
        aria-labelledby="v2-preview-title"
        aria-modal="true"
        className="v2-product-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="v2-sheet-top">
          <span>Product</span>
          <button onClick={close} type="button">Close</button>
        </div>
        <header className="v2-preview-head">
          <ProductMark
            organisationId={product.organisationId}
            organisationName={product.organisation}
            productId={product.id}
            productName={product.name}
            size={64}
          />
          <Link href={`/explore?category=${product.categoryId}`}>{product.category}</Link>
          <h2 id="v2-preview-title"><Link href={`/products/${product.slug}`}>{product.name}</Link></h2>
          <OrganisationLink product={product} suffix=" ↗" />
        </header>

        <div className="v2-preview-metrics">
          <div><strong>{productDeployments.length}</strong><span>deployments</span></div>
          <div><strong>{product.deploymentCountries.length}</strong><span>countries</span></div>
          <div><strong>{product.capabilities.length}</strong><span>capabilities</span></div>
        </div>

        <div className="v2-preview-tabs" role="tablist">
          <button
            aria-selected={tab === "overview"}
            onClick={() => setTab("overview")}
            role="tab"
            type="button"
          >
            Overview
          </button>
          <button
            aria-selected={tab === "evidence"}
            onClick={() => setTab("evidence")}
            role="tab"
            type="button"
          >
            Evidence
          </button>
        </div>

        {tab === "overview" ? (
          <div className="v2-preview-overview" role="tabpanel">
            <p>{product.description}</p>
            <div className="v2-preview-tags">
              <OriginLabel value={product.origin} />
              <LifecycleTag value={product.lifecycle} />
              <EvidenceStatusLabel compact status={product.evidence[0]} />
            </div>
            <div className="v2-capability-list">
              {product.capabilities.map((capability, index) => (
                <span key={capability}>
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  {capability}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="v2-preview-evidence" role="tabpanel">
            {productDeployments.length ? (
              productDeployments.map((deployment, index) => (
                <div key={deployment.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Link href={`/countries/${deployment.countryIso2.toLowerCase()}`}><strong>{deployment.country}</strong></Link>
                  <small><OrganisationReferenceLink
                    index={organisationLinks}
                    name={deployment.customer}
                    searchFallback={deployment.customerDisclosure === "named"}
                  /></small>
                  <b>{deployment.year}</b>
                  <EvidenceStatusLabel compact status={deployment.evidence} />
                </div>
              ))
            ) : (
              <div className="v2-preview-none">
                <span aria-hidden="true">○</span>
                <strong>No evidenced deployment yet.</strong>
              </div>
            )}
            <Freshness date={product.lastChecked} />
          </div>
        )}

        <div className="v2-preview-actions">
          <Link href={`/products/${product.slug}`}>
            Full record <span aria-hidden="true">→</span>
          </Link>
          <Link href={`/contribute/correction?product=${product.slug}`}>
            Correct
          </Link>
        </div>
      </aside>
    </div>
  );
}

function countClass(count: number) {
  if (count >= 4) return "count-high";
  if (count > 0) return "count-low";
  return "count-zero";
}

function OrganisationLink({
  product,
  suffix = "",
}: {
  product: Product;
  suffix?: string;
}) {
  const organisation = organisationById(product.organisationId);
  if (!organisation) return <span>{product.organisation}{suffix}</span>;
  return <Link href={`/organisations/${organisation.slug}`}>{product.organisation}{suffix}</Link>;
}

function OrganisationReferenceLink({
  index,
  name,
  searchFallback = false,
}: {
  index: ExactLinkIndex;
  name: string;
  searchFallback?: boolean;
}) {
  const href = resolveOrganisationHref(name, index);
  if (href) return <Link href={href}>{name}</Link>;
  if (searchFallback && name && !/not disclosed|not documented|confidential|unknown/i.test(name)) {
    return <Link href={`/organisations?q=${encodeURIComponent(name)}`}>{name}</Link>;
  }
  return <>{name}</>;
}

function countryLabel(iso2: string) {
  return africanCountries.find(([countryIso2]) => countryIso2 === iso2)?.[1] ?? iso2;
}

function toCsv(rows: Record<string, string | string[]>[]) {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: string | string[] | undefined) => {
    const text = Array.isArray(value) ? value.join("|") : value ?? "";
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header])).join(","),
    ),
  ].join("\n");
}

function withSearchParam(
  pathname: string,
  search: string,
  key: string,
  value: string,
) {
  const [basePath, baseSearch = ""] = pathname.split("?", 2);
  const params = new URLSearchParams(baseSearch);
  for (const [name, existingValue] of new URLSearchParams(search)) {
    params.set(name, existingValue);
  }
  params.set(key, value);
  return `${basePath}?${params.toString()}`;
}
