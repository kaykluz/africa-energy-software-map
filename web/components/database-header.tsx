import Link from "next/link";

type DatabaseHeaderProps = {
  activeObject: "software" | "organisations";
  activeView: "cards" | "wall" | "map";
  cardsHref?: string;
  mapHref: string;
  organisationCount: number;
  organisationsHref?: string;
  softwareHref?: string;
  softwareCount: number;
  wallHref?: string;
};

export function DatabaseHeader({
  activeObject,
  activeView,
  cardsHref,
  mapHref,
  organisationCount,
  organisationsHref,
  softwareHref,
  softwareCount,
  wallHref,
}: DatabaseHeaderProps) {
  return (
    <header className="database-header">
      <div className="database-header-title">
        <div>
          <h1>Database</h1>
          <p>Search, filter and open every record from one place.</p>
        </div>
        <strong>{activeObject === "software" ? softwareCount : organisationCount}</strong>
      </div>
      <div className="database-header-navs">
        <nav aria-label="Database records" className="database-object-tabs">
          <Link aria-current={activeObject === "software" ? "page" : undefined} href={softwareHref ?? "/"}>
            Software <span>{softwareCount}</span>
          </Link>
          <Link aria-current={activeObject === "organisations" ? "page" : undefined} href={organisationsHref ?? "/organisations"}>
            Organisations <span>{organisationCount.toLocaleString()}</span>
          </Link>
        </nav>
        <nav aria-label="Database view" className="database-view-tabs">
          <Link aria-current={activeView === "cards" ? "page" : undefined} href={cardsHref ?? (activeObject === "software" ? "/" : "/organisations")}>Cards</Link>
          {activeObject === "software" ? <Link aria-current={activeView === "wall" ? "page" : undefined} href={wallHref ?? "/landscape"}>Wall</Link> : null}
          <Link aria-current={activeView === "map" ? "page" : undefined} href={mapHref}>Map</Link>
        </nav>
      </div>
    </header>
  );
}
