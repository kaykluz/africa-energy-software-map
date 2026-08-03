"use client";

import Link from "next/link";
import {
  landscapeCategoryLabels,
  landscapeDeploymentLeads,
  landscapeItems,
  landscapeKindLabels,
  landscapeRelationships,
  landscapeSourceDomains,
  landscapeSourceAsOf,
  landscapeStageLabels,
  type LandscapeItem,
  type LandscapeKind,
} from "@/lib/landscape-data";
import { normaliseQuery } from "@/lib/registry-query";
import { useMemo, useState } from "react";

type LandscapeView = "listings" | "deployments" | "history" | "sources";

const kindOptions = Object.entries(landscapeKindLabels) as [
  LandscapeKind,
  string,
][];
const stageOptions = Object.entries(landscapeStageLabels);

export function LandscapeExplorer({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [kind, setKind] = useState<LandscapeKind | "all">("all");
  const [stage, setStage] = useState("all");
  const [view, setView] = useState<LandscapeView>("listings");

  const filteredItems = useMemo(() => {
    const term = normaliseQuery(query);
    return landscapeItems.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (stage !== "all" && !item.stageIds.includes(stage)) return false;
      if (!term) return true;
      return normaliseQuery(
        [
          item.name,
          item.parent ?? "",
          ...(item.aliases ?? []),
          item.summaryAsSubmitted,
          item.statusAsSubmitted,
          ...item.geographies,
          ...item.categoryIds.map((id) => landscapeCategoryLabels[id] ?? id),
        ].join(" "),
      ).includes(term);
    });
  }, [kind, query, stage]);

  function download(format: "csv" | "json") {
    const rows =
      view === "listings"
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
    view === "listings"
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
          <h1>The full list</h1>
          <p>
            Every organisation, product and research lead submitted to the map,
            arranged by where it fits.
          </p>
        </div>
        <div className="landscape-intro-links">
          <Link href="/directory">Reviewed data</Link>
          <Link href="/deployments">Deployment map</Link>
        </div>
      </header>

      <section className="landscape-scoreboard" aria-label="Catalogue totals">
        <div><strong>{landscapeItems.length}</strong><span>listings</span></div>
        <div><strong>{landscapeDeploymentLeads.length}</strong><span>deployment leads</span></div>
        <div><strong>{landscapeRelationships.length}</strong><span>company events</span></div>
        <p>
          Listed means included. The deployment map remains the place for
          source-linked deployment records.
        </p>
      </section>

      <nav aria-label="Landscape views" className="landscape-tabs">
        {[
          ["listings", "Listings", landscapeItems.length],
          ["deployments", "Deployment leads", landscapeDeploymentLeads.length],
          ["history", "Company history", landscapeRelationships.length],
          ["sources", "Sources supplied", landscapeSourceDomains.length],
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

      {view === "listings" ? (
        <>
          <section className="landscape-controls" aria-label="Filter listings">
            <label className="landscape-search">
              <span className="sr-only">Search all listings</span>
              <i aria-hidden="true">⌕</i>
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search names, places or categories"
                type="search"
                value={query}
              />
            </label>
            <label>
              <span>Type</span>
              <select onChange={(event) => setKind(event.target.value as LandscapeKind | "all")} value={kind}>
                <option value="all">All types</option>
                {kindOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>Stage</span>
              <select onChange={(event) => setStage(event.target.value)} value={stage}>
                <option value="all">All stages</option>
                {stageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button
              className="landscape-clear"
              disabled={!query && kind === "all" && stage === "all"}
              onClick={() => { setQuery(""); setKind("all"); setStage("all"); }}
              type="button"
            >
              Clear
            </button>
          </section>

          <section aria-live="polite" className="landscape-results">
            <div className="landscape-result-line">
              <span>{filteredItems.length} shown</span>
              <span>Submitted list · {landscapeSourceAsOf}</span>
            </div>
            {filteredItems.length ? (
              <div className="landscape-grid">
                {filteredItems.map((item, index) => <LandscapeCard index={index} item={item} key={item.id} />)}
              </div>
            ) : (
              <div className="landscape-empty">
                <strong>No match</strong>
                <button onClick={() => { setQuery(""); setKind("all"); setStage("all"); }} type="button">Show all listings</button>
              </div>
            )}
          </section>
        </>
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
        <p>Take the list with you.</p>
        <div>
          <button disabled={!visibleCount} onClick={() => download("csv")} type="button">CSV ↓</button>
          <button disabled={!visibleCount} onClick={() => download("json")} type="button">JSON ↓</button>
        </div>
      </section>

      <section className="landscape-contribute">
        <h2>Missing a name?</h2>
        <Link href="/contribute/product">Add it <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}

function LandscapeCard({ item, index }: { item: LandscapeItem; index: number }) {
  return (
    <article className="landscape-card">
      <div className="landscape-card-top">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <b>{landscapeKindLabels[item.kind]}</b>
      </div>
      <h2>{item.name}</h2>
      {item.parent ? <p className="landscape-parent">{item.parent}</p> : null}
      <p>{item.summaryAsSubmitted}</p>
      <div className="landscape-card-tags">
        {item.categoryIds.slice(0, 2).map((id) => <span key={id}>{landscapeCategoryLabels[id] ?? id}</span>)}
      </div>
      <details>
        <summary>More</summary>
        <dl>
          <div><dt>Places</dt><dd>{item.geographies.join(", ") || "Not supplied"}</dd></div>
          <div><dt>Status supplied</dt><dd>{item.statusAsSubmitted || "Not supplied"}</dd></div>
          <div><dt>Sources supplied</dt><dd>{item.sourceDomains.join(", ") || "None"}</dd></div>
        </dl>
      </details>
      {item.canonicalHref ? <Link href={item.canonicalHref}>Open reviewed record →</Link> : null}
    </article>
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

function exportItem(item: LandscapeItem) {
  return {
    name: item.name,
    type: landscapeKindLabels[item.kind],
    parent: item.parent ?? "",
    categories: item.categoryIds.map((id) => landscapeCategoryLabels[id] ?? id),
    stages: item.stageIds.map((id) => landscapeStageLabels[id] ?? id),
    geographies: item.geographies,
    status_as_submitted: item.statusAsSubmitted,
    summary_as_submitted: item.summaryAsSubmitted,
    source_domains: item.sourceDomains,
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
  return [headers.map(escape).join(","), ...records.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}
