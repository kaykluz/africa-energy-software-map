"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OrganisationMark } from "@/components/brand-mark";
import {
  organisationDirectory,
  organisationRoles,
  organisationSegments,
  organisationSegmentName,
  organisationSectors,
  organisationSectorName,
  organisationValueChain,
  type OrganisationDirectoryRecord,
} from "@/lib/organisation-data";
import { africanCountries, organisations, products } from "@/lib/registry-data";
import { normaliseQuery } from "@/lib/registry-query";

type OrganisationView = "chain" | "directory";

type OrganisationAtlasProps = {
  initialQuery?: string;
  initialRole?: string;
  initialSector?: string;
  initialSegment?: string;
  initialChain?: string;
  initialCountry?: string;
  initialOrigin?: string;
  initialView?: string;
};

export function OrganisationAtlas({
  initialQuery = "",
  initialRole = "all",
  initialSector = "all",
  initialSegment = "all",
  initialChain = "all",
  initialCountry = "all",
  initialOrigin = "all",
  initialView = "chain",
}: OrganisationAtlasProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [role, setRole] = useState(validId(initialRole, organisationRoles));
  const [sector, setSector] = useState(validId(initialSector, organisationSectors));
  const [segment, setSegment] = useState(validId(initialSegment, organisationSegments));
  const [chain, setChain] = useState(validId(initialChain, organisationValueChain));
  const [country, setCountry] = useState(
    africanCountries.some(([iso2]) => iso2 === initialCountry) ? initialCountry : "all",
  );
  const origins = Array.from(new Set(organisations.map((item) => item.origin))).sort();
  const [origin, setOrigin] = useState(origins.includes(initialOrigin) ? initialOrigin : "all");
  const [view, setView] = useState<OrganisationView>(
    initialView === "directory" ? "directory" : "chain",
  );

  const withoutChain = useMemo(
    () => filterRecords(organisationDirectory, { query, role, sector, segment, country, origin }),
    [country, origin, query, role, sector, segment],
  );
  const rows = useMemo(
    () => chain === "all"
      ? withoutChain
      : withoutChain.filter((record) => record.valueChainIds.includes(chain)),
    [chain, withoutChain],
  );
  const chainCounts = new Map(
    organisationValueChain.map((item) => [
      item.id,
      withoutChain.filter((record) => record.valueChainIds.includes(item.id)).length,
    ]),
  );
  const coveredSectors = new Set(organisationDirectory.flatMap((record) => record.sectorIds)).size;
  const coveredCountries = new Set(organisationDirectory.flatMap((record) => record.countryIso2s)).size;

  function updateUrl(next: Partial<{
    q: string;
    role: string;
    sector: string;
    segment: string;
    chain: string;
    country: string;
    origin: string;
    view: OrganisationView;
  }>) {
    const values = {
      q: next.q ?? query,
      role: next.role ?? role,
      sector: next.sector ?? sector,
      segment: next.segment ?? segment,
      chain: next.chain ?? chain,
      country: next.country ?? country,
      origin: next.origin ?? origin,
      view: next.view ?? view,
    };
    const params = new URLSearchParams();
    if (values.q.trim()) params.set("q", values.q.trim());
    if (values.role !== "all") params.set("role", values.role);
    if (values.sector !== "all") params.set("sector", values.sector);
    if (values.segment !== "all") params.set("segment", values.segment);
    if (values.chain !== "all") params.set("chain", values.chain);
    if (values.country !== "all") params.set("country", values.country);
    if (values.origin !== "all") params.set("origin", values.origin);
    if (values.view !== "chain") params.set("view", values.view);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  function clearFilters() {
    setQuery("");
    setRole("all");
    setSector("all");
    setSegment("all");
    setChain("all");
    setCountry("all");
    setOrigin("all");
    router.replace(view === "chain" ? pathname : `${pathname}?view=${view}`, { scroll: false });
  }

  const activeFilters = [
    query.trim() ? { key: "q", label: `“${query.trim()}”` } : null,
    role !== "all" ? { key: "role", label: organisationRoles.find((item) => item.id === role)?.name ?? role } : null,
    sector !== "all" ? { key: "sector", label: organisationSectorName(sector) } : null,
    segment !== "all" ? { key: "segment", label: organisationSegmentName(segment) } : null,
    chain !== "all" ? { key: "chain", label: organisationValueChain.find((item) => item.id === chain)?.name ?? chain } : null,
    country !== "all" ? { key: "country", label: africanCountries.find(([iso2]) => iso2 === country)?.[1] ?? country } : null,
    origin !== "all" ? { key: "origin", label: origin } : null,
  ].filter(Boolean) as Array<{
    key: "q" | "role" | "sector" | "segment" | "chain" | "country" | "origin";
    label: string;
  }>;

  function removeFilter(key: (typeof activeFilters)[number]["key"]) {
    if (key === "q") { setQuery(""); updateUrl({ q: "" }); }
    if (key === "role") { setRole("all"); updateUrl({ role: "all" }); }
    if (key === "sector") { setSector("all"); updateUrl({ sector: "all" }); }
    if (key === "segment") { setSegment("all"); updateUrl({ segment: "all" }); }
    if (key === "chain") { setChain("all"); updateUrl({ chain: "all" }); }
    if (key === "country") { setCountry("all"); updateUrl({ country: "all" }); }
    if (key === "origin") { setOrigin("all"); updateUrl({ origin: "all" }); }
  }
  const mapParams = new URLSearchParams({ object: "organisations" });
  if (country !== "all") mapParams.set("country", country);

  return (
    <main className="organisation-atlas" id="main-content" tabIndex={-1}>
      <header className="organisation-atlas-intro">
        <div>
          <h1>Organisations</h1>
          <p>Who shapes, funds, builds and runs African energy.</p>
        </div>
        <Link href="/contribute">Add an organisation</Link>
      </header>

      <nav aria-label="Organisation views" className="organisation-view-tabs">
        <button
          aria-current={view === "chain" ? "page" : undefined}
          onClick={() => { setView("chain"); updateUrl({ view: "chain" }); }}
          type="button"
        >Value chain</button>
        <button
          aria-current={view === "directory" ? "page" : undefined}
          onClick={() => { setView("directory"); updateUrl({ view: "directory" }); }}
          type="button"
        >Directory</button>
        <Link href={`/deployments?${mapParams.toString()}`}>Map</Link>
      </nav>

      <section className="organisation-atlas-stats" aria-label="Organisation totals">
        <div><strong>{organisations.length}</strong><span>organisations</span></div>
        <div><strong>{coveredSectors}</strong><span>sectors represented</span></div>
        <div><strong>{coveredCountries}</strong><span>countries evidenced</span></div>
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
          aria-label="Filter by role"
          onChange={(event) => { setRole(event.target.value); updateUrl({ role: event.target.value }); }}
          value={role}
        >
          <option value="all">All roles</option>
          {organisationRoles.filter((item) => item.id !== "org_role_to_classify").map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by sector"
          onChange={(event) => { setSector(event.target.value); updateUrl({ sector: event.target.value }); }}
          value={sector}
        >
          <option value="all">All sectors</option>
          {organisationSectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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
              <span>Market segment</span>
              <select
                onChange={(event) => { setSegment(event.target.value); updateUrl({ segment: event.target.value }); }}
                value={segment}
              >
                <option value="all">All market segments</option>
                {organisationSegments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
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

      {view === "chain" ? (
        <>
          <nav aria-label="Organisation value chain" className="organisation-chain-route">
            {organisationValueChain.map((item, index) => (
              <button
                aria-pressed={chain === item.id}
                key={item.id}
                onClick={() => {
                  const next = chain === item.id ? "all" : item.id;
                  setChain(next);
                  updateUrl({ chain: next });
                }}
                type="button"
              >
                <i>{String(index + 1).padStart(2, "0")}</i>
                <strong>{item.name}</strong>
                <small>{chainCounts.get(item.id) ?? 0}</small>
              </button>
            ))}
          </nav>
          {rows.length ? (
            <div className="organisation-chain-groups">
              {organisationValueChain
                .filter((item) => chain === "all" ? chainCounts.get(item.id) : item.id === chain)
                .map((item) => {
                  const groupRows = rows.filter((record) => record.valueChainIds.includes(item.id));
                  if (!groupRows.length) return null;
                  return (
                    <section className="organisation-chain-group" key={item.id}>
                      <header>
                        <div><span>{String(item.order).padStart(2, "0")}</span><h2>{item.name}</h2></div>
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
        <p>{products.length} reviewed software records. Organisation roles and sectors expand through sourced contributions.</p>
        <Link href="/contribute">Add what is missing →</Link>
      </footer>
    </main>
  );
}

function OrganisationCardGrid({ rows }: { rows: OrganisationDirectoryRecord[] }) {
  return (
    <div className="organisation-atlas-grid">
      {rows.map((record) => (
        <article key={record.organisation.id}>
          <OrganisationMark
            name={record.organisation.name}
            organisationId={record.organisation.id}
            size={64}
          />
          <div>
            <h3><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link></h3>
            <p>{record.primaryRole.name}</p>
            <div className="organisation-sector-tags">
              {record.sectorIds.slice(0, 2).map((sectorId) => (
                <Link href={`/organisations?sector=${sectorId}`} key={sectorId}>
                  {organisationSectorName(sectorId)}
                </Link>
              ))}
              {record.sectorIds.length > 2 ? <span>+{record.sectorIds.length - 2}</span> : null}
            </div>
          </div>
          <dl>
            <div><dt>Software</dt><dd>{record.productCount}</dd></div>
            <div><dt>Countries</dt><dd>{record.countryCount || "—"}</dd></div>
          </dl>
          <Link aria-label={`Open ${record.organisation.name}`} href={`/organisations/${record.organisation.slug}`}>→</Link>
        </article>
      ))}
    </div>
  );
}

function OrganisationDirectoryTable({ rows }: { rows: OrganisationDirectoryRecord[] }) {
  return (
    <section className="organisation-directory-table" aria-label="Organisation directory">
      <div className="organisation-directory-head" aria-hidden="true">
        <span>Organisation</span><span>Role</span><span>Sectors</span><span>Presence</span><span>Software</span>
      </div>
      {rows.map((record) => (
        <article key={record.organisation.id}>
          <div className="organisation-directory-name">
            <OrganisationMark name={record.organisation.name} organisationId={record.organisation.id} size={44} />
            <span><Link href={`/organisations/${record.organisation.slug}`}>{record.organisation.name}</Link><small>{record.organisation.countryOfOrigin}</small></span>
          </div>
          <Link href={`/organisations?role=${record.primaryRole.id}`}>{record.primaryRole.name}</Link>
          <div className="organisation-directory-sectors">
            {record.sectorIds.length ? record.sectorIds.slice(0, 2).map((sectorId) => (
              <Link href={`/organisations?sector=${sectorId}`} key={sectorId}>{organisationSectorName(sectorId)}</Link>
            )) : <span>Not yet classified</span>}
          </div>
          <span>{record.countryCount ? `${record.countryCount} countries` : "Not yet evidenced"}</span>
          <span>{record.productCount} linked</span>
        </article>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="landscape-empty">
      <strong>No organisations match.</strong>
      <Link href="/contribute">Suggest one →</Link>
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
      ...record.sectorIds.map(organisationSectorName),
      ...record.segmentIds.map(organisationSegmentName),
      ...record.countryNames,
    ].join(" ")).includes(term);
  });
}
