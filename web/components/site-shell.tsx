"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  africanCountries,
  categories,
  products,
  release,
} from "@/lib/registry-data";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const primaryNavigation = [
  { href: "/", label: "Explore" },
  { href: "/deployments", label: "Map" },
  { href: "/directory", label: "Data" },
] as const;

const projectNavigation = [
  { href: "/methodology", label: "Method" },
  { href: "/data", label: "Downloads" },
  { href: "/changes", label: "Changes" },
  { href: "/accessibility", label: "Accessibility" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

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

  const searchResults = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    if (normalised.length < 2) return [];
    const aliases = normalised
      .replaceAll("pay-as-you-go", "paygo")
      .replaceAll("commercial and industrial", "c&i")
      .replaceAll("advanced metering", "ami");
    return [
      ...products
        .filter((product) =>
          [
            product.name,
            product.organisation,
            product.description,
            product.category,
            ...product.capabilities,
          ]
            .join(" ")
            .toLowerCase()
            .includes(aliases),
        )
        .map((product) => ({
          type: "Product",
          name: product.name,
          context: product.organisation,
          href: `/products/${product.slug}`,
        })),
      ...categories
        .filter((category) =>
          category.name.toLowerCase().includes(aliases),
        )
        .map((category) => ({
          type: "Capability",
          name: category.name,
          context: "Value-chain category",
          href: `/?category=${category.id}`,
        })),
      ...africanCountries
        .filter(([, name]) => name.toLowerCase().includes(aliases))
        .slice(0, 4)
        .map(([iso2, name]) => ({
          type: "Country",
          name,
          context: iso2,
          href: `/countries/${iso2.toLowerCase()}`,
        })),
    ].slice(0, 8);
  }, [query]);

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
              aria-label={`Prototype data: ${release.status}`}
              className="v2-status-button"
              onClick={() => setStatusOpen((value) => !value)}
              type="button"
            >
              <i aria-hidden="true" />
              <span>Prototype</span>
              <span className="sr-only">
                Candidate import. Editorial review required.
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
          <section className="v2-status-popover" aria-label="Prototype status">
            <span className="v2-popover-index">P–01</span>
            <div>
              <strong>Candidate data</strong>
              <p>No record is published until editorial review is complete.</p>
            </div>
            <Link href="/methodology#prototype-data">Method →</Link>
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
                    <Link
                      className="v2-search-result"
                      href={result.href}
                      key={`${result.type}-${result.name}`}
                      onClick={() => setSearchOpen(false)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{result.name}</strong>
                      <small>{result.type} · {result.context}</small>
                      <i aria-hidden="true">↗</i>
                    </Link>
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
