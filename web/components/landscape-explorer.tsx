"use client";

import Link from "next/link";
import Image from "next/image";
import {
  landscapeAfricaUseLabels,
  landscapeCategoryLabels,
  landscapeDeploymentLeads,
  landscapeEnergyRelationshipDescriptions,
  landscapeEnergyRelationshipLabels,
  landscapeFunctionLabels,
  landscapeItems,
  landscapeKindLabels,
  landscapeRelationships,
  landscapeSectorLabels,
  landscapeSourceDomains,
  landscapeSourceAsOf,
  landscapeStageLabels,
  type AfricaUseAsSubmitted,
  type EnergyRelationship,
  type LandscapeItem,
  type LandscapeKind,
} from "@/lib/landscape-data";
import { normaliseQuery } from "@/lib/registry-query";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type LandscapeView = "wall" | "listings" | "deployments" | "history" | "sources";

const kindOptions = Object.entries(landscapeKindLabels) as [LandscapeKind, string][];
const stageOptions = Object.entries(landscapeStageLabels);
const functionOptions = Object.entries(landscapeFunctionLabels).sort((left, right) =>
  left[1].localeCompare(right[1]),
);
const sectorOptions = Object.entries(landscapeSectorLabels);
const relationshipOptions = Object.entries(landscapeEnergyRelationshipLabels) as [
  EnergyRelationship,
  string,
][];
const africaUseOptions = Object.entries(landscapeAfricaUseLabels) as [
  AfricaUseAsSubmitted,
  string,
][];
const firstPageSize = 48;
const wallPreviewSize = 12;

export function LandscapeExplorer({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<LandscapeKind | "all">("all");
  const [stage, setStage] = useState("all");
  const [functionId, setFunctionId] = useState("all");
  const [sector, setSector] = useState("all");
  const [relationship, setRelationship] = useState<EnergyRelationship | "all">("all");
  const [africaUse, setAfricaUse] = useState<AfricaUseAsSubmitted | "all">("all");
  const [displayLimit, setDisplayLimit] = useState(firstPageSize);
  const [view, setView] = useState<LandscapeView>("wall");
  const [selectedItem, setSelectedItem] = useState<LandscapeItem | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const filteredItems = useMemo(() => {
    const term = normaliseQuery(query);
    return landscapeItems.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (stage !== "all" && !item.stageIds.includes(stage)) return false;
      if (functionId !== "all" && !item.functionIds.includes(functionId)) return false;
      if (sector !== "all" && !item.sectorIds.includes(sector)) return false;
      if (relationship !== "all" && item.energyRelationship !== relationship) return false;
      if (africaUse !== "all" && item.africaUseAsSubmitted !== africaUse) return false;
      if (!term) return true;
      return normaliseQuery(
        [
          item.name,
          item.parent ?? "",
          ...(item.aliases ?? []),
          item.summaryAsSubmitted,
          item.statusAsSubmitted,
          ...item.geographies,
          landscapeEnergyRelationshipLabels[item.energyRelationship],
          ...item.functionIds.map((id) => landscapeFunctionLabels[id] ?? id),
          ...item.categoryIds.map((id) => landscapeCategoryLabels[id] ?? id),
        ].join(" "),
      ).includes(term);
    });
  }, [africaUse, functionId, kind, query, relationship, sector, stage]);

  const visibleItems = filteredItems.slice(0, displayLimit);
  const hasFilters = Boolean(
    query ||
      kind !== "all" ||
      stage !== "all" ||
      functionId !== "all" ||
      sector !== "all" ||
      relationship !== "all" ||
      africaUse !== "all",
  );

  function resetListings() {
    setQuery("");
    setKind("all");
    setStage("all");
    setFunctionId("all");
    setSector("all");
    setRelationship("all");
    setAfricaUse("all");
    setDisplayLimit(firstPageSize);
  }

  function openItem(item: LandscapeItem, element: HTMLElement) {
    openerRef.current = element;
    setSelectedItem(item);
  }

  function closeItem() {
    setSelectedItem(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  function showStage(stageId: string) {
    setStage(stageId);
    setDisplayLimit(firstPageSize);
    setView("listings");
  }

  function download(format: "csv" | "json") {
    const rows =
      view === "wall" || view === "listings"
        ? filteredItems.map(exportItem)
        : view === "deployments"
          ? landscapeDeploymentLeads
          : view === "history"
            ? landscapeRelationships
            : landscapeSourceDomains.map((domain) => ({ domain, url: `https://${domain}` }));
    const content = format === "json" ? JSON.stringify(rows, null, 2) : toCsv(rows);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `africa-energy-software-landscape-${view}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const visibleCount =
    view === "wall" || view === "listings"
      ? filteredItems.length
      : view === "deployments"
        ? landscapeDeploymentLeads.length
        : view === "history"
          ? landscapeRelationships.length
          : landscapeSourceDomains.length;

  return (
    <main className="landscape-page" id="main-content" tabIndex={-1}>
      <header className="landscape-intro">
        <div>
          <h1>Software wall</h1>
          <p>Browse tools by where they sit in the energy system.</p>
        </div>
        <div className="landscape-intro-links">
          <Link href="/directory">Reviewed data</Link>
          <Link href="/deployments">Deployment map</Link>
        </div>
      </header>

      <section className="landscape-scoreboard" aria-label="Catalogue totals">
        <div><strong>{landscapeItems.length}</strong><span>listings</span></div>
        <div><strong>{stageOptions.length}</strong><span>stages</span></div>
        <div><strong>{functionOptions.length}</strong><span>functions</span></div>
      </section>

      <nav aria-label="Landscape views" className="landscape-tabs">
        {[
          ["wall", "Wall", landscapeItems.length],
          ["listings", "List", landscapeItems.length],
          ["deployments", "Deployment leads", landscapeDeploymentLeads.length],
          ["history", "History", landscapeRelationships.length],
          ["sources", "Sources", landscapeSourceDomains.length],
        ].map(([value, label, count]) => (
          <button
            aria-current={view === value ? "page" : undefined}
            key={value}
            onClick={() => setView(value as LandscapeView)}
            type="button"
          >
            {label} <span>{count}</span>
          </button>
        ))}
      </nav>

      {view === "wall" || view === "listings" ? (
        <LandscapeControls
          africaUse={africaUse}
          functionId={functionId}
          hasFilters={hasFilters}
          kind={kind}
          query={query}
          relationship={relationship}
          reset={resetListings}
          sector={sector}
          setAfricaUse={setAfricaUse}
          setFunctionId={setFunctionId}
          setKind={setKind}
          setQuery={setQuery}
          setRelationship={setRelationship}
          setSector={setSector}
          setStage={setStage}
          stage={stage}
        />
      ) : null}

      {view === "wall" ? (
        <LandscapeWall
          items={filteredItems}
          onOpen={openItem}
          onShowStage={showStage}
          reset={resetListings}
        />
      ) : view === "listings" ? (
        <section aria-live="polite" className="landscape-results">
          <div className="landscape-result-line">
            <span>{filteredItems.length} shown</span>
            <span>Catalogue · {landscapeSourceAsOf}</span>
          </div>
          {filteredItems.length ? (
            <div className="landscape-grid">
              {visibleItems.map((item, index) => (
                <LandscapeCard index={index} item={item} key={item.id} onOpen={openItem} />
              ))}
            </div>
          ) : (
            <div className="landscape-empty">
              <strong>No match</strong>
              <button onClick={resetListings} type="button">Show all listings</button>
            </div>
          )}
          {visibleItems.length < filteredItems.length ? (
            <button
              className="landscape-load-more"
              onClick={() => setDisplayLimit((value) => value + firstPageSize)}
              type="button"
            >
              Show more · {filteredItems.length - visibleItems.length} remaining
            </button>
          ) : null}
        </section>
      ) : view === "deployments" ? (
        <section className="landscape-lead-list" aria-live="polite">
          {landscapeDeploymentLeads.length ? landscapeDeploymentLeads.map((lead, index) => (
            <article key={lead.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{lead.name}</h2><p>{lead.countries.join(", ")} · {lead.customerAsSubmitted}</p></div>
              <p>{lead.scaleAsSubmitted}</p>
              <small>{lead.dateAsSubmitted}</small>
            </article>
          )) : <LandscapeWaiting label="deployment leads" />}
        </section>
      ) : view === "history" ? (
        <section className="landscape-lead-list" aria-live="polite">
          {landscapeRelationships.length ? landscapeRelationships.map((event, index) => (
            <article key={event.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{event.subject}</h2><p>{event.eventAsSubmitted}</p></div>
              <small>{event.dateAsSubmitted}</small>
            </article>
          )) : <LandscapeWaiting label="company events" />}
        </section>
      ) : (
        <section className="landscape-source-list" aria-live="polite">
          {landscapeSourceDomains.map((domain, index) => (
            <a href={`https://${domain}`} key={domain} rel="noreferrer" target="_blank">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{domain}</strong>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
        </section>
      )}

      <section className="landscape-export">
        <div><strong>{visibleCount}</strong><span>records in this view</span></div>
        <p>Download this view.</p>
        <div>
          <button disabled={!visibleCount} onClick={() => download("csv")} type="button">CSV ↓</button>
          <button disabled={!visibleCount} onClick={() => download("json")} type="button">JSON ↓</button>
        </div>
      </section>

      <section className="landscape-contribute">
        <h2>Missing a name?</h2>
        <Link href="/contribute/product">Add it <span aria-hidden="true">↗</span></Link>
      </section>

      {selectedItem ? <LandscapePreview close={closeItem} item={selectedItem} /> : null}
    </main>
  );
}

function LandscapeControls({
  africaUse,
  functionId,
  hasFilters,
  kind,
  query,
  relationship,
  reset,
  sector,
  setAfricaUse,
  setFunctionId,
  setKind,
  setQuery,
  setRelationship,
  setSector,
  setStage,
  stage,
}: {
  africaUse: AfricaUseAsSubmitted | "all";
  functionId: string;
  hasFilters: boolean;
  kind: LandscapeKind | "all";
  query: string;
  relationship: EnergyRelationship | "all";
  reset: () => void;
  sector: string;
  setAfricaUse: (value: AfricaUseAsSubmitted | "all") => void;
  setFunctionId: (value: string) => void;
  setKind: (value: LandscapeKind | "all") => void;
  setQuery: (value: string) => void;
  setRelationship: (value: EnergyRelationship | "all") => void;
  setSector: (value: string) => void;
  setStage: (value: string) => void;
  stage: string;
}) {
  return (
    <section className="landscape-controls" aria-label="Filter listings">
      <label className="landscape-search">
        <span className="sr-only">Search all listings</span>
        <i aria-hidden="true">⌕</i>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the wall"
          type="search"
          value={query}
        />
      </label>
      <label>
        <span>Relationship</span>
        <select
          onChange={(event) => setRelationship(event.target.value as EnergyRelationship | "all")}
          value={relationship}
        >
          <option value="all">All relationships</option>
          {relationshipOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>
        <span>Function</span>
        <select onChange={(event) => setFunctionId(event.target.value)} value={functionId}>
          <option value="all">All functions</option>
          {functionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>
        <span>Stage</span>
        <select onChange={(event) => setStage(event.target.value)} value={stage}>
          <option value="all">All stages</option>
          {stageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <details className="landscape-more-filters">
        <summary>More</summary>
        <div>
          <label>
            <span>Type</span>
            <select onChange={(event) => setKind(event.target.value as LandscapeKind | "all")} value={kind}>
              <option value="all">All types</option>
              {kindOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Sector</span>
            <select onChange={(event) => setSector(event.target.value)} value={sector}>
              <option value="all">All sectors</option>
              {sectorOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Africa link</span>
            <select
              onChange={(event) => setAfricaUse(event.target.value as AfricaUseAsSubmitted | "all")}
              value={africaUse}
            >
              <option value="all">All listings</option>
              {africaUseOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </details>
      <button className="landscape-clear" disabled={!hasFilters} onClick={reset} type="button">
        Clear
      </button>
    </section>
  );
}

function LandscapeWall({
  items,
  onOpen,
  onShowStage,
  reset,
}: {
  items: LandscapeItem[];
  onOpen: (item: LandscapeItem, element: HTMLElement) => void;
  onShowStage: (stageId: string) => void;
  reset: () => void;
}) {
  const wallItems = [...items]
    .filter((item) => item.kind !== "source_directory")
    .sort((left, right) => left.name.localeCompare(right.name));
  const crossCutting = wallItems.filter((item) => item.stageIds.length === 0);
  const stageGroups = stageOptions
    .map(([stageId, label], stageIndex) => ({
      items: wallItems.filter((item) => item.stageIds.includes(stageId)),
      label,
      stageId,
      stageIndex,
    }))
    .filter((group) => group.items.length > 0);

  if (!wallItems.length) {
    return (
      <div className="landscape-empty landscape-wall-empty">
        <strong>No match</strong>
        <button onClick={reset} type="button">Show the full wall</button>
      </div>
    );
  }

  return (
    <section className="landscape-wall" aria-label="Software across the value chain">
      {stageGroups.length > 1 ? <div className="landscape-wall-route" aria-hidden="true"><i /></div> : null}
      {stageGroups.length ? (
        <div
          className="landscape-wall-stages"
          style={{ "--landscape-stage-count": stageGroups.length } as CSSProperties}
        >
          {stageGroups.map(({ items: stageItems, label, stageId, stageIndex }) => (
            <section className="landscape-wall-stage" key={stageId}>
              <header>
                <span>{String(stageIndex + 1).padStart(2, "0")}</span>
                <h2>{label}</h2>
                <b>{stageItems.length}</b>
              </header>
              <div className="landscape-wall-tiles">
                {stageItems.slice(0, wallPreviewSize).map((item) => (
                  <IdentityTile item={item} key={`${stageId}-${item.id}`} onOpen={onOpen} />
                ))}
              </div>
              {stageItems.length > wallPreviewSize ? (
                <button className="landscape-stage-all" onClick={() => onShowStage(stageId)} type="button">
                  View all {stageItems.length} <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}

      {crossCutting.length ? (
        <section className="landscape-wall-crosscutting">
          <header><span>＋</span><h2>Cross-cutting</h2><b>{crossCutting.length}</b></header>
          <div className="landscape-wall-tiles landscape-wall-tiles-wide">
            {crossCutting.slice(0, wallPreviewSize * 2).map((item) => (
              <IdentityTile item={item} key={`cross-${item.id}`} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function IdentityTile({
  item,
  onOpen,
}: {
  item: LandscapeItem;
  onOpen: (item: LandscapeItem, element: HTMLElement) => void;
}) {
  const functionLabel = item.functionIds[0]
    ? landscapeFunctionLabels[item.functionIds[0]]
    : "Function not set";
  return (
    <button
      aria-label={`Open ${item.name}, ${landscapeEnergyRelationshipLabels[item.energyRelationship]}`}
      className="landscape-identity-tile"
      onClick={(event) => onOpen(item, event.currentTarget)}
      type="button"
    >
      <IdentityMark item={item} />
      <span>{item.name}</span>
      <small>{functionLabel}</small>
    </button>
  );
}

function IdentityMark({ item }: { item: LandscapeItem }) {
  if (item.logoPath) {
    return <Image alt="" height={36} src={item.logoPath} unoptimized width={36} />;
  }
  return <i aria-hidden="true">{initials(item.name)}</i>;
}

function LandscapeCard({
  item,
  index,
  onOpen,
}: {
  item: LandscapeItem;
  index: number;
  onOpen: (item: LandscapeItem, element: HTMLElement) => void;
}) {
  return (
    <article className="landscape-card">
      <div className="landscape-card-top">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <b>{landscapeEnergyRelationshipLabels[item.energyRelationship]}</b>
      </div>
      <IdentityMark item={item} />
      <h2>{item.name}</h2>
      {item.parent ? <p className="landscape-parent">{item.parent}</p> : null}
      <p>{item.summaryAsSubmitted}</p>
      <div className="landscape-card-tags">
        {item.functionIds.slice(0, 2).map((id) => <span key={id}>{landscapeFunctionLabels[id] ?? id}</span>)}
      </div>
      <button className="landscape-card-open" onClick={(event) => onOpen(item, event.currentTarget)} type="button">
        Open <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

function LandscapePreview({ item, close }: { item: LandscapeItem; close: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      aria-labelledby="landscape-preview-title"
      className="landscape-preview"
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
      onClose={close}
      ref={dialogRef}
    >
      <div className="landscape-preview-sheet">
        <button aria-label="Close listing" className="landscape-preview-close" onClick={() => dialogRef.current?.close()} type="button">×</button>
        <div className="landscape-preview-identity">
          <IdentityMark item={item} />
          <div>
            <span>{landscapeEnergyRelationshipLabels[item.energyRelationship]}</span>
            <h2 id="landscape-preview-title">{item.name}</h2>
            {item.parent ? <p>{item.parent}</p> : null}
          </div>
        </div>
        <p className="landscape-preview-summary">{item.summaryAsSubmitted}</p>
        <p className="landscape-preview-relationship">
          {landscapeEnergyRelationshipDescriptions[item.energyRelationship]}
        </p>
        <dl>
          <div><dt>Function</dt><dd>{item.functionIds.map((id) => landscapeFunctionLabels[id] ?? id).join(", ") || "Not set"}</dd></div>
          <div><dt>Value chain</dt><dd>{item.stageIds.map((id) => landscapeStageLabels[id] ?? id).join(", ") || "Cross-cutting"}</dd></div>
          <div><dt>Sector</dt><dd>{item.sectorIds.map((id) => landscapeSectorLabels[id] ?? id).join(", ") || "Not supplied"}</dd></div>
          <div><dt>Places</dt><dd>{item.geographies.join(", ") || "Not supplied"}</dd></div>
          {item.africaUseAsSubmitted ? <div><dt>Africa link</dt><dd>{landscapeAfricaUseLabels[item.africaUseAsSubmitted]}</dd></div> : null}
          {item.deliveryModelsAsSubmitted?.length ? <div><dt>Delivery</dt><dd>{item.deliveryModelsAsSubmitted.join(", ")}</dd></div> : null}
          {item.commercialModelAsSubmitted ? <div><dt>Access</dt><dd>{item.commercialModelAsSubmitted}</dd></div> : null}
        </dl>
        <div className="landscape-preview-actions">
          {item.canonicalHref ? <Link href={item.canonicalHref}>Reviewed record</Link> : null}
          {item.sourceUrls?.slice(0, 2).map((url) => (
            <a href={url} key={url} rel="noreferrer" target="_blank">Source ↗</a>
          ))}
        </div>
      </div>
    </dialog>
  );
}

function LandscapeWaiting({ label }: { label: string }) {
  return (
    <div className="landscape-waiting">
      <span aria-hidden="true">↘</span>
      <strong>{label} are queued in the next catalogue shard.</strong>
    </div>
  );
}

function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "•";
}

function exportItem(item: LandscapeItem) {
  return {
    name: item.name,
    type: landscapeKindLabels[item.kind],
    parent: item.parent ?? "",
    energy_relationship: landscapeEnergyRelationshipLabels[item.energyRelationship],
    functions: item.functionIds.map((id) => landscapeFunctionLabels[id] ?? id),
    categories: item.categoryIds.map((id) => landscapeCategoryLabels[id] ?? id),
    stages: item.stageIds.map((id) => landscapeStageLabels[id] ?? id),
    geographies: item.geographies,
    status_as_submitted: item.statusAsSubmitted,
    summary_as_submitted: item.summaryAsSubmitted,
    source_domains: item.sourceDomains,
    source_urls: item.sourceUrls ?? [],
    website_as_submitted: item.websiteAsSubmitted ?? "",
    sectors: item.sectorIds.map((id) => landscapeSectorLabels[id] ?? id),
    segments_as_submitted: item.segmentsAsSubmitted ?? [],
    delivery_models_as_submitted: item.deliveryModelsAsSubmitted ?? [],
    commercial_model_as_submitted: item.commercialModelAsSubmitted ?? "",
    africa_use_as_submitted: item.africaUseAsSubmitted ?? "",
    as_of_date: item.asOfDate ?? "",
    reviewed_record: item.canonicalHref ?? "",
  };
}

function toCsv(rows: object[]) {
  if (!rows.length) return "";
  const records = rows as Record<string, unknown>[];
  const headers = Array.from(new Set(records.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => {
    const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.map(escape).join(","),
    ...records.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
