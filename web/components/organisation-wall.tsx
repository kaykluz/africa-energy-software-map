"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DatabaseHeader } from "@/components/database-header";
import { OrganisationMark } from "@/components/brand-mark";
import type { OrganisationCatalogueRecord } from "@/lib/organisation-catalogue";

const roleOrder = [
  "Developer",
  "EPC",
  "OEM",
  "Financier",
  "Operator",
  "Software/Data",
  "Enabler",
  "Public Institution",
] as const;
const wallPageSize = 28;

export function OrganisationWall({
  initialCountry = "all",
  initialQuery = "",
  initialRole = "all",
  initialScope = "all",
  initialSegment = "all",
  records,
  softwareCount,
}: {
  initialCountry?: string;
  initialQuery?: string;
  initialRole?: string;
  initialScope?: string;
  initialSegment?: string;
  records: OrganisationCatalogueRecord[];
  softwareCount: number;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState(initialRole);
  const [segment, setSegment] = useState(initialSegment);
  const [country, setCountry] = useState(initialCountry);
  const [scope, setScope] = useState(initialScope);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<OrganisationCatalogueRecord | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const roleOptions = useMemo(() => unique(records.flatMap((record) => record.roles)), [records]);
  const segmentOptions = useMemo(() => unique(records.flatMap((record) => record.segments)), [records]);
  const countryOptions = useMemo(() => unique(records.flatMap((record) => [record.headquartersCountry, ...record.countriesActive])), [records]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return records.filter((record) => {
      if (role !== "all" && !record.roles.includes(role)) return false;
      if (segment !== "all" && !record.segments.includes(segment)) return false;
      if (country !== "all" && record.headquartersCountry !== country && !record.countriesActive.includes(country)) return false;
      if (scope === "reviewed" && record.reviewState !== "reviewed") return false;
      if (scope === "pending" && record.reviewState !== "needs_review") return false;
      if (scope === "africa_hq" && !record.africaHeadquartered) return false;
      if (scope === "international" && record.africaHeadquartered) return false;
      if (!term) return true;
      return [record.name, record.parent, ...record.roles, ...record.segments, ...record.countriesActive, record.headquartersCountry]
        .join(" ").toLowerCase().includes(term);
    });
  }, [country, query, records, role, scope, segment]);
  const groups = useMemo(() => {
    const known = roleOrder.map((label) => [label, filtered.filter((record) => record.roles.includes(label))] as const);
    const other = filtered.filter((record) => !record.roles.some((value) => roleOrder.includes(value as typeof roleOrder[number])));
    return [...known, ["Other and to classify", other] as const].filter(([, items]) => items.length);
  }, [filtered]);

  useEffect(() => {
    const params = new URLSearchParams({ object: "organisations" });
    if (query.trim()) params.set("q", query.trim());
    if (role !== "all") params.set("role", role);
    if (segment !== "all") params.set("segment", segment);
    if (country !== "all") params.set("country", country);
    if (scope !== "all") params.set("scope", scope);
    window.history.replaceState(null, "", `/landscape?${params}`);
  }, [country, query, role, scope, segment]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected) {
        setSelected(null);
        openerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected]);

  function reset() {
    setQuery("");
    setRole("all");
    setSegment("all");
    setCountry("all");
    setScope("all");
    setLimits({});
  }

  function open(record: OrganisationCatalogueRecord, element: HTMLElement) {
    openerRef.current = element;
    setSelected(record);
  }

  return (
    <main className="organisation-wall-page" id="main-content" tabIndex={-1}>
      <DatabaseHeader
        activeObject="organisations"
        activeView="wall"
        cardsHref="/organisations"
        mapHref="/deployments?object=organisations"
        organisationCount={records.length}
        organisationsHref="/landscape?object=organisations"
        softwareCount={softwareCount}
        softwareHref="/landscape"
        wallHref="/landscape?object=organisations"
      />
      <section className="organisation-wall-summary" aria-label="Organisation wall totals">
        <div><strong>{filtered.length.toLocaleString()}</strong><span>organisations in view</span></div>
        <p>Organisations appear under every applicable role. Colour marks their market, not a ranking.</p>
      </section>
      <section className="organisation-wall-controls" aria-label="Filter organisation wall">
        <label className="organisation-wall-search"><span aria-hidden="true">⌕</span><input aria-label="Search organisation wall" onChange={(event) => setQuery(event.target.value)} placeholder="Search organisations" type="search" value={query} /></label>
        <select aria-label="Filter wall by role" onChange={(event) => setRole(event.target.value)} value={role}><option value="all">All roles</option>{roleOptions.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter wall by market" onChange={(event) => setSegment(event.target.value)} value={segment}><option value="all">All markets</option>{segmentOptions.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter wall by country" onChange={(event) => setCountry(event.target.value)} value={country}><option value="all">All countries</option>{countryOptions.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter wall by review status" onChange={(event) => setScope(event.target.value)} value={scope}><option value="all">All records</option><option value="reviewed">Reviewed</option><option value="pending">Review pending</option><option value="africa_hq">Africa-headquartered</option><option value="international">International, active in Africa</option></select>
        <button disabled={query === "" && role === "all" && segment === "all" && country === "all" && scope === "all"} onClick={reset} type="button">Clear</button>
      </section>

      {groups.length ? <div className="organisation-wall-groups">
        {groups.map(([label, items]) => {
          const limit = limits[label] ?? wallPageSize;
          return <section key={label}>
            <header><h2>{label}</h2><span>{items.length.toLocaleString()}</span></header>
            <div className="organisation-logo-wall">
              {items.slice(0, limit).map((record) => {
                const canonicalId = record.reconciliation.status === "reviewed_match" ? record.reconciliation.canonicalOrganisationId : record.id;
                const canonicalHref = record.reconciliation.status === "reviewed_match" ? record.reconciliation.canonicalHref : "";
                return <article data-market={marketTone(record.segments)} key={`${label}-${record.id}`}>
                  <OrganisationMark name={record.name} organisationId={canonicalId} size={44} />
                  <span>{canonicalHref ? <Link href={canonicalHref}><strong>{record.name}</strong></Link> : <button onClick={(event) => open(record, event.currentTarget)} type="button"><strong>{record.name}</strong></button>}<small>{record.segments.slice(0, 2).join(" · ") || record.headquartersCountry || "Market not classified"}</small></span>
                  <button aria-label={`Preview ${record.name}`} onClick={(event) => open(record, event.currentTarget)} type="button">＋</button>
                </article>;
              })}
            </div>
            {limit < items.length ? <button className="organisation-wall-more" onClick={() => setLimits((current) => ({ ...current, [label]: limit + wallPageSize }))} type="button">Show {Math.min(wallPageSize, items.length - limit)} more</button> : null}
          </section>;
        })}
      </div> : <div className="organisation-wall-empty"><strong>No matching organisation</strong><button onClick={reset} type="button">Show the full wall</button></div>}

      {selected ? <OrganisationWallPreview close={() => { setSelected(null); openerRef.current?.focus(); }} record={selected} /> : null}
    </main>
  );
}

function OrganisationWallPreview({ close, record }: { close: () => void; record: OrganisationCatalogueRecord }) {
  const href = record.reconciliation.status === "reviewed_match" ? record.reconciliation.canonicalHref : "";
  const organisationId = record.reconciliation.status === "reviewed_match" ? record.reconciliation.canonicalOrganisationId : record.id;
  return <div className="drawer-backdrop" onMouseDown={close} role="presentation">
    <aside aria-label={`${record.name} preview`} aria-modal="true" className="product-drawer organisation-preview-drawer" onMouseDown={(event) => event.stopPropagation()} role="dialog">
      <div className="drawer-top"><span>Organisation</span><button aria-label="Close organisation preview" onClick={close} type="button">Close</button></div>
      <div className="organisation-preview-heading"><OrganisationMark name={record.name} organisationId={organisationId} size={64} /><div><h2>{href ? <Link href={href}>{record.name}</Link> : record.name}</h2><p>{record.primaryRole || record.organisationType || "Role not classified"}</p></div></div>
      <div className="preview-labels"><span className="semantic-tag">{record.reviewState === "reviewed" ? "Reviewed" : "Review pending"}</span>{record.africaHeadquartered ? <span className="semantic-tag">Africa-headquartered</span> : null}</div>
      {record.description ? <p className="preview-description">{record.description}</p> : null}
      <section className="preview-section"><h3>Markets</h3><div className="organisation-preview-tags">{record.segments.length ? record.segments.map((value) => <Link href={`/organisations?segment=${encodeURIComponent(value)}`} key={value}>{value}</Link>) : <span>Not yet classified</span>}</div></section>
      <section className="preview-section"><h3>Location</h3><dl className="organisation-preview-facts"><div><dt>Headquarters</dt><dd>{record.headquartersCountry || "Not stated"}</dd></div><div><dt>Named African activity</dt><dd>{record.countriesActive.join(", ") || record.africanRegionsActive.join(", ") || "Not itemised"}</dd></div></dl></section>
      <div className="drawer-actions">{href ? <Link className="button button-primary" href={href}>Open profile</Link> : <Link className="button button-primary" href={`/organisations?q=${encodeURIComponent(record.name)}`}>Open listing</Link>}{record.website ? <a className="button button-outline" href={record.website} rel="noreferrer" target="_blank">Website ↗</a> : null}{record.sourceUrl ? <a className="button button-outline" href={record.sourceUrl} rel="noreferrer" target="_blank">Source ↗</a> : null}</div>
    </aside>
  </div>;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function marketTone(segments: string[]) {
  const value = segments.join(" ").toLowerCase();
  if (/mini-grid|shs|paygo|c&i/.test(value)) return "distributed";
  if (/utility|t&d/.test(value)) return "grid";
  if (/e-mobility|storage/.test(value)) return "mobility";
  if (/clean cooking|productive use|efficiency/.test(value)) return "use";
  if (/carbon/.test(value)) return "carbon";
  return "neutral";
}
