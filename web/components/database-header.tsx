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
  const heading = activeView === "map"
    ? activeObject === "software" ? "Software map" : "Organisation map"
    : activeObject === "organisations"
      ? "Organisations"
      : activeView === "wall" ? "Software wall" : "Explore";
  const description = activeView === "map"
    ? activeObject === "software"
      ? "Browse deployments, catalogue locations and Africa-wide coverage by country."
      : "Browse headquarters, offices, activity and Africa-wide coverage by country."
    : activeObject === "organisations"
      ? "Find developers, EPCs, OEMs, financiers, software teams and sector enablers."
      : activeView === "wall"
        ? "Scan the landscape by relationship to energy, function and value-chain stage."
        : "Find software by function, value-chain stage or relationship to energy.";
  const activeCount = activeObject === "software" ? softwareCount : organisationCount;

  return (
    <header className="database-header">
      <div className="database-header-title">
        <div>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <div className="database-header-count">
          <strong>{activeCount.toLocaleString()}</strong>
          <span>{activeObject === "software" ? "software" : "organisations"}</span>
        </div>
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
