"use client";

import Link from "next/link";
import { useState } from "react";
import { OrganisationMark } from "@/components/brand-mark";
import { africanCountries, deployments, organisations, products } from "@/lib/registry-data";
import { normaliseQuery } from "@/lib/registry-query";

export function OrganisationAtlas({ initialCountry = "all" }: { initialCountry?: string }) {
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("all");
  const [country, setCountry] = useState(
    africanCountries.some(([iso2]) => iso2 === initialCountry) ? initialCountry : "all",
  );
  const origins = Array.from(new Set(organisations.map((item) => item.origin))).sort();
  const rows = (() => {
    const term = normaliseQuery(query);
    return organisations
      .filter((organisation) => {
        if (origin !== "all" && organisation.origin !== origin) return false;
        if (country !== "all") {
          const ownedProductIds = new Set(
            products
              .filter((product) => product.organisationId === organisation.id)
              .map((product) => product.id),
          );
          if (!deployments.some(
            (deployment) => ownedProductIds.has(deployment.productId) && deployment.countryIso2 === country,
          )) return false;
        }
        return !term || normaliseQuery([
          organisation.name,
          organisation.description,
          organisation.countryOfOrigin,
          organisation.headquarters,
        ].join(" ")).includes(term);
      })
      .map((organisation) => {
        const ownedProducts = products.filter((product) => product.organisationId === organisation.id);
        const productIds = new Set(ownedProducts.map((product) => product.id));
        const countryCount = new Set(
          deployments
            .filter((deployment) => productIds.has(deployment.productId))
            .map((deployment) => deployment.countryIso2),
        ).size;
        return { organisation, productCount: ownedProducts.length, countryCount };
      })
      .sort((left, right) => left.organisation.name.localeCompare(right.organisation.name));
  })();

  return (
    <main className="organisation-atlas" id="main-content" tabIndex={-1}>
      <header className="organisation-atlas-intro">
        <div>
          <h1>Organisations</h1>
          <p>Companies, public bodies and research groups behind reviewed software records.</p>
        </div>
        <Link href="/contribute">Add an organisation</Link>
      </header>

      <nav aria-label="Directory objects" className="object-tabs">
        <Link href="/">Software</Link>
        <span aria-current="page">Organisations</span>
      </nav>

      <section className="organisation-atlas-stats" aria-label="Organisation totals">
        <div><strong>{organisations.length}</strong><span>organisations</span></div>
        <div><strong>{products.length}</strong><span>linked products</span></div>
        <div><strong>{origins.length}</strong><span>origin classes</span></div>
      </section>

      <section className="organisation-atlas-controls" aria-label="Filter organisations">
        <label>
          <span className="sr-only">Search organisations</span>
          <i aria-hidden="true">⌕</i>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search organisations"
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Filter by origin"
          onChange={(event) => setOrigin(event.target.value)}
          value={origin}
        >
          <option value="all">All origins</option>
          {origins.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          aria-label="Filter by evidenced country"
          onChange={(event) => setCountry(event.target.value)}
          value={country}
        >
          <option value="all">All evidenced countries</option>
          {africanCountries.map(([iso2, name]) => <option key={iso2} value={iso2}>{name}</option>)}
        </select>
        <span aria-live="polite">{rows.length} shown</span>
      </section>

      {rows.length ? (
        <section className="organisation-atlas-grid" aria-label="Organisations">
          {rows.map(({ countryCount, organisation, productCount }) => (
            <article key={organisation.id}>
              <OrganisationMark
                name={organisation.name}
                organisationId={organisation.id}
                size={72}
              />
              <div>
                <h2><Link href={`/organisations/${organisation.slug}`}>{organisation.name}</Link></h2>
                <p>{organisation.countryOfOrigin} · {organisation.type}</p>
              </div>
              <dl>
                <div><dt>Products</dt><dd>{productCount}</dd></div>
                <div><dt>Countries</dt><dd>{countryCount || "—"}</dd></div>
              </dl>
              <Link aria-label={`Open ${organisation.name}`} href={`/organisations/${organisation.slug}`}>→</Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="landscape-empty"><strong>No organisations match.</strong></section>
      )}
    </main>
  );
}
