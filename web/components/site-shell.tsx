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
  { href: "/", label: "Stack" },
  { href: "/deployments", label: "Deployments" },
  { href: "/directory", label: "Directory" },
  { href: "/methodology", label: "Methodology" },
] as const;

const secondaryNavigation = [
  { href: "/data", label: "Data" },
  { href: "/changes", label: "Changes" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/privacy", label: "Privacy" },
  { href: "/licence", label: "Licence" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
          context: `${product.organisation} · ${product.category}`,
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
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" href="/" aria-label="Africa Energy Software Map home">
            <span aria-hidden="true" className="wordmark-mark">
              AE
            </span>
            <span className="wordmark-long">Africa Energy Software Map</span>
            <span className="wordmark-short">Energy software map</span>
          </Link>
          <nav aria-label="Primary navigation" className="desktop-nav">
            {primaryNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={active ? "nav-link active" : "nav-link"}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="header-actions">
            <button
              aria-expanded={searchOpen}
              className="header-text-button"
              onClick={() => setSearchOpen(true)}
              ref={searchButtonRef}
              type="button"
            >
              <span aria-hidden="true">⌕</span> Search
            </button>
            <Link className="button button-outline header-contribute" href="/contribute">
              Contribute
            </Link>
            <button
              aria-controls="mobile-menu"
              aria-expanded={menuOpen}
              className="header-text-button mobile-menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              ref={menuButtonRef}
              type="button"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="mobile-menu-backdrop" onMouseDown={() => setMenuOpen(false)}>
          <nav
            aria-label="Mobile navigation"
            className="mobile-menu-sheet"
            id="mobile-menu"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-header">
              <strong>Explore</strong>
              <button className="icon-button" onClick={() => setMenuOpen(false)} type="button">
                Close
              </button>
            </div>
            {[...primaryNavigation, ...secondaryNavigation].map((item) => (
              <Link href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link className="button button-primary" href="/contribute">
              Contribute
            </Link>
          </nav>
        </div>
      ) : null}

      {searchOpen ? (
        <div
          className="search-backdrop"
          onMouseDown={() => {
            setSearchOpen(false);
            searchButtonRef.current?.focus();
          }}
        >
          <section
            aria-label="Search the software map"
            aria-modal="true"
            className="search-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="search-input-row">
              <span aria-hidden="true">⌕</span>
              <label className="sr-only" htmlFor="global-search">
                Search products, organisations, capabilities or countries
              </label>
              <input
                id="global-search"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search products, organisations, capabilities or countries"
                ref={searchInputRef}
                type="search"
                value={query}
              />
              <button
                className="quiet-button"
                onClick={() => setSearchOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div aria-live="polite" className="search-results">
              {query.trim().length < 2 ? (
                <p className="search-guidance">
                  Type at least two characters. Try “metering”, “Nigeria” or “PAYGo”.
                </p>
              ) : searchResults.length ? (
                <>
                  <p className="result-count">{searchResults.length} suggested results</p>
                  {searchResults.map((result) => (
                  <Link
                    className="search-result"
                    href={result.href}
                    key={`${result.type}-${result.name}`}
                    onClick={() => setSearchOpen(false)}
                  >
                      <span className="result-type">{result.type}</span>
                      <strong>{result.name}</strong>
                      <span>{result.context}</span>
                    </Link>
                  ))}
                  <Link
                    className="search-all-link"
                    href={`/search?q=${encodeURIComponent(query.trim())}`}
                    onClick={() => setSearchOpen(false)}
                  >
                    See all results for “{query.trim()}” →
                  </Link>
                </>
              ) : (
                <div className="empty-search">
                  <strong>No published record matched “{query.trim()}”.</strong>
                  <p>
                    The map is incomplete. Try a broader capability or submit a product
                    for editorial review.
                  </p>
                  <Link href="/contribute/product">Submit product →</Link>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <div className="candidate-banner" role="note">
        <div>
          <strong>Prototype data</strong>
          <span>{release.status}. No record shown here is published by this prototype.</span>
        </div>
        <Link href="/methodology#prototype-data">How candidate data is handled</Link>
      </div>

      {children}

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <strong>Africa Energy Software Map</strong>
            <p>
              An open, evidence-led record of the software used across African
              energy systems.
            </p>
            <span className="mono">
              {release.version} · {release.date}
            </span>
          </div>
          <FooterGroup
            heading="Explore"
            links={[
              ["/", "Stack"],
              ["/deployments", "Deployments"],
              ["/directory", "Directory"],
            ]}
          />
          <FooterGroup
            heading="Project"
            links={[
              ["/methodology", "Methodology"],
              ["/changes", "Changes"],
              ["https://github.com/kaykluz/africa-energy-software-map", "GitHub"],
            ]}
          />
          <FooterGroup
            heading="Contribute"
            links={[
              ["/contribute/product", "Submit product"],
              ["/contribute/deployment", "Add deployment"],
              ["/contribute/correction", "Correct a record"],
            ]}
          />
          <FooterGroup
            heading="Access"
            links={[
              ["/data", "Data"],
              ["/licence", "Licence"],
              ["/privacy", "Privacy"],
              ["/accessibility", "Accessibility"],
            ]}
          />
        </div>
      </footer>
    </>
  );
}

function FooterGroup({
  heading,
  links,
}: {
  heading: string;
  links: readonly (readonly [string, string])[];
}) {
  return (
    <nav aria-label={`${heading} links`} className="footer-links">
      <strong>{heading}</strong>
      {links.map(([href, label]) => (
        <Link href={href} key={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
