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
    : activeView === "wall"
      ? activeObject === "software" ? "Software wall" : "Organisation wall"
      : activeObject === "organisations" ? "Organisations" : "Explore";
  const description = activeView === "map"
    ? activeObject === "software"
      ? "Browse named deployments, catalogue locations and publisher headquarters. Africa-wide remains regional."
      : "Browse named headquarters, offices, warehouses, projects and activity. Africa-wide remains regional."
    : activeView === "wall"
      ? activeObject === "organisations"
        ? "Scan organisations by role, market and country."
        : "Scan the landscape by relationship to energy, function and value-chain stage."
      : activeObject === "organisations"
        ? "Find developers, EPCs, OEMs, financiers, software teams and sector enablers."
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
          <Link aria-current={activeObject === "software" ? "page" : undefined} href={softwareHref ?? "/explore"}>
            Software <span>{softwareCount}</span>
          </Link>
          <Link aria-current={activeObject === "organisations" ? "page" : undefined} href={organisationsHref ?? "/organisations"}>
            Organisations <span>{organisationCount.toLocaleString()}</span>
          </Link>
        </nav>
        <nav aria-label="Database view" className="database-view-tabs">
          <Link aria-current={activeView === "cards" ? "page" : undefined} href={cardsHref ?? (activeObject === "software" ? "/explore" : "/organisations")}>Explore</Link>
          <Link aria-current={activeView === "wall" ? "page" : undefined} href={wallHref ?? (activeObject === "software" ? "/landscape" : "/landscape?object=organisations")}>Wall</Link>
          <Link aria-current={activeView === "map" ? "page" : undefined} href={mapHref}>Map</Link>
        </nav>
      </div>
    </header>
  );
}
