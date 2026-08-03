"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OrganisationMark } from "@/components/brand-mark";
import {
  organisationDirectory,
  organisationEcosystemGroupName,
  organisationEcosystemGroups,
  organisationRoles,
  organisationRoleName,
  organisationSegments,
  organisationSegmentName,
  organisationSectors,
  organisationSectorName,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import { africanCountries, organisations, products } from "@/lib/registry-data";
import { normaliseQuery } from "@/lib/registry-query";

type OrganisationView = "ecosystem" | "directory";

type OrganisationAtlasProps = {
  initialQuery?: string;
  initialGroup?: string;
  initialRole?: string;
  initialSector?: string;
  initialSegment?: string;
  initialCountry?: string;
  initialOrigin?: string;
  initialView?: string;
};

export function OrganisationAtlas({
  initialQuery = "",
  initialGroup = "all",
  initialRole = "all",
  initialSector = "all",
  initialSegment = "all",
  initialCountry = "all",
  initialOrigin = "all",
  initialView = "ecosystem",
}: OrganisationAtlasProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState(validId(initialGroup, organisationEcosystemGroups));
  const [role, setRole] = useState(validId(initialRole, organisationRoles));
  const [sector, setSector] = useState(validId(initialSector, organisationSectors));
  const [segment, setSegment] = useState(validId(initialSegment, organisationSegments));
  const [country, setCountry] = useState(
    africanCountries.some(([iso2]) => iso2 === initialCountry) ? initialCountry : "all",
  );
  const origins = Array.from(new Set(organisations.map((item) => item.origin))).sort();
  const [origin, setOrigin] = useState(origins.includes(initialOrigin) ? initialOrigin : "all");
  const [view, setView] = useState<OrganisationView>(
    initialView === "directory" ? "directory" : "ecosystem",
  );

  const withoutGroup = useMemo(
    () => filterRecords(organisationDirectory, { query, role, sector, segment, country, origin }),
    [country, origin, query, role, sector, segment],
  );
  const rows = useMemo(
    () => group === "all"
      ? withoutGroup
      : withoutGroup.filter((record) => record.ecosystemGroupIds.includes(group)),
    [group, withoutGroup],
  );
  const groupCounts = new Map(
    organisationEcosystemGroups.map((item) => [
      item.id,
      withoutGroup.filter((record) => record.ecosystemGroupIds.includes(item.id)).length,
    ]),
  );
  const segmentCounts = new Map(
    organisationSegments.map((item) => [
      item.id,
      organisationDirectory.filter((record) => record.segmentIds.includes(item.id)).length,
    ]),
  );

  function updateUrl(next: Partial<{
    q: string;
    group: string;
    role: string;
    sector: string;
    segment: string;
    country: string;
    origin: string;
    view: OrganisationView;
  }>) {
    const values = {
      q: next.q ?? query,
      group: next.group ?? group,
      role: next.role ?? role,
      sector: next.sector ?? sector,
      segment: next.segment ?? segment,
      country: next.country ?? country,
      origin: next.origin ?? origin,
      view: next.view ?? view,
    };
    const params = new URLSearchParams();
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.group !== "all") params.set("group", values.group);
    if (values.role !== "all") params.set("role", values.role);
    if (values.sector !== "all") params.set("sector", values.sector);
    if (values.segment !== "all") params.set("segment", values.segment);
    if (values.country !== "all") params.set("country", values.country);
    if (values.origin !== "all") params.set("origin", values.origin);
    if (values.view !== "ecosystem") params.set("view", values.view);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    setGroup("all");
    setRole("all");
    setSector("all");
    setSegment("all");
    setCountry("all");
    setOrigin("all");
    router.replace(view === "ecosystem" ? pathname : `${pathname}?view=${view}`, { scroll: false });
  }

  const activeFilters = [
    query.trim() ? { key: "q", label: `“${query.trim()}”` } : null,
    group !== "all" ? { key: "group", label: organisationEcosystemGroupName(group) } : null,
    role !== "all" ? { key: "role", label: organisationRoles.find((item) => item.id === role)?.name ?? role } : null,
    segment !== "all" ? { key: "segment", label: organisationSegmentName(segment) } : null,
    sector !== "all" ? { key: "sector", label: organisationSectorName(sector) } : null,
    country !== "all" ? { key: "country", label: africanCountries.find(([iso2]) => iso2 === country)?.[1] ?? country } : null,
    origin !== "all" ? { key: "origin", label: origin } : null,
  ].filter(Boolean) as Array<{
    key: "q" | "group" | "role" | "segment" | "sector" | "country" | "origin";
    label: string;
  }>;

  function removeFilter(key: (typeof activeFilters)[number]["key"]) {
    if (key === "q") { setQuery(""); updateUrl({ q: "" }); }
    if (key === "group") { setGroup("all"); updateUrl({ group: "all" }); }
    if (key === "role") { setRole("all"); updateUrl({ role: "all" }); }
    if (key === "segment") { setSegment("all"); updateUrl({ segment: "all" }); }
    if (key === "sector") { setSector("all"); updateUrl({ sector: "all" }); }
    if (key === "country") { setCountry("all"); updateUrl({ country: "all" }); }
    if (key === "origin") { setOrigin("all"); updateUrl({ origin: "all" }); }
  }

  function downloadExport() {
    const records = rows.map((record) => ({
      organisation: record.organisation.name,
      actor_types: record.ecosystemGroupIds.map(organisationEcosystemGroupName),
      specific_roles: record.roleIds.map(organisationRoleName),
      energy_markets: record.segmentIds.map(organisationSegmentName),
      broad_sectors: record.sectorIds.map(organisationSectorName),
      evidenced_countries: record.countryNames,
      origin: record.organisation.origin,
      country_of_origin: record.organisation.countryOfOrigin,
      headquarters: record.organisation.headquarters,
      linked_software: record.productCount,
      last_checked: record.organisation.lastChecked,
      website: record.organisation.website,
    }));
    const blob = new Blob([organisationCsv(records)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "africa-energy-organisations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const mapParams = new URLSearchParams({ object: "organisations" });
  if (country !== "all") mapParams.set("country", country);

  return (
    <main className="organisation-atlas" id="main-content" tabIndex={-1}>
      <header className="organisation-atlas-intro">
        <div>
          <h1>Organisations</h1>
          <p>Who does what across African energy.</p>
        </div>
        <Link href="/contribute/organisation">Add an organisation</Link>
      </header>

      <nav aria-label="Organisation views" className="organisation-view-tabs">
        <button
          aria-current={view === "ecosystem" ? "page" : undefined}
          onClick={() => { setView("ecosystem"); updateUrl({ view: "ecosystem" }); }}
          type="button"
        >Ecosystem</button>
        <button
          aria-current={view === "directory" ? "page" : undefined}
          onClick={() => { setView("directory"); updateUrl({ view: "directory" }); }}
          type="button"
        >Directory</button>
        <Link href={`/deployments?${mapParams.toString()}`}>Map</Link>
      </nav>

      <section className="organisation-atlas-stats" aria-label="Organisation totals">
        <div><strong>{organisations.length}</strong><span>organisations</span></div>
        <div><strong>{organisationEcosystemGroups.length}</strong><span>actor types</span></div>
        <div><strong>{organisationSegments.length}</strong><span>energy markets</span></div>
      </section>

      <section className="organisation-atlas-controls" aria-label="Filter organisations">
        <label>
          <span className="sr-only">Search organisations</span>
          <i aria-hidden="true">⌕</i>
          <input
            onChange={(event) => { setQuery(event.target.value); updateUrl({ q: event.target.value }); }}
            placeholder="Search organisations"
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Filter by actor type"
          onChange={(event) => { setGroup(event.target.value); updateUrl({ group: event.target.value }); }}
          value={group}
        >
          <option value="all">All actor types</option>
          {organisationEcosystemGroups.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by energy market"
          onChange={(event) => { setSegment(event.target.value); updateUrl({ segment: event.target.value }); }}
          value={segment}
        >
          <option value="all">All energy markets</option>
          {organisationSegments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}{segmentCounts.get(item.id) ? ` · ${segmentCounts.get(item.id)}` : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by evidenced country"
          onChange={(event) => { setCountry(event.target.value); updateUrl({ country: event.target.value }); }}
          value={country}
        >
          <option value="all">All evidenced countries</option>
          {africanCountries.map(([iso2, name]) => <option key={iso2} value={iso2}>{name}</option>)}
        </select>
        <details className="organisation-more-filters">
          <summary>More</summary>
          <div className="organisation-more-panel">
            <label>
              <span>Specific role</span>
              <select
                onChange={(event) => { setRole(event.target.value); updateUrl({ role: event.target.value }); }}
                value={role}
              >
                <option value="all">All specific roles</option>
                {organisationRoles.filter((item) => item.id !== "org_role_to_classify").map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Broad sector</span>
              <select
                onChange={(event) => { setSector(event.target.value); updateUrl({ sector: event.target.value }); }}
                value={sector}
              >
                <option value="all">All broad sectors</option>
                {organisationSectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span>Origin</span>
              <select
                onChange={(event) => { setOrigin(event.target.value); updateUrl({ origin: event.target.value }); }}
                value={origin}
              >
                <option value="all">All origins</option>
                {origins.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
        </details>
        <span aria-live="polite">{rows.length} shown</span>
        <button className="organisation-export" onClick={downloadExport} type="button">
          Export CSV <span aria-hidden="true">↓</span>
        </button>
      </section>

      {activeFilters.length ? (
        <div className="organisation-active-filters">
          <span>{activeFilters.length} active</span>
          {activeFilters.map((filter) => (
            <button key={filter.key} onClick={() => removeFilter(filter.key)} type="button">
              {filter.label}<i aria-hidden="true">×</i>
            </button>
          ))}
          {activeFilters.length > 1 ? <button className="clear" onClick={clearFilters} type="button">Clear all</button> : null}
        </div>
      ) : null}

      {view === "ecosystem" ? (
        <>
          <nav aria-label="Organisation actor types" className="organisation-group-route">
            {organisationEcosystemGroups.map((item) => (
              <button
                aria-pressed={group === item.id}
                key={item.id}
                onClick={() => {
                  const next = group === item.id ? "all" : item.id;
                  setGroup(next);
                  updateUrl({ group: next });
                }}
                type="button"
              >
                <strong>{item.name}</strong>
                <small>{groupCounts.get(item.id) ?? 0}</small>
              </button>
            ))}
          </nav>
          {rows.length ? (
            <div className="organisation-group-sections">
              {organisationEcosystemGroups
                .filter((item) => group === "all" ? groupCounts.get(item.id) : item.id === group)
                .map((item) => {
                  const groupRows = rows.filter((record) => record.ecosystemGroupIds.includes(item.id));
                  if (!groupRows.length) return null;
                  return (
                    <section className="organisation-group-section" key={item.id}>
                      <header>
                        <h2>{item.name}</h2>
                        <p>{item.description}</p>
                        <strong>{groupRows.length}</strong>
                      </header>
                      <OrganisationCardGrid rows={groupRows} />
                    </section>
                  );
                })}
            </div>
          ) : <EmptyState />}
        </>
      ) : rows.length ? (
        <OrganisationDirectoryTable rows={rows} />
      ) : <EmptyState />}

      <footer className="organisation-coverage-note">
        <span>Current release</span>
        <p>{products.length} reviewed software records. Add missing developers, EPCs, OEMs, financiers and operators.</p>
        <Link href="/contribute/organisation">Add an organisation →</Link>
      </footer>
    </main>
  );
}

function OrganisationCardGrid({ rows }: { rows: OrganisationDirectoryRecord[] }) {
  return (
    <div className="organisation-atlas-grid">
      {rows.map((record) => {
        const tags = record.segmentIds.length
          ? record.segmentIds.map((id) => ({ id, label: organisationSegmentName(id), key: "segment" }))
          : record.sectorIds.map((id) => ({ id, label: organisationSectorName(id), key: "sector" }));
        return (
          <article key={record.organisation.id}>
            <OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={64} />
            <div>
              <h3><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link></h3>
              <p>{record.primaryRole.name}</p>
              <div className="organisation-sector-tags">
                {tags.slice(0, 2).map((tag) => (
                  <Link href={`/organisations?${tag.key}=${tag.id}`} key={tag.id}>{tag.label}</Link>
                ))}
                {tags.length > 2 ? <span>+{tags.length - 2}</span> : null}
              </div>
            </div>
            <dl>
              <div><dt>Software</dt><dd>{record.productCount || "—"}</dd></div>
              <div><dt>Countries</dt><dd>{record.countryCount || "—"}</dd></div>
            </dl>
            <Link aria-label={`Open ${record.organisation.name}`} href={`/organisations/${record.organisation.slug}`}>→</Link>
          </article>
        );
      })}
    </div>
  );
}

function OrganisationDirectoryTable({ rows }: { rows: OrganisationDirectoryRecord[] }) {
  return (
    <section className="organisation-directory-table" aria-label="Organisation directory">
      <div className="organisation-directory-head" aria-hidden="true">
        <span>Organisation</span><span>Actor type</span><span>Markets</span><span>Presence</span><span>Software</span>
      </div>
      {rows.map((record) => (
        <article key={record.organisation.id}>
          <div className="organisation-directory-name">
            <OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={44} />
            <span><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link><small>{record.organisation.countryOfOrigin}</small></span>
          </div>
          <span><Link href={`/organisations?group=${record.ecosystemGroupIds[0]}`}>{organisationEcosystemGroupName(record.ecosystemGroupIds[0])}</Link><small>{record.primaryRole.name}</small></span>
          <div className="organisation-directory-sectors">
            {record.segmentIds.length ? record.segmentIds.slice(0, 2).map((segmentId) => (
              <Link href={`/organisations?segment=${segmentId}`} key={segmentId}>{organisationSegmentName(segmentId)}</Link>
            )) : record.sectorIds.length ? record.sectorIds.slice(0, 2).map((sectorId) => (
              <Link href={`/organisations?sector=${sectorId}`} key={sectorId}>{organisationSectorName(sectorId)}</Link>
            )) : <span>Not yet classified</span>}
          </div>
          <span>{record.countryCount ? `${record.countryCount} countries` : "Not yet evidenced"}</span>
          <span>{record.productCount ? `${record.productCount} linked` : "Not reviewed"}</span>
        </article>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="landscape-empty">
      <strong>No organisations listed here yet.</strong>
      <Link href="/contribute/organisation">Add one →</Link>
    </section>
  );
}

function validId(value: string, options: Array<{ id: string }>) {
  return options.some((item) => item.id === value) ? value : "all";
}

function filterRecords(
  records: OrganisationDirectoryRecord[],
  filters: { query: string; role: string; sector: string; segment: string; country: string; origin: string },
) {
  const term = normaliseQuery(filters.query);
  return records.filter((record) => {
    if (filters.role !== "all" && !record.roleIds.includes(filters.role)) return false;
    if (filters.sector !== "all" && !record.sectorIds.includes(filters.sector)) return false;
    if (filters.segment !== "all" && !record.segmentIds.includes(filters.segment)) return false;
    if (filters.country !== "all" && !record.countryIso2s.includes(filters.country)) return false;
    if (filters.origin !== "all" && record.organisation.origin !== filters.origin) return false;
    if (!term) return true;
    return normaliseQuery([
      record.organisation.name,
      record.organisation.description,
      record.organisation.countryOfOrigin,
      record.organisation.headquarters,
      record.primaryRole.name,
      ...record.aliases,
      ...record.ecosystemGroupIds.map(organisationEcosystemGroupName),
      ...record.sectorIds.map(organisationSectorName),
      ...record.segmentIds.map(organisationSegmentName),
      ...record.countryNames,
    ].join(" ")).includes(term);
  });
}

function organisationCsv(rows: Array<Record<string, string | string[] | number>>) {
  const headers = [
    "organisation",
    "actor_types",
    "specific_roles",
    "energy_markets",
    "broad_sectors",
    "evidenced_countries",
    "origin",
    "country_of_origin",
    "headquarters",
    "linked_software",
    "last_checked",
    "website",
  ];
  const escape = (value: string | string[] | number) => {
    const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
