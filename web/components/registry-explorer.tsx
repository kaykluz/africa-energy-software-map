"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  africanCountries,
  categories,
  deployments,
  evidenceLabels,
  originLabels,
  productById,
  products,
  release,
  stages,
  type EvidenceStatus,
  type Product,
} from "@/lib/registry-data";
import {
  filterProducts,
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
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type RegistryView = "stack" | "deployments" | "directory";

const viewMeta: Record<
  RegistryView,
  {
    title: string;
  }
> = {
  stack: {
    title: "The software powering African energy",
  },
  deployments: {
    title: "Where the software is running",
  },
  directory: {
    title: "Directory",
  },
};

export function RegistryExplorer({
  view,
  initialQuery = "",
  initialCategory = "all",
  initialEvidence = "all",
  initialCountry = "all",
  initialOrigin = "all",
  initialLifecycle = "all",
  initialAccess = "all",
}: {
  view: RegistryView;
  initialQuery?: string;
  initialCategory?: string;
  initialEvidence?: string;
  initialCountry?: string;
  initialOrigin?: string;
  initialLifecycle?: string;
  initialAccess?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [evidenceFilter, setEvidenceFilter] = useState(initialEvidence);
  const [countryFilter, setCountryFilter] = useState(initialCountry);
  const [originFilter, setOriginFilter] = useState(initialOrigin);
  const [lifecycleFilter, setLifecycleFilter] = useState(initialLifecycle);
  const [accessFilter, setAccessFilter] = useState(initialAccess);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedProduct) {
        setSelectedProduct(null);
        openerRef.current?.focus();
      } else if (filtersOpen) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [filtersOpen, selectedProduct]);

  const filteredProducts = useMemo(() => {
    return filterProducts(products, {
      query,
      category: categoryFilter,
      evidence: evidenceFilter,
      country: countryFilter,
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
  ]);

  function updateUrl(next: {
    q?: string;
    category?: string;
    evidence?: string;
    country?: string;
    origin?: string;
    lifecycle?: string;
    access?: string;
  }) {
    const params = new URLSearchParams();
    const values = {
      q: next.q ?? query,
      category: next.category ?? categoryFilter,
      evidence: next.evidence ?? evidenceFilter,
      country: next.country ?? countryFilter,
      origin: next.origin ?? originFilter,
      lifecycle: next.lifecycle ?? lifecycleFilter,
      access: next.access ?? accessFilter,
    };
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.category !== "all") params.set("category", values.category);
    if (values.evidence !== "all") params.set("evidence", values.evidence);
    if (values.country !== "all") params.set("country", values.country);
    if (values.origin !== "all") params.set("origin", values.origin);
    if (values.lifecycle !== "all") params.set("lifecycle", values.lifecycle);
    if (values.access !== "all") params.set("access", values.access);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    setQuery("");
    setCategoryFilter("all");
    setEvidenceFilter("all");
    setCountryFilter("all");
    setOriginFilter("all");
    setLifecycleFilter("all");
    setAccessFilter("all");
    router.replace(pathname, { scroll: false });
  }

  function openProduct(product: Product, element: HTMLElement) {
    openerRef.current = element;
    setSelectedProduct(product);
  }

  const activeFilters = [
    categoryFilter !== "all"
      ? categories.find((category) => category.id === categoryFilter)?.name
      : null,
    evidenceFilter !== "all"
      ? evidenceLabels[evidenceFilter as EvidenceStatus]
      : null,
    countryFilter !== "all"
      ? africanCountries.find(([iso2]) => iso2 === countryFilter)?.[1]
      : null,
    originFilter !== "all"
      ? originLabels[originFilter as keyof typeof originLabels]
      : null,
    lifecycleFilter !== "all"
      ? lifecycleFilter.replaceAll("_", " ")
      : null,
    accessFilter !== "all" ? accessFilter : null,
  ].filter(Boolean) as string[];

  const preservedSearch = (() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (evidenceFilter !== "all") params.set("evidence", evidenceFilter);
    if (countryFilter !== "all") params.set("country", countryFilter);
    if (originFilter !== "all") params.set("origin", originFilter);
    if (lifecycleFilter !== "all") params.set("lifecycle", lifecycleFilter);
    if (accessFilter !== "all") params.set("access", accessFilter);
    return params.toString();
  })();

  const meta = viewMeta[view];

  return (
    <main className={`v2-experience v2-experience-${view}`} id="main-content">
      <section className="v2-experience-hero">
        <div className="v2-hero-copy">
          <h1>{meta.title}</h1>
        </div>
        <div className="v2-hero-side">
          <div className="v2-hero-stats">
            <div>
              <strong>{stages.length}</strong>
              <span>stages</span>
            </div>
            <div>
              <strong>{products.length}</strong>
              <span>products</span>
            </div>
            <div>
              <strong>{deployments.length}</strong>
              <span>evidence points</span>
            </div>
          </div>
          <Link className="v2-hero-contribute" href="/contribute">
            <span>
              <strong>Improve the map</strong>
              <small>Submit data</small>
            </span>
            <i aria-hidden="true">↗</i>
          </Link>
        </div>
        <nav aria-label="Dataset views" className="v2-view-dock">
          {[
            ["/", "Explore", "stack", "01"],
            ["/deployments", "Map", "deployments", "02"],
            ["/directory", "Data", "directory", "03"],
          ].map(([href, label, id, index]) => (
            <Link
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "active" : ""}
              href={`${href}${preservedSearch ? `?${preservedSearch}` : ""}`}
              key={id}
            >
              <span>{index}</span>
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <CommandBar
        activeFilters={activeFilters}
        clearFilters={clearFilters}
        filtersOpen={filtersOpen}
        query={query}
        resultCount={filteredProducts.length}
        setFiltersOpen={setFiltersOpen}
        setQuery={(value) => setQuery(value)}
        submitQuery={() => updateUrl({ q: query })}
      />

      {filtersOpen ? (
        <FilterPanel
          categoryFilter={categoryFilter}
          close={() => setFiltersOpen(false)}
          countryFilter={countryFilter}
          evidenceFilter={evidenceFilter}
          originFilter={originFilter}
          lifecycleFilter={lifecycleFilter}
          accessFilter={accessFilter}
          resultCount={filteredProducts.length}
          setCategoryFilter={(value) => {
            setCategoryFilter(value);
            updateUrl({ category: value });
          }}
          setCountryFilter={(value) => {
            setCountryFilter(value);
            updateUrl({ country: value });
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
          filteredProducts={filteredProducts}
          onOpenProduct={openProduct}
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
  categoryFilter,
  close,
  countryFilter,
  evidenceFilter,
  lifecycleFilter,
  originFilter,
  resultCount,
  setAccessFilter,
  setCategoryFilter,
  setCountryFilter,
  setEvidenceFilter,
  setLifecycleFilter,
  setOriginFilter,
}: {
  accessFilter: string;
  categoryFilter: string;
  close: () => void;
  countryFilter: string;
  evidenceFilter: string;
  lifecycleFilter: string;
  originFilter: string;
  resultCount: number;
  setAccessFilter: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setCountryFilter: (value: string) => void;
  setEvidenceFilter: (value: string) => void;
  setLifecycleFilter: (value: string) => void;
  setOriginFilter: (value: string) => void;
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
          <span id="v2-filter-title">Refine</span>
          <button onClick={close} type="button">Close</button>
        </div>
        <div className="v2-filter-fields">
          <label>
            <span>Country</span>
            <select
              onChange={(event) => setCountryFilter(event.target.value)}
              value={countryFilter}
            >
              <option value="all">All countries</option>
              {africanCountries.map(([iso2, name]) => (
                <option key={iso2} value={iso2}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Evidence</span>
            <select
              onChange={(event) => setEvidenceFilter(event.target.value)}
              value={evidenceFilter}
            >
              <option value="all">All evidence</option>
              {Object.entries(evidenceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Origin</span>
            <select
              onChange={(event) => setOriginFilter(event.target.value)}
              value={originFilter}
            >
              <option value="all">All origins</option>
              {Object.entries(originLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Lifecycle</span>
            <select
              onChange={(event) => setLifecycleFilter(event.target.value)}
              value={lifecycleFilter}
            >
              <option value="all">All lifecycle states</option>
              {lifecycleStates.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Access</span>
            <select
              onChange={(event) => setAccessFilter(event.target.value)}
              value={accessFilter}
            >
              <option value="all">All access models</option>
              {accessModels.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <button className="v2-panel-apply" onClick={close} type="button">
          Show {resultCount} {resultCount === 1 ? "result" : "results"}
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
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
      <div className="v2-stage-route" aria-label="Energy value-chain stages">
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
                        <h3>{category.name}</h3>
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
        <Link href="/?category=cat_data_interoperability_security">Open →</Link>
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
    <button
      aria-label={`${product.name} by ${product.organisation}, ${evidenceCount} evidenced deployments`}
      className="v2-product-orb"
      onClick={(event) => onOpenProduct(product, event.currentTarget)}
      type="button"
    >
      <span>
        <strong>{product.name}</strong>
        <small>{product.organisation}</small>
      </span>
      <i aria-hidden="true">
        {evidenceCount ? evidenceCount : "·"}
      </i>
    </button>
  );
}

function DeploymentsView({
  filteredProducts,
  onOpenProduct,
  preservedSearch,
}: {
  filteredProducts: Product[];
  onOpenProduct: (product: Product, element: HTMLElement) => void;
  preservedSearch: string;
}) {
  const [geography, setGeography] = useState("evidenced");
  const [representation, setRepresentation] = useState<"grid" | "ranked">(
    "grid",
  );
  const [selectedCountry, setSelectedCountry] = useState("NG");
  const visibleDeployments = deployments.filter((deployment) =>
    filteredProducts.some((product) => product.id === deployment.productId),
  );
  const assessedCountries = new Set(
    deployments.map((deployment) => deployment.countryIso2),
  );
  const rankedCountries = africanCountries
    .map(([iso2, name]) => ({
      iso2,
      name,
      count:
        geography === "evidenced"
          ? visibleDeployments.filter(
              (deployment) => deployment.countryIso2 === iso2,
            ).length
          : 0,
      assessed: geography === "evidenced" && assessedCountries.has(iso2),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const selected = africanCountries.find(([iso2]) => iso2 === selectedCountry);
  const selectedCountryAssessed =
    geography === "evidenced" && assessedCountries.has(selectedCountry);
  const selectedDeployments =
    geography === "evidenced"
      ? visibleDeployments.filter(
          (deployment) => deployment.countryIso2 === selectedCountry,
        )
      : [];

  return (
    <section className="v2-map-canvas">
      <div className="v2-map-controls">
        <div className="v2-layer-switch" role="group" aria-label="Map layer">
          {[
            ["evidenced", "Deployments"],
            ["claimed", "Claims"],
            ["headquarters", "HQ"],
            ["founded", "Origin"],
          ].map(([value, label]) => (
            <button
              aria-pressed={geography === value}
              key={value}
              onClick={() => setGeography(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="v2-representation-switch" role="group" aria-label="Map representation">
          <button
            aria-pressed={representation === "grid"}
            onClick={() => setRepresentation("grid")}
            type="button"
          >
            Grid
          </button>
          <button
            aria-pressed={representation === "ranked"}
            onClick={() => setRepresentation("ranked")}
            type="button"
          >
            Rank
          </button>
        </div>
      </div>

      <div className="v2-map-stage">
        <section className="v2-map-visual" aria-label="African country data view">
          <div className="v2-map-caption">
            <span>{geography === "evidenced" ? "Evidence layer" : `${labelGeography(geography)} layer`}</span>
            <strong>
              {geography === "evidenced"
                ? `${visibleDeployments.length} located records`
                : "Layer awaiting reviewed data"}
            </strong>
          </div>

          {representation === "grid" ? (
            <div
              aria-label="African countries, equal-area grid"
              className="v2-country-field"
            >
              {africanCountries.map(([iso2, name], index) => {
                const count =
                  geography === "evidenced"
                    ? visibleDeployments.filter(
                        (deployment) => deployment.countryIso2 === iso2,
                      ).length
                    : 0;
                const researched =
                  geography === "evidenced" && assessedCountries.has(iso2);
                return (
                  <button
                    aria-label={`${name}: ${
                      researched
                        ? `${count} candidate records`
                        : "coverage not yet assessed"
                    }`}
                    aria-pressed={selectedCountry === iso2}
                    className={`${researched ? countClass(count) : "unknown"}`}
                    key={iso2}
                    onClick={() => setSelectedCountry(iso2)}
                    style={{ "--tile-index": index } as CSSProperties}
                    type="button"
                  >
                    <span>{iso2}</span>
                    {count ? <strong>{count}</strong> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <ol className="v2-country-rank">
              {rankedCountries.map(({ assessed, count, iso2, name }, index) => {
                return (
                  <li key={iso2}>
                    <button
                      aria-pressed={selectedCountry === iso2}
                      onClick={() => setSelectedCountry(iso2)}
                      type="button"
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{name}</strong>
                      <i
                        className={assessed ? "known" : "unknown"}
                        style={{
                          width: count
                            ? `${Math.max(
                                10,
                                (count /
                                  Math.max(1, rankedCountries[0]?.count ?? 1)) *
                                  100,
                              )}%`
                            : "8%",
                        }}
                      />
                      <b>{assessed ? count : "—"}</b>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="v2-map-legend">
            <span><i className="known" /> evidenced</span>
            <span><i className="unknown" /> not assessed</span>
          </div>
        </section>

        <aside className="v2-country-panel">
          <header>
            <span>{selectedCountry}</span>
            <div>
              <h2>{selected?.[1] ?? selectedCountry}</h2>
              <p>
                {geography !== "evidenced"
                  ? "Layer not available"
                  : selectedCountryAssessed
                    ? `${selectedDeployments.length} matching evidence ${
                        selectedDeployments.length === 1 ? "point" : "points"
                      }`
                    : "Coverage not assessed"}
              </p>
            </div>
          </header>

          {selectedDeployments.length ? (
            <>
              <div className="v2-country-score">
                <span style={{ "--score": "78%" } as CSSProperties} />
                <small>Current candidate coverage</small>
              </div>
              <div className="v2-deployment-list">
                {selectedDeployments.slice(0, 5).map((deployment, index) => {
                  const product = productById(deployment.productId);
                  if (!product) return null;
                  return (
                    <button
                      key={deployment.id}
                      onClick={(event) =>
                        onOpenProduct(product, event.currentTarget)
                      }
                      type="button"
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{product.name}</strong>
                        <small>{deployment.customer}</small>
                      </span>
                      <b>{deployment.year}</b>
                      <i aria-hidden="true">↗</i>
                    </button>
                  );
                })}
                {selectedDeployments.length > 5 ? (
                  <Link
                    className="v2-country-more"
                    href={withSearchParam(
                      "/directory",
                      preservedSearch,
                      "country",
                      selectedCountry,
                    )}
                  >
                    View all {selectedDeployments.length} in Data
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <div className="v2-country-unknown">
              <span aria-hidden="true">?</span>
              <strong>
                {geography !== "evidenced"
                  ? "Reviewed data is not available for this layer."
                  : selectedCountryAssessed
                    ? "No evidence matches the current filters."
                    : "Coverage has not been assessed."}
              </strong>
              {geography === "evidenced" ? (
                <Link href="/contribute/deployment">Add evidence →</Link>
              ) : null}
            </div>
          )}

          <Link
            className="v2-country-open"
            href={`/countries/${selectedCountry.toLowerCase()}`}
          >
            Open country record <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </section>
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
              {rows.length} candidate products, sorted by{" "}
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
                    <span>
                      {String(
                        (pageData.page - 1) * pageData.pageSize + index + 1,
                      ).padStart(2, "0")}
                    </span>
                    <Link href={`/products/${product.slug}`}>{product.name}</Link>
                  </th>
                  {visibleColumns.includes("organisation") ? <td>{product.organisation}</td> : null}
                  {visibleColumns.includes("category") ? <td>{product.category}</td> : null}
                  {visibleColumns.includes("countries") ? (
                    <td>{product.deploymentCountries.length ? product.deploymentCountries.join(", ") : "—"}</td>
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
            <button
              key={product.id}
              onClick={(event) => onOpenProduct(product, event.currentTarget)}
              type="button"
            >
              <span>
                {String(
                  (pageData.page - 1) * pageData.pageSize + index + 1,
                ).padStart(2, "0")}
              </span>
              <strong>{product.name}</strong>
              <small>{product.organisation}</small>
              <i>{product.category}</i>
              <b aria-hidden="true">↗</b>
            </button>
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
        <Link href="/data">Dataset notes →</Link>
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
            <p>Candidate data · editorial review required</p>
            <button className="v2-panel-apply" onClick={downloadExport} type="button">
              Download {exportFormat.toUpperCase()} <span aria-hidden="true">↓</span>
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ProductPreview({
  close,
  product,
}: {
  close: () => void;
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
          <span>{product.category}</span>
          <h2 id="v2-preview-title">{product.name}</h2>
          <Link href={`/organisations/${organisationSlug(product)}`}>
            {product.organisation} ↗
          </Link>
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
                  <strong>{deployment.country}</strong>
                  <small>{deployment.customer}</small>
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

function labelGeography(value: string) {
  return {
    claimed: "Claims",
    headquarters: "Headquarters",
    founded: "Origin",
  }[value] ?? "Geography";
}

function organisationSlug(product: Product) {
  if (product.organisationId === "org_001") return "beacon-power-services";
  if (product.organisationId === "org_002") return "pam-africa";
  return "powerlabs";
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
  const params = new URLSearchParams(search);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}
