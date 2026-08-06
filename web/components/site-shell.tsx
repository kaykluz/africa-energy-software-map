"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  africanCountries,
  categories,
  products,
  release,
} from "@/lib/registry-data";
import { landscapeItems } from "@/lib/landscape-data";
import {
  resolveLandscapeItemHref,
  resolveOrganisationHref,
  organisationLinkIndex,
} from "@/lib/entity-links";
import { organisationDirectory } from "@/lib/organisation-data";
import type {
  OrganisationCataloguePage,
  OrganisationCatalogueRecord,
} from "@/lib/organisation-catalogue";
import { normaliseQuery } from "@/lib/registry-query";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const primaryNavigation = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/deployments", label: "Map" },
  { href: "/directory", label: "Directory" },
  { href: "/landscape", label: "Wall" },
] as const;

const projectNavigation = [
  { href: "/review", label: "Admin" },
  { href: "/directory", label: "Reviewed software" },
  { href: "/data", label: "Downloads" },
  { href: "/changes", label: "Changes" },
  { href: "/accessibility", label: "Accessibility" },
] as const;

type SearchResult = {
  type: string;
  name: string;
  context: string;
  href: string;
  contextHref?: string;
};

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [reviewedCatalogueMatches, setReviewedCatalogueMatches] = useState<OrganisationCatalogueRecord[]>([]);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const canonicalOrganisationLinks = useMemo(
    () => organisationLinkIndex(organisationDirectory),
    [],
  );
  const canonicalOrganisationsById = useMemo(
    () => new Map(organisationDirectory.map((record) => [record.organisation.id, record])),
    [],
  );

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/organisation-catalogue?q=${encodeURIComponent(term)}&scope=reviewed&pageSize=8`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return { records: [] } as Pick<OrganisationCataloguePage, "records">;
          return await response.json() as OrganisationCataloguePage;
        })
        .then((payload) => setReviewedCatalogueMatches(payload.records))
        .catch(() => {
          if (!controller.signal.aborted) setReviewedCatalogueMatches([]);
        });
    }, 140);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (searchOpen) {
        setSearchOpen(false);
        searchButtonRef.current?.focus();
      }
      if (menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      setStatusOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen, searchOpen]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const normalised = normaliseQuery(query);
    if (normalised.length < 2) return [];
    const aliases = normalised;
    const candidates = [
      ...products
        .filter((product) =>
          normaliseQuery(
            [
              product.name,
              product.organisation,
              product.description,
              product.category,
              ...product.capabilities,
            ].join(" "),
          ).includes(aliases),
        )
        .map((product) => {
          const organisation = canonicalOrganisationsById.get(product.organisationId)?.organisation;
          return {
            type: "Product",
            name: product.name,
            context: product.organisation,
            href: `/products/${product.slug}`,
            contextHref: organisation ? `/organisations/${organisation.slug}` : undefined,
          };
        }),
      ...organisationDirectory
        .filter((record) =>
          normaliseQuery(
            [
              record.organisation.name,
              record.organisation.type,
              record.organisation.description,
              record.organisation.countryOfOrigin,
              record.organisation.headquarters,
              ...record.aliases,
            ].join(" "),
          ).includes(aliases),
        )
        .map((record) => ({
          type: "Organisation",
          name: record.organisation.name,
          context: record.primaryRole.name,
          href: `/organisations/${record.organisation.slug}`,
        })),
      ...reviewedCatalogueMatches
        .filter((record) => normaliseQuery([
          record.name,
          ...record.aliases,
          record.primaryRole,
          record.organisationType,
          record.headquartersCountry,
        ].join(" ")).includes(aliases))
        .flatMap((record) => {
          const href = record.reconciliation.status === "reviewed_match"
            ? record.reconciliation.canonicalHref
            : "";
          return href ? [{
            type: "Organisation",
            name: record.name,
            context: record.primaryRole || record.organisationType || "Reviewed organisation",
            href,
          }] : [];
        }),
      ...categories
        .filter((category) =>
          normaliseQuery(category.name).includes(aliases),
        )
        .map((category) => ({
          type: "Capability",
          name: category.name,
          context: "Value-chain category",
          href: `/?category=${category.id}`,
        })),
      ...africanCountries
        .filter(([, name]) => normaliseQuery(name).includes(aliases))
        .slice(0, 4)
        .map(([iso2, name]) => ({
          type: "Country",
          name,
          context: iso2,
          href: `/countries/${iso2.toLowerCase()}`,
        })),
      ...landscapeItems
        .filter((item) =>
          normaliseQuery(
            [
              item.name,
              item.parent ?? "",
              ...(item.aliases ?? []),
              item.summaryAsSubmitted,
              ...item.geographies,
            ].join(" "),
          ).includes(aliases),
        )
        .slice(0, 4)
        .map((item) => {
          const parentHref = item.parent
            ? resolveOrganisationHref(item.parent, canonicalOrganisationLinks)
            : undefined;
          return {
            type: "Listing",
            name: item.name,
            context: item.parent || "Full list",
            href: resolveLandscapeItemHref(item, canonicalOrganisationLinks) ?? `/landscape?q=${encodeURIComponent(item.name)}`,
            contextHref: parentHref,
          };
        }),
    ];
    const seen = new Set<string>();
    return candidates.filter((result) => {
      if (seen.has(result.href)) return false;
      seen.add(result.href);
      return true;
    }).slice(0, 10);
  }, [canonicalOrganisationLinks, canonicalOrganisationsById, query, reviewedCatalogueMatches]);

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && query.trim().length >= 2) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="v2-header">
        <div className="v2-header-inner">
          <Link
            className="v2-wordmark"
            href="/"
            aria-label="Africa Energy Software Map home"
          >
            <span className="v2-wordmark-disc" aria-hidden="true">
              A
            </span>
            <span>
              Africa Energy
              <br />
              Software Map
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="v2-nav">
            {primaryNavigation.map((item, index) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/explore"
                    ? pathname.startsWith("/explore") || pathname.startsWith("/products") || pathname.startsWith("/organisations")
                  : item.href === "/deployments"
                    ? pathname.startsWith("/deployments") || pathname.startsWith("/countries")
                    : item.href === "/directory"
                      ? pathname.startsWith("/directory")
                      : pathname.startsWith(item.href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "active" : ""}
                  href={item.href}
                  key={item.href}
                >
                  <span aria-hidden="true">0{index + 1}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="v2-header-actions">
            <button
              aria-expanded={statusOpen}
              aria-label={`Data status: ${release.status}`}
              className="v2-status-button"
              onClick={() => setStatusOpen((value) => !value)}
              type="button"
            >
              <i aria-hidden="true" />
              <span>
                {release.mode === "published" ? release.version : "Prototype"}
              </span>
              <span className="sr-only">
                {release.mode === "published"
                  ? "Reviewed data release."
                  : "Candidate import. Editorial review required."}
              </span>
            </button>
            <button
              aria-expanded={searchOpen}
              aria-label="Search the map"
              className="v2-round-action"
              onClick={() => setSearchOpen(true)}
              ref={searchButtonRef}
              type="button"
            >
              <span aria-hidden="true">⌕</span>
            </button>
            <Link
              className="v2-contribute"
              href="/contribute"
            >
              <span>Improve the map</span>
              <i aria-hidden="true">＋</i>
            </Link>
            <button
              aria-controls="v2-mobile-menu"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="v2-round-action v2-menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              ref={menuButtonRef}
              type="button"
            >
              <span aria-hidden="true">••</span>
            </button>
          </div>
        </div>

        {statusOpen ? (
          <section className="v2-status-popover" aria-label="Data status">
            <span className="v2-popover-index">
              {release.mode === "published" ? "R–01" : "P–01"}
            </span>
            <div>
              <strong>
                {release.mode === "published"
                  ? "Reviewed release"
                  : "Candidate data"}
              </strong>
              <p>
                {release.mode === "published"
                  ? `${release.version} · ${release.date}`
                  : "No record is published until editorial review is complete."}
              </p>
            </div>
            <Link href={release.mode === "published" ? "/data" : "/review"}>
              {release.mode === "published" ? "Open data →" : "Review data →"}
            </Link>
          </section>
        ) : null}
      </header>

      {menuOpen ? (
        <div
          className="v2-overlay"
          onMouseDown={() => setMenuOpen(false)}
        >
          <nav
            aria-label="Menu"
            className="v2-menu-sheet"
            id="v2-mobile-menu"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="v2-sheet-top">
              <span>Navigate</span>
              <button onClick={() => setMenuOpen(false)} type="button">
                Close
              </button>
            </div>
            <div className="v2-menu-primary">
              {primaryNavigation.map((item, index) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>0{index + 1}</span>
                  {item.label}
                  <i aria-hidden="true">↗</i>
                </Link>
              ))}
            </div>
            <div className="v2-menu-secondary">
              {projectNavigation.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/contribute">Contribute data</Link>
            </div>
          </nav>
        </div>
      ) : null}

      {searchOpen ? (
        <div
          className="v2-search-overlay"
          onMouseDown={() => {
            setSearchOpen(false);
            searchButtonRef.current?.focus();
          }}
        >
          <section
            aria-label="Search the software map"
            aria-modal="true"
            className="v2-search-stage"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="v2-search-topline">
              <span>Search</span>
              <button
                onClick={() => setSearchOpen(false)}
                type="button"
              >
                Esc&nbsp;&nbsp;Close
              </button>
            </div>
            <label className="sr-only" htmlFor="global-search">
              Search products, organisations, capabilities or countries
            </label>
            <div className="v2-search-input">
              <span aria-hidden="true">⌕</span>
              <input
                id="global-search"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Product, organisation, capability or country"
                ref={searchInputRef}
                type="search"
                value={query}
              />
            </div>

            <div aria-live="polite" className="v2-search-results">
              {query.trim().length < 2 ? (
                <div className="v2-search-starters">
                  <span>Try</span>
                  {["Nigeria", "Metering", "PAYGo", "Grid operations"].map(
                    (term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        type="button"
                      >
                        {term}
                      </button>
                    ),
                  )}
                </div>
              ) : searchResults.length ? (
                <>
                  {searchResults.map((result, index) => (
                    <article className="v2-search-result" key={`${result.type}-${result.name}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <Link href={result.href} onClick={() => setSearchOpen(false)}><strong>{result.name}</strong></Link>
                      <small>{result.type} · {result.contextHref ? <Link href={result.contextHref} onClick={() => setSearchOpen(false)}>{result.context}</Link> : result.context}</small>
                      <Link aria-label={`Open ${result.name}`} href={result.href} onClick={() => setSearchOpen(false)}><i aria-hidden="true">↗</i></Link>
                    </article>
                  ))}
                  <Link
                    className="v2-search-all"
                    href={`/search?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setSearchOpen(false)}
                  >
                    View all results <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <div className="v2-search-empty">
                  <strong>No matching record</strong>
                  <Link href="/contribute/product">Submit a product →</Link>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {children}

      <footer className="v2-footer">
        <div>
          <Link className="v2-footer-mark" href="/">
            Africa Energy Software Map
          </Link>
          <span className="mono">{release.version}</span>
        </div>
        <nav aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/deployments">Map</Link>
          <Link href="/directory">Data</Link>
          <Link href="/landscape">Wall</Link>
          <Link href="/organisations">Organisations</Link>
          <Link href="/methodology">Method</Link>
          <Link href="/data">Downloads</Link>
          <Link href="/licence">Licence</Link>
          <a href="https://github.com/kaykluz/africa-energy-software-map">
            GitHub
          </a>
        </nav>
        <Link className="v2-footer-contribute" href="/contribute">
          Improve the map <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </>
  );
}
