import {
  africanCountries,
  categories,
  organisationAliasRecords,
  organisations,
  products,
} from "@/lib/registry-data";

export type ExactLinkCandidate = {
  href: string;
  names: string[];
};

export type ExactLinkIndex = ReadonlyMap<string, string>;

export type OrganisationLinkRecord = {
  aliases?: string[];
  organisation: {
    name: string;
    slug: string;
  };
};

export type LinkableLandscapeItem = {
  canonicalHref?: string;
  kind: string;
  name: string;
};

const aliasesByOrganisationId = new Map<string, string[]>();
for (const alias of organisationAliasRecords) {
  const values = aliasesByOrganisationId.get(alias.organisationId) ?? [];
  values.push(alias.alias);
  aliasesByOrganisationId.set(alias.organisationId, values);
}

const staticOrganisationCandidates = organisations.map((organisation) => ({
  href: `/organisations/${organisation.slug}`,
  names: [
    organisation.name,
    ...(aliasesByOrganisationId.get(organisation.id) ?? []),
  ],
}));

const staticOrganisationLinks = buildExactLinkIndex(staticOrganisationCandidates);

const productLinks = buildExactLinkIndex(
  products.map((product) => ({
    href: `/products/${product.slug}`,
    names: [product.name],
  })),
);

const countryLinks = buildExactLinkIndex(
  africanCountries.map(([iso2, name]) => ({
    href: `/countries/${iso2.toLowerCase()}`,
    names: [name, iso2],
  })),
);

const categoryLinks = buildExactLinkIndex(
  categories.map((category) => ({
    href: `/?category=${category.id}`,
    names: [category.name, category.id],
  })),
);

/**
 * Creates an exact, punctuation-insensitive identity index. If one key points
 * to more than one destination, it is deliberately left unresolved.
 */
export function buildExactLinkIndex(
  candidates: ExactLinkCandidate[],
): ExactLinkIndex {
  const links = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const candidate of candidates) {
    for (const name of candidate.names) {
      const key = normaliseEntityKey(name);
      if (!key || ambiguous.has(key)) continue;
      const existing = links.get(key);
      if (existing && existing !== candidate.href) {
        links.delete(key);
        ambiguous.add(key);
      } else {
        links.set(key, candidate.href);
      }
    }
  }
  return links;
}

export function organisationLinkIndex(
  records: OrganisationLinkRecord[],
): ExactLinkIndex {
  return buildExactLinkIndex(
    [
      ...staticOrganisationCandidates,
      ...records.map((record) => ({
        href: `/organisations/${record.organisation.slug}`,
        names: [record.organisation.name, ...(record.aliases ?? [])],
      })),
    ],
  );
}

export function resolveOrganisationHref(
  name: string,
  index: ExactLinkIndex = staticOrganisationLinks,
) {
  return resolveExactHref(name, index);
}

export function resolveProductHref(name: string) {
  return resolveExactHref(name, productLinks);
}

export function resolveCountryHref(nameOrIso2: string) {
  return resolveExactHref(nameOrIso2, countryLinks);
}

export function resolveCategoryHref(nameOrId: string) {
  return resolveExactHref(nameOrId, categoryLinks);
}

export function resolveLandscapeItemHref(
  item: LinkableLandscapeItem,
  organisationsIndex: ExactLinkIndex = staticOrganisationLinks,
) {
  if (item.canonicalHref) return item.canonicalHref;
  if (item.kind === "organisation") {
    return resolveOrganisationHref(item.name, organisationsIndex);
  }
  if (["product", "public_tool"].includes(item.kind)) {
    return resolveProductHref(item.name);
  }
  const candidates = unique([
    resolveProductHref(item.name),
    resolveOrganisationHref(item.name, organisationsIndex),
  ].filter((href): href is string => Boolean(href)));
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function resolveExactHref(value: string, index: ExactLinkIndex) {
  return index.get(normaliseEntityKey(value));
}

export function normaliseEntityKey(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
