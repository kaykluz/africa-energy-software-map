import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { OrganisationMark, ProductMark } from "@/components/brand-mark";
import { organisationCatalogue } from "@/lib/organisation-catalogue";
import { landscapeSoftwareItems } from "@/lib/landscape-data";
import { deployments, products } from "@/lib/registry-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Africa Energy Software Map",
  description:
    "Find software, organisations and documented activity across African energy markets.",
};

const featuredProducts = products.slice(0, 5);

export default function Home() {
  return (
    <main className="home-page" id="main-content" tabIndex={-1}>
      <section className="home-intro">
        <div>
          <h1>Find organisations and software across African energy.</h1>
          <p>Browse roles, markets, locations and source-linked records.</p>
        </div>
        <form action="/search" className="home-search">
          <label className="sr-only" htmlFor="home-search">Search the database</label>
          <span aria-hidden="true">⌕</span>
          <input id="home-search" name="q" placeholder="Software, organisation, market or country" type="search" />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="home-entry-grid" aria-label="Browse the database">
        <Link className="home-map-entry" href="/deployments">
          <div className="home-map-copy">
            <span>Map</span>
            <h2>Browse activity by country</h2>
            <p>Switch between software locations and organisation presence.</p>
            <strong>Open map <i aria-hidden="true">→</i></strong>
          </div>
          <div className="home-map-motif" aria-hidden="true">
            {["MA", "SN", "NG", "GH", "KE", "UG", "TZ", "ZA"].map((code, index) => (
              <i key={code} style={{ "--home-dot": index } as CSSProperties}>{code}</i>
            ))}
          </div>
        </Link>
        <div className="home-object-entries">
          <Link href="/explore">
            <span>Software</span>
            <strong>{landscapeSoftwareItems.length.toLocaleString()}</strong>
            <small>Browse products and tools →</small>
          </Link>
          <Link href="/organisations">
            <span>Organisations</span>
            <strong>{organisationCatalogue.counts.total.toLocaleString()}</strong>
            <small>Browse the energy ecosystem →</small>
          </Link>
        </div>
      </section>

      <section className="home-view-links" aria-label="Choose a view">
        <Link href="/explore"><span>Explore</span><small>Filterable cards</small><i>→</i></Link>
        <Link href="/directory"><span>Directory</span><small>Reviewed data</small><i>→</i></Link>
        <Link href="/landscape"><span>Wall</span><small>Scan by category</small><i>→</i></Link>
        <Link href="/contribute"><span>Contribute</span><small>Add or correct data</small><i>＋</i></Link>
      </section>

      <section className="home-sample" aria-label="A sample of reviewed software">
        <header>
          <div><span>Reviewed links</span><h2>Start with reviewed records</h2></div>
          <p>{products.length} reviewed products · {deployments.length} documented deployments</p>
        </header>
        <div>
          {featuredProducts.map((product) => (
            <article key={product.id}>
              <ProductMark organisationId={product.organisationId} organisationName={product.organisation} productId={product.id} productName={product.name} size={42} />
              <span><Link href={`/products/${product.slug}`}><strong>{product.name}</strong></Link><small>{product.organisation}</small></span>
              <Link aria-label={`Open ${product.name}`} href={`/products/${product.slug}`}>→</Link>
            </article>
          ))}
          <article className="home-sample-organisations">
            <OrganisationMark name="African energy organisations" organisationId="home-organisations" size={42} />
            <span><Link href="/organisations"><strong>All organisations</strong></Link><small>Roles, markets and locations</small></span>
            <Link aria-label="Open all organisations" href="/organisations">→</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
