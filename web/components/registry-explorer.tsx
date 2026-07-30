"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  africanCountries,
  categories,
  deployments,
  evidenceLabels,
  productById,
  products,
  release,
  stages,
  type EvidenceStatus,
  type Product,
} from "@/lib/registry-data";
import {
  EvidenceStatusLabel,
  Freshness,
  LifecycleTag,
  MarketCondition,
  OriginLabel,
} from "@/components/semantic-tags";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type RegistryView = "stack" | "deployments" | "directory";

const viewMeta: Record<
  RegistryView,
  { eyebrow: string; title: string; description: string }
> = {
  stack: {
    eyebrow: "Explore the stack",
    title: "The software powering African energy",
    description:
      "Browse products by the work they support, then inspect where each deployment claim comes from.",
  },
  deployments: {
    eyebrow: "Explore the geography",
    title: "Where software is evidenced",
    description:
      "Separate evidenced deployments from availability claims, headquarters and country of origin.",
  },
  directory: {
    eyebrow: "Explore the records",
    title: "Directory",
    description:
      "Filter, sort and export the structured candidate records behind the map.",
  },
};

export function RegistryExplorer({
  view,
  initialQuery = "",
  initialCategory = "all",
  initialEvidence = "all",
  initialCountry = "all",
}: {
  view: RegistryView;
  initialQuery?: string;
  initialCategory?: string;
  initialEvidence?: string;
  initialCountry?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [evidenceFilter, setEvidenceFilter] = useState(initialEvidence);
  const [countryFilter, setCountryFilter] = useState(initialCountry);
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
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !term ||
        [
          product.name,
          product.organisation,
          product.description,
          product.category,
          ...product.capabilities,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter;
      const matchesEvidence =
        evidenceFilter === "all" ||
        product.evidence.includes(evidenceFilter as EvidenceStatus);
      const matchesCountry =
        countryFilter === "all" ||
        product.deploymentCountries.includes(countryFilter);
      return (
        matchesQuery && matchesCategory && matchesEvidence && matchesCountry
      );
    });
  }, [categoryFilter, countryFilter, evidenceFilter, query]);

  function updateUrl(next: {
    q?: string;
    category?: string;
    evidence?: string;
    country?: string;
  }) {
    const params = new URLSearchParams();
    const values = {
      q: next.q ?? query,
      category: next.category ?? categoryFilter,
      evidence: next.evidence ?? evidenceFilter,
      country: next.country ?? countryFilter,
    };
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.category !== "all") params.set("category", values.category);
    if (values.evidence !== "all") params.set("evidence", values.evidence);
    if (values.country !== "all") params.set("country", values.country);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    setCategoryFilter("all");
    setEvidenceFilter("all");
    setCountryFilter("all");
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
    countryFilter === "NG" ? "Nigeria" : null,
  ].filter(Boolean) as string[];

  const preservedSearch = (() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (evidenceFilter !== "all") params.set("evidence", evidenceFilter);
    if (countryFilter !== "all") params.set("country", countryFilter);
    return params.toString();
  })();

  const meta = viewMeta[view];

  return (
    <main id="main-content">
      <section className="page-intro data-width">
        <span className="eyebrow">{meta.eyebrow}</span>
        <div className="title-row">
          <div>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
          <div className="release-meta" aria-label="Data release">
            <span>{release.version}</span>
            <span>{release.date}</span>
          </div>
        </div>

        <nav aria-label="Dataset views" className="view-switcher">
          {[
            ["/", "Stack", "stack"],
            ["/deployments", "Deployments", "deployments"],
            ["/directory", "Directory", "directory"],
          ].map(([href, label, id]) => (
            <Link
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "view-link active" : "view-link"}
              href={`${href}${preservedSearch ? `?${preservedSearch}` : ""}`}
              key={id}
            >
              {label}
            </Link>
          ))}
        </nav>

        {view === "stack" ? (
          <div className="hero-search">
            <label htmlFor="stack-search">Search the stack</label>
            <div>
              <span aria-hidden="true">⌕</span>
              <input
                id="stack-search"
                onBlur={() => updateUrl({ q: query })}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") updateUrl({ q: query });
                }}
                placeholder="Products, organisations, capabilities or countries"
                type="search"
                value={query}
              />
              {query ? (
                <button
                  className="quiet-button"
                  onClick={() => {
                    setQuery("");
                    updateUrl({ q: "" });
                  }}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <FilterBar
          activeFilters={activeFilters}
          categoryFilter={categoryFilter}
          clearFilters={clearFilters}
          countryFilter={countryFilter}
          evidenceFilter={evidenceFilter}
          filtersOpen={filtersOpen}
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
          setFiltersOpen={setFiltersOpen}
        />
      </section>

      {view === "stack" ? (
        <StackView
          filteredProducts={filteredProducts}
          onOpenProduct={openProduct}
          query={query}
        />
      ) : null}
      {view === "deployments" ? (
        <DeploymentsView
          filteredProducts={filteredProducts}
          onOpenProduct={openProduct}
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

function FilterBar({
  activeFilters,
  categoryFilter,
  clearFilters,
  countryFilter,
  evidenceFilter,
  filtersOpen,
  resultCount,
  setCategoryFilter,
  setCountryFilter,
  setEvidenceFilter,
  setFiltersOpen,
}: {
  activeFilters: string[];
  categoryFilter: string;
  clearFilters: () => void;
  countryFilter: string;
  evidenceFilter: string;
  filtersOpen: boolean;
  resultCount: number;
  setCategoryFilter: (value: string) => void;
  setCountryFilter: (value: string) => void;
  setEvidenceFilter: (value: string) => void;
  setFiltersOpen: (value: boolean) => void;
}) {
  const controls = (
    <>
      <label className="filter-control">
        <span>Country</span>
        <select
          onChange={(event) => setCountryFilter(event.target.value)}
          value={countryFilter}
        >
          <option value="all">All countries</option>
          <option value="NG">Nigeria</option>
        </select>
      </label>
      <label className="filter-control">
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
      <label className="filter-control">
        <span>Evidence</span>
        <select
          onChange={(event) => setEvidenceFilter(event.target.value)}
          value={evidenceFilter}
        >
          <option value="all">All evidence</option>
          {Object.entries(evidenceLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button className="filter-placeholder" disabled type="button">
        Energy segment <span>All</span>
      </button>
      <button className="filter-placeholder" disabled type="button">
        More filters <span>Phase 1</span>
      </button>
    </>
  );

  return (
    <div className="filters-zone">
      <div className="desktop-filters">{controls}</div>
      <button
        aria-expanded={filtersOpen}
        className="button button-outline mobile-filter-trigger"
        onClick={() => setFiltersOpen(true)}
        type="button"
      >
        Filters{activeFilters.length ? ` · ${activeFilters.length}` : ""}
      </button>
      {filtersOpen ? (
        <div className="filter-sheet-backdrop" onMouseDown={() => setFiltersOpen(false)}>
          <section
            aria-label="Filters"
            aria-modal="true"
            className="filter-sheet"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="sheet-header">
              <h2>Filter records</h2>
              <button className="quiet-button" onClick={() => setFiltersOpen(false)} type="button">
                Cancel
              </button>
            </div>
            <div className="mobile-filter-controls">{controls}</div>
            <button
              className="button button-primary sheet-apply"
              onClick={() => setFiltersOpen(false)}
              type="button"
            >
              Show {resultCount} {resultCount === 1 ? "product" : "products"}
            </button>
          </section>
        </div>
      ) : null}
      <div className="filter-summary">
        <strong aria-live="polite">
          {resultCount} {resultCount === 1 ? "product" : "products"}
        </strong>
        <div className="active-filter-list">
          {activeFilters.map((filter) => (
            <span className="active-filter" key={filter}>
              {filter}
            </span>
          ))}
        </div>
        {activeFilters.length ? (
          <button className="text-button" onClick={clearFilters} type="button">
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StackView({
  filteredProducts,
  onOpenProduct,
  query,
}: {
  filteredProducts: Product[];
  onOpenProduct: (product: Product, element: HTMLElement) => void;
  query: string;
}) {
  const [openStages, setOpenStages] = useState<string[]>([
    "stage_transmit_distribute",
    "stage_meter_serve",
  ]);

  const effectiveOpenStages = query
    ? Array.from(new Set(filteredProducts.map((product) => product.stageId)))
    : openStages;

  function toggleStage(stageId: string) {
    setOpenStages((current) =>
      current.includes(stageId)
        ? current.filter((id) => id !== stageId)
        : [...current, stageId],
    );
  }

  return (
    <div className="stack-width stack-layout">
      <div className="stack-legend" aria-label="Map legend">
        <span>
          <span className="origin-mark" aria-hidden="true" /> Africa-built
        </span>
        <span>
          <span className="market-dot market-commercial_market" aria-hidden="true" />
          Commercial market
        </span>
        <span>
          <span className="market-dot market-structurally_thin" aria-hidden="true" />
          Structurally thin
        </span>
        <Link href="/methodology#market-condition">How verdicts work</Link>
      </div>

      {stages.map((stage) => {
        const stageCategories = categories.filter(
          (category) => category.stageId === stage.id,
        );
        const stageProducts = filteredProducts.filter(
          (product) => product.stageId === stage.id,
        );
        const expanded = effectiveOpenStages.includes(stage.id);
        return (
          <section className="stage-section" key={stage.id}>
            <button
              aria-expanded={expanded}
              className="stage-header"
              onClick={() => toggleStage(stage.id)}
              type="button"
            >
              <span className="stage-number mono">
                {String(stage.order).padStart(2, "0")}
              </span>
              <span>
                <strong>{stage.name}</strong>
                <small>
                  {stageCategories.length}{" "}
                  {stageCategories.length === 1 ? "category" : "categories"} ·{" "}
                  {stageProducts.length} matching{" "}
                  {stageProducts.length === 1 ? "product" : "products"}
                </small>
              </span>
              <span aria-hidden="true" className="stage-chevron">
                {expanded ? "−" : "+"}
              </span>
            </button>
            {expanded ? (
              <div className="category-list">
                {stageCategories.map((category) => {
                  const categoryProducts = filteredProducts.filter(
                    (product) => product.categoryId === category.id,
                  );
                  return (
                    <CategoryBand
                      category={category}
                      key={category.id}
                      onOpenProduct={onOpenProduct}
                      products={categoryProducts}
                    />
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="cross-cutting">
        <div>
          <span className="eyebrow">Cross-cutting</span>
          <h2>Data, interoperability and security</h2>
          <p>
            This category spans all six stages. Candidate discovery is open, but
            no reviewed product record is shown yet.
          </p>
        </div>
        <Link className="button button-outline" href="/contribute/product">
          Suggest a product
        </Link>
      </section>
      <CoverageCallout />
    </div>
  );
}

function CategoryBand({
  category,
  onOpenProduct,
  products: categoryProducts,
}: {
  category: (typeof categories)[number];
  onOpenProduct: (product: Product, element: HTMLElement) => void;
  products: Product[];
}) {
  return (
    <section className={`category-band state-${category.researchState}`}>
      <header className="category-header">
        <div>
          <h3>{category.name}</h3>
          <MarketCondition
            text={`Market reading · ${category.verdict}`}
            value={category.marketCondition}
          />
        </div>
        <span className="category-count">
          {categoryProducts.length}{" "}
          {categoryProducts.length === 1 ? "product" : "products"}
        </span>
      </header>
      {categoryProducts.length ? (
        <div className="product-grid">
          {categoryProducts.map((product) => (
            <ProductTile
              key={product.id}
              onOpenProduct={onOpenProduct}
              product={product}
            />
          ))}
        </div>
      ) : (
        <ResearchState category={category} />
      )}
    </section>
  );
}

function ResearchState({
  category,
}: {
  category: (typeof categories)[number];
}) {
  const copy: Record<string, { heading: string; body: string; action: string }> = {
    research_queue: {
      heading: "Research queue",
      body: "Candidates are being assessed. They are not shown until source and editorial checks are complete.",
      action: "Suggest a source",
    },
    not_researched: {
      heading: "Not researched",
      body: "This category has not had a complete research pass. Absence is not a market conclusion.",
      action: "Help scope research",
    },
    no_verified_entry: {
      heading: "No verified entry found",
      body: "Research has started, but no candidate currently meets the publication threshold.",
      action: "Submit a product",
    },
    structurally_thin: {
      heading: "Structurally thin",
      body: "A sourced category-level finding may explain why published products are scarce.",
      action: "Read the analysis",
    },
    published: {
      heading: "No matching product",
      body: "Published candidates exist, but none match the active filters.",
      action: "Clear filters",
    },
  };
  const state = copy[category.researchState];
  return (
    <div className="research-state">
      <div>
        <strong>{state.heading}</strong>
        <p>{state.body}</p>
      </div>
      <Link href={category.researchState === "structurally_thin" ? "/methodology#market-condition" : "/contribute"}>
        {state.action} →
      </Link>
    </div>
  );
}

function ProductTile({
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
      className="product-tile"
      onClick={(event) => onOpenProduct(product, event.currentTarget)}
      type="button"
    >
      <span>
        <strong>{product.name}</strong>
        <small>{product.organisation}</small>
      </span>
      <OriginLabel value={product.origin} />
      <span className="tile-evidence">
        {evidenceCount
          ? `${evidenceCount} evidenced ${evidenceCount === 1 ? "deployment" : "deployments"}`
          : "Provider claim · no evidenced deployment"}
      </span>
      <span aria-hidden="true" className="tile-arrow">
        →
      </span>
    </button>
  );
}

function DeploymentsView({
  filteredProducts,
  onOpenProduct,
}: {
  filteredProducts: Product[];
  onOpenProduct: (product: Product, element: HTMLElement) => void;
}) {
  const [geography, setGeography] = useState("evidenced");
  const [representation, setRepresentation] = useState("ranked");
  const [selectedCountry, setSelectedCountry] = useState("NG");

  useEffect(() => {
    const stored = window.localStorage.getItem("aesm-geography-view");
    const timer = window.setTimeout(() => {
      if (stored === "grid" || stored === "ranked") setRepresentation(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleDeployments = deployments.filter((deployment) =>
    filteredProducts.some((product) => product.id === deployment.productId),
  );
  const selected = africanCountries.find(([iso2]) => iso2 === selectedCountry);

  function changeRepresentation(value: string) {
    setRepresentation(value);
    window.localStorage.setItem("aesm-geography-view", value);
  }

  return (
    <div className="data-width deployments-layout">
      <section className="geography-column">
        <fieldset className="segmented-control">
          <legend>Geographic meaning</legend>
          {[
            ["evidenced", "Evidenced"],
            ["claimed", "Claimed"],
            ["headquarters", "Headquarters"],
            ["founded", "Founded in"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                checked={geography === value}
                name="geography"
                onChange={() => setGeography(value)}
                type="radio"
                value={value}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <div className="representation-row">
          <div>
            <span className="control-label">Representation</span>
            <div className="button-group">
              <button
                aria-pressed={representation === "ranked"}
                onClick={() => changeRepresentation("ranked")}
                type="button"
              >
                Ranked list
              </button>
              <button
                aria-pressed={representation === "grid"}
                onClick={() => changeRepresentation("grid")}
                type="button"
              >
                Country grid
              </button>
            </div>
          </div>
          <label className="country-search">
            <span>Find a country</span>
            <select
              onChange={(event) => setSelectedCountry(event.target.value)}
              value={selectedCountry}
            >
              {africanCountries.map(([iso2, name]) => (
                <option key={iso2} value={iso2}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="geography-legend" aria-label="Geography legend">
          <span><i className="map-swatch map-high" /> 4 evidenced</span>
          <span><i className="map-swatch map-zero" /> Researched zero</span>
          <span><i className="map-swatch map-unknown" /> Not yet researched</span>
        </div>

        {geography !== "evidenced" ? (
          <div className="mode-notice" role="status">
            <strong>{labelGeography(geography)} is separate from deployment evidence.</strong>
            <p>
              This prototype has insufficient reviewed records for a meaningful
              comparison. The control remains visible to test the distinction.
            </p>
          </div>
        ) : representation === "grid" ? (
          <div aria-label="African countries, equal-area grid" className="country-grid" role="list">
            {africanCountries.map(([iso2, name]) => {
              const count =
                iso2 === "NG"
                  ? visibleDeployments.filter((deployment) => deployment.countryIso2 === iso2).length
                  : 0;
              const known = iso2 === "NG";
              return (
                <div key={iso2} role="listitem">
                  <button
                    aria-label={`${name}: ${known ? `${count} candidate evidenced deployments` : "not yet researched in this prototype"}`}
                    aria-pressed={selectedCountry === iso2}
                    className={`country-tile ${known ? countClass(count) : "unknown"}`}
                    onClick={() => setSelectedCountry(iso2)}
                    type="button"
                  >
                    <strong>{iso2}</strong>
                    {known ? <span>{count}</span> : null}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <ol className="country-ranking">
            <li>
              <button
                aria-pressed={selectedCountry === "NG"}
                onClick={() => setSelectedCountry("NG")}
                type="button"
              >
                <span className="rank">01</span>
                <span><strong>Nigeria</strong><small>3 products · 2 categories</small></span>
                <span className="rank-count">{visibleDeployments.length}</span>
              </button>
            </li>
            {[
              "Ghana",
              "Kenya",
              "South Africa",
              "Tanzania",
              "Uganda",
            ].map((country, index) => (
              <li className="unknown-rank" key={country}>
                <button
                  onClick={() => {
                    const record = africanCountries.find(([, name]) => name === country);
                    if (record) setSelectedCountry(record[0]);
                  }}
                  type="button"
                >
                  <span className="rank">{String(index + 2).padStart(2, "0")}</span>
                  <span><strong>{country}</strong><small>Research coverage incomplete</small></span>
                  <span className="rank-count">—</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="method-note">
          Country-level evidence only. No exact infrastructure coordinates are
          collected or displayed. <Link href="/methodology#sensitive-infrastructure">Methodology →</Link>
        </p>
      </section>

      <aside aria-label={`${selected?.[1] ?? "Country"} details`} className="country-panel">
        <span className="eyebrow">Selected country</span>
        <h2>{selected?.[1] ?? selectedCountry}</h2>
        {selectedCountry === "NG" && geography === "evidenced" ? (
          <>
            <p className="country-total">
              <strong>{visibleDeployments.length}</strong> candidate evidenced deployments
              <span>Provider claims are counted separately</span>
            </p>
            <dl className="category-totals">
              <div><dt>Distribution utility operations</dt><dd>2</dd></div>
              <div><dt>PAYGo and mini-grid operations</dt><dd>2</dd></div>
            </dl>
            <h3>Deployments</h3>
            <div className="deployment-cards">
              {visibleDeployments.map((deployment) => {
                const product = productById(deployment.productId);
                if (!product) return null;
                return (
                  <button
                    key={deployment.id}
                    onClick={(event) => onOpenProduct(product, event.currentTarget)}
                    type="button"
                  >
                    <span><strong>{product.name}</strong><small>{deployment.customer}</small></span>
                    <span>{deployment.year}</span>
                    <EvidenceStatusLabel compact status={deployment.evidence} />
                  </button>
                );
              })}
            </div>
            <div className="panel-actions">
              <Link className="button button-primary" href="/directory?country=NG">
                View in Directory
              </Link>
              <Link className="button button-outline" href="/countries/ng">
                Open country page
              </Link>
            </div>
          </>
        ) : (
          <div className="country-empty">
            <strong>No prototype evidence to summarise.</strong>
            <p>
              This means “not yet researched here”, not zero software use in the
              country.
            </p>
            <Link href="/contribute/deployment">Suggest a deployment →</Link>
          </div>
        )}
      </aside>
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
  const [sort, setSort] = useState("product");
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
    () =>
      [...filteredProducts].sort((a, b) => {
        if (sort === "organisation") return a.organisation.localeCompare(b.organisation);
        if (sort === "category") return a.category.localeCompare(b.category);
        if (sort === "checked") return b.lastChecked.localeCompare(a.lastChecked);
        return a.name.localeCompare(b.name);
      }),
    [filteredProducts, sort],
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
      if (visibleColumns.includes("organisation")) record.organisation = product.organisation;
      if (visibleColumns.includes("category")) record.category = product.category;
      if (visibleColumns.includes("countries")) record.countries = product.deploymentCountries;
      if (visibleColumns.includes("access")) record.access_model = product.accessModel;
      if (visibleColumns.includes("evidence")) {
        record.evidence = product.evidence.map((value) => evidenceLabels[value]);
      }
      if (visibleColumns.includes("checked")) record.last_checked = product.lastChecked;
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
    <div className="data-width directory-layout">
      <div className="directory-toolbar">
        <div>
          <label>
            <span>Sort by</span>
            <select onChange={(event) => setSort(event.target.value)} value={sort}>
              <option value="product">Product name</option>
              <option value="organisation">Organisation</option>
              <option value="category">Category</option>
              <option value="checked">Last checked</option>
            </select>
          </label>
          <div className="columns-menu-wrap">
            <button
              aria-expanded={columnsOpen}
              className="button button-outline"
              onClick={() => setColumnsOpen((value) => !value)}
              type="button"
            >
              Columns
            </button>
            {columnsOpen ? (
              <fieldset className="columns-menu">
                <legend>Visible columns</legend>
                <label><input checked disabled type="checkbox" /> Product</label>
                {[
                  ["organisation", "Organisation"],
                  ["category", "Category"],
                  ["countries", "Countries"],
                  ["access", "Access model"],
                  ["evidence", "Evidence"],
                  ["checked", "Last checked"],
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
          <label>
            <span>Page size</span>
            <select defaultValue="25">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </label>
        </div>
        <button className="button button-primary" onClick={() => setExportOpen(true)} type="button">
          Export current view
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <caption>
            {rows.length} candidate products, sorted by {sort.replace("_", " ")}
          </caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              {visibleColumns.includes("organisation") ? <th scope="col">Organisation</th> : null}
              {visibleColumns.includes("category") ? <th scope="col">Category</th> : null}
              {visibleColumns.includes("countries") ? <th scope="col">Countries</th> : null}
              {visibleColumns.includes("access") ? <th scope="col">Access model</th> : null}
              {visibleColumns.includes("evidence") ? <th scope="col">Evidence</th> : null}
              {visibleColumns.includes("checked") ? <th scope="col">Last checked</th> : null}
              <th className="preview-column" scope="col"><span className="sr-only">Preview</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id}>
                <th scope="row"><Link href={`/products/${product.slug}`}>{product.name}</Link></th>
                {visibleColumns.includes("organisation") ? <td>{product.organisation}</td> : null}
                {visibleColumns.includes("category") ? <td>{product.category}</td> : null}
                {visibleColumns.includes("countries") ? (
                  <td>{product.deploymentCountries.length ? product.deploymentCountries.join(", ") : "No evidenced country"}</td>
                ) : null}
                {visibleColumns.includes("access") ? <td>{product.accessModel}</td> : null}
                {visibleColumns.includes("evidence") ? (
                  <td><EvidenceStatusLabel compact status={product.evidence[0]} /></td>
                ) : null}
                {visibleColumns.includes("checked") ? <td>{product.lastChecked}</td> : null}
                <td>
                  <button
                    className="preview-button"
                    onClick={(event) => onOpenProduct(product, event.currentTarget)}
                    type="button"
                  >
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="directory-cards">
        {rows.map((product) => (
          <article key={product.id}>
            <div>
              <h2><Link href={`/products/${product.slug}`}>{product.name}</Link></h2>
              <span>{product.organisation}</span>
            </div>
            <p>{product.category}</p>
            <EvidenceStatusLabel compact status={product.evidence[0]} />
            <span>{product.deploymentCountries.length ? product.deploymentCountries.join(", ") : "No evidenced country"}</span>
            <Freshness date={product.lastChecked} />
            <button
              className="text-button"
              onClick={(event) => onOpenProduct(product, event.currentTarget)}
              type="button"
            >
              Preview record →
            </button>
          </article>
        ))}
      </div>
      <div className="pagination">
        <button disabled type="button">Previous</button>
        <span>Page 1 of 1</span>
        <button disabled type="button">Next</button>
      </div>
      <p className="licence-note">
        Prototype export for interface testing. Intended public project data licence:
        CC BY 4.0; third-party source content is excluded.
      </p>

      {exportOpen ? (
        <div className="modal-backdrop" onMouseDown={() => setExportOpen(false)}>
          <section
            aria-labelledby="export-title"
            aria-modal="true"
            className="export-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="sheet-header">
              <div>
                <span className="eyebrow">Reusable data</span>
                <h2 id="export-title">Export current view</h2>
              </div>
              <button className="quiet-button" onClick={() => setExportOpen(false)} type="button">Close</button>
            </div>
            <div className="export-summary">
              <strong>{rows.length} records</strong>
              <span>{activeFilters.length ? activeFilters.join(" · ") : "No active filters"}</span>
              <span>{visibleColumns.length + 1} columns</span>
            </div>
            <fieldset>
              <legend>Format</legend>
              <label><input checked={exportFormat === "csv"} name="format" onChange={() => setExportFormat("csv")} type="radio" /> CSV</label>
              <label><input checked={exportFormat === "json"} name="format" onChange={() => setExportFormat("json")} type="radio" /> JSON</label>
            </fieldset>
            <label className="source-toggle">
              <input checked={includeSources} onChange={(event) => setIncludeSources(event.target.checked)} type="checkbox" />
              <span><strong>Include source URLs</strong><small>Add the public source URL available for each exported record.</small></span>
            </label>
            <div className="dialog-notice">
              <strong>Candidate data</strong>
              <p>This download is a prototype artefact and must not be presented as a published release.</p>
            </div>
            <button className="button button-primary export-submit" onClick={downloadExport} type="button">
              Download {exportFormat.toUpperCase()}
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ProductPreview({
  close,
  product,
}: {
  close: () => void;
  product: Product;
}) {
  const productDeployments = deployments.filter(
    (deployment) => deployment.productId === product.id,
  );
  return (
    <div className="drawer-backdrop" onMouseDown={close}>
      <aside
        aria-labelledby="preview-title"
        aria-modal="true"
        className="product-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="drawer-top">
          <button className="back-button" onClick={close} type="button">← Back to results</button>
          <button className="quiet-button" onClick={close} type="button">Close</button>
        </div>
        <div className="preview-heading">
          <div>
            <span className="eyebrow">Product preview</span>
            <h2 id="preview-title">{product.name}</h2>
            <Link href={`/organisations/${product.organisationId === "org_001" ? "beacon-power-services" : product.organisationId === "org_002" ? "pam-africa" : "powerlabs"}`}>
              {product.organisation}
            </Link>
          </div>
          <LifecycleTag value={product.lifecycle} />
        </div>
        <div className="preview-labels">
          <OriginLabel value={product.origin} />
          <EvidenceStatusLabel status={product.evidence[0]} />
        </div>
        <p className="preview-description">{product.description}</p>
        <Link className="category-link" href={`/?category=${product.categoryId}`}>{product.category}</Link>
        <section className="preview-section">
          <div className="section-heading-row">
            <h3>Evidence</h3>
            <span>{productDeployments.length} deployments</span>
          </div>
          {productDeployments.length ? (
            <div className="preview-deployments">
              {productDeployments.map((deployment) => (
                <div key={deployment.id}>
                  <span><strong>{deployment.country}</strong><small>{deployment.customer}</small></span>
                  <span>{deployment.year}</span>
                  <EvidenceStatusLabel compact status={deployment.evidence} />
                </div>
              ))}
            </div>
          ) : (
            <div className="no-evidence">
              <strong>No evidenced deployment in the candidate batch.</strong>
              <p>Provider availability is not counted as deployment evidence.</p>
            </div>
          )}
        </section>
        <Freshness date={product.lastChecked} />
        <div className="drawer-actions">
          <Link className="button button-primary" href={`/products/${product.slug}`}>View full profile</Link>
          <Link className="button button-outline" href={`/contribute/correction?product=${product.slug}`}>Suggest a correction</Link>
        </div>
      </aside>
    </div>
  );
}

function CoverageCallout() {
  return (
    <section className="coverage-callout">
      <div>
        <span className="eyebrow">Coverage, not completeness</span>
        <h2>Five candidate products are enough to test the system, not describe the market.</h2>
      </div>
      <p>
        This workstream deliberately exposes research queues, unknowns and structural
        hypotheses. The empty states are part of the evidence model, not placeholders
        to hide.
      </p>
      <Link className="button button-primary" href="/contribute">Contribute evidence</Link>
    </section>
  );
}

function countClass(count: number) {
  if (count >= 10) return "count-highest";
  if (count >= 4) return "count-high";
  if (count > 0) return "count-low";
  return "count-zero";
}

function labelGeography(value: string) {
  return {
    claimed: "Claimed availability",
    headquarters: "Current headquarters",
    founded: "Country of origin",
  }[value] ?? "Geography";
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
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
