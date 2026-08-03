import { queryOrganisationCatalogue } from "@/lib/organisation-catalogue";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = integer(params.get("page"), 1);
  const pageSize = integer(params.get("pageSize"), 60);
  const query = {
    query: text(params.get("q"), 160),
    role: text(params.get("role"), 120) || "all",
    segment: text(params.get("segment"), 120) || "all",
    country: text(params.get("country"), 120) || "all",
    headquarters: text(params.get("headquarters"), 120) || "all",
    scope: text(params.get("scope"), 30) || "all",
  };
  if (params.get("format") === "csv") {
    const first = queryOrganisationCatalogue({ ...query, page: 1, pageSize: 100 });
    const records = [...first.records];
    for (let current = 2; current <= first.pageCount; current += 1) {
      records.push(...queryOrganisationCatalogue({ ...query, page: current, pageSize: 100 }).records);
    }
    return new Response(catalogueCsv(records), {
      headers: {
        "Cache-Control": "private, max-age=0",
        "Content-Disposition": 'attachment; filename="africa-energy-organisations-inclusion-catalogue.csv"',
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return Response.json(
    queryOrganisationCatalogue({
      ...query,
      page,
      pageSize,
    }),
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function catalogueCsv(records: ReturnType<typeof queryOrganisationCatalogue>["records"]) {
  const headers = [
    "organisation", "aliases", "parent_group", "organisation_type", "primary_role",
    "all_roles", "energy_markets", "headquarters_country", "africa_headquartered",
    "countries_active_or_available", "technologies", "status", "catalogue_status",
    "evidence_confidence", "last_checked", "source", "website",
  ];
  const rows = records.map((record) => ({
    organisation: record.name,
    aliases: record.aliases,
    parent_group: record.parent,
    organisation_type: record.organisationType,
    primary_role: record.primaryRole,
    all_roles: record.roles,
    energy_markets: record.segments,
    headquarters_country: record.headquartersCountry,
    africa_headquartered: record.africaHeadquartered ? "Yes" : "No",
    countries_active_or_available: record.countriesActive,
    technologies: record.technologies,
    status: record.lifecycle,
    catalogue_status: record.reviewState === "reviewed" ? "Reviewed match" : "Review pending",
    evidence_confidence: record.confidence,
    last_checked: record.lastReviewed,
    source: record.sourceUrl,
    website: record.website,
  }));
  const escape = (value: string | string[]) => {
    const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(",")),
  ].join("\n");
}

function text(value: string | null, maximum: number) {
  return (value ?? "").trim().replaceAll("\u0000", "").slice(0, maximum);
}

function integer(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
