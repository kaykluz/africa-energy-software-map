import taxonomyJson from "../../data/taxonomy.json";
import {
  africanCountries,
  assertions,
  deployments,
  organisationRoleRecords,
  organisationAliasRecords,
  organisationRelationshipRecords,
  organisationPresenceRecords,
  organisationSectorRecords,
  organisationSegmentRecords,
  organisationSoftwareRelationshipRecords,
  organisations,
  products,
  sources,
  type Organisation,
  type OrganisationPresenceRecord,
  type Product,
} from "@/lib/registry-data";

type TaxonomyItem = {
  id: string;
  name: string;
  order?: number;
  shortName?: string;
  description?: string;
};

type OrganisationRole = TaxonomyItem & {
  familyId: string;
  ecosystemGroupIds: string[];
};

type OrganisationRelationship = TaxonomyItem & {
  inverseName: string;
  ownershipRelationship: boolean;
};

type OrganisationTaxonomy = {
  sectors: TaxonomyItem[];
  stages: TaxonomyItem[];
  organisation_ecosystem_groups: TaxonomyItem[];
  organisation_role_families: TaxonomyItem[];
  organisation_roles: OrganisationRole[];
  organisation_segments: TaxonomyItem[];
  organisation_software_relationships: TaxonomyItem[];
  organisation_alias_types: TaxonomyItem[];
  organisation_relationships: OrganisationRelationship[];
};

const taxonomy = taxonomyJson as OrganisationTaxonomy;

export const organisationEcosystemGroups = [...taxonomy.organisation_ecosystem_groups].sort(
  (left, right) => (left.order ?? 0) - (right.order ?? 0),
);
export const organisationRoles = taxonomy.organisation_roles;
export const organisationRoleFamilies = taxonomy.organisation_role_families;
export const organisationSegments = taxonomy.organisation_segments;
export const organisationSoftwareRelationships =
  taxonomy.organisation_software_relationships;
export const organisationAliasTypes = taxonomy.organisation_alias_types;
export const organisationRelationships = taxonomy.organisation_relationships;
export const organisationSectors = [...taxonomy.sectors].sort(
  (left, right) => (left.order ?? 0) - (right.order ?? 0),
);
export const softwareStages = [...taxonomy.stages].sort(
  (left, right) => (left.order ?? 0) - (right.order ?? 0),
);

const rolesById = new Map(organisationRoles.map((item) => [item.id, item]));
const sectorsById = new Map(organisationSectors.map((item) => [item.id, item]));
const stagesById = new Map(softwareStages.map((item) => [item.id, item]));
const countriesByIso2 = new Map(africanCountries);
const providerSourceIds = new Set(
  sources
    .filter((source) => source.independenceClass === "provider_authored")
    .map((source) => source.id),
);

const sectorIdsByProduct = new Map<string, Set<string>>();
for (const assertion of assertions) {
  if (
    assertion.subjectType !== "product" ||
    assertion.predicate !== "sector_id" ||
    !sectorsById.has(assertion.value)
  ) continue;
  const current = sectorIdsByProduct.get(assertion.subjectId) ?? new Set<string>();
  current.add(assertion.value);
  sectorIdsByProduct.set(assertion.subjectId, current);
}

export type OrganisationDirectoryRecord = {
  organisation: Organisation;
  ownedProducts: Product[];
  roleIds: string[];
  primaryRole: OrganisationRole;
  ecosystemGroupIds: string[];
  sectorIds: string[];
  segmentIds: string[];
  stageIds: string[];
  softwareRelationshipTypes: string[];
  aliases: string[];
  presenceRecords: OrganisationPresenceRecord[];
  evidencedCountryIso2s: string[];
  companyStatedCountryIso2s: string[];
  officeCountryIso2s: string[];
  availabilityCountryIso2s: string[];
  softwareLinkedCountryIso2s: string[];
  countryIso2s: string[];
  countryNames: string[];
  productCount: number;
  countryCount: number;
};

export const organisationDirectory: OrganisationDirectoryRecord[] = organisations
  .map(buildOrganisationRecord)
  .sort((left, right) =>
    left.organisation.name.localeCompare(right.organisation.name),
  );

export function organisationDirectoryRecord(
  organisationId: string,
): OrganisationDirectoryRecord | undefined {
  return organisationDirectory.find(
    (record) => record.organisation.id === organisationId,
  );
}

export function organisationRoleName(roleId: string) {
  return rolesById.get(roleId)?.name ?? roleId;
}

export function organisationEcosystemGroupName(groupId: string) {
  return organisationEcosystemGroups.find((item) => item.id === groupId)?.name ?? groupId;
}

export function organisationSectorName(sectorId: string) {
  return sectorsById.get(sectorId)?.name ?? sectorId;
}

export function organisationSegmentName(segmentId: string) {
  return organisationSegments.find((item) => item.id === segmentId)?.name ?? segmentId;
}

export function softwareStageName(stageId: string) {
  return stagesById.get(stageId)?.name ?? stageId;
}

export function organisationAliases(organisationId: string) {
  return organisationAliasRecords.filter(
    (record) => record.organisationId === organisationId,
  );
}

export function relatedOrganisations(organisationId: string) {
  return organisationRelationshipRecords.flatMap((record) => {
    const relationship = organisationRelationships.find(
      (item) => item.id === record.relationshipType,
    );
    if (!relationship) return [];
    if (record.organisationId === organisationId) {
      const relatedOrganisation = organisations.find(
        (item) => item.id === record.relatedOrganisationId,
      );
      return relatedOrganisation
        ? [{ record, organisation: relatedOrganisation, label: relationship.name }]
        : [];
    }
    if (record.relatedOrganisationId === organisationId) {
      const relatedOrganisation = organisations.find(
        (item) => item.id === record.organisationId,
      );
      return relatedOrganisation
        ? [{ record, organisation: relatedOrganisation, label: relationship.inverseName }]
        : [];
    }
    return [];
  });
}

function buildOrganisationRecord(
  organisation: Organisation,
): OrganisationDirectoryRecord {
  const directlyOwnedProducts = products.filter(
    (product) => product.organisationId === organisation.id,
  );
  const explicitSoftwareRelationships = organisationSoftwareRelationshipRecords.filter(
    (record) => record.organisationId === organisation.id,
  );
  const linkedProductIds = new Set([
    ...directlyOwnedProducts.map((product) => product.id),
    ...explicitSoftwareRelationships.map((record) => record.productId),
  ]);
  const ownedProducts = products.filter((product) => linkedProductIds.has(product.id));
  const productIds = new Set(directlyOwnedProducts.map((product) => product.id));
  const explicitRoles = organisationRoleRecords
    .filter((record) => record.organisationId === organisation.id && rolesById.has(record.roleId))
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
  const roleIds = explicitRoles.length
    ? Array.from(new Set(explicitRoles.map((record) => record.roleId)))
    : ownedProducts.length
      ? ["org_role_software_developer"]
      : ["org_role_to_classify"];
  const primaryRole = rolesById.get(roleIds[0]);
  if (!primaryRole) throw new Error(`Unknown organisation role: ${roleIds[0]}`);
  const ecosystemGroupIds = Array.from(
    new Set(roleIds.flatMap((roleId) => rolesById.get(roleId)?.ecosystemGroupIds ?? [])),
  );
  const explicitSectorIds = organisationSectorRecords
    .filter((record) => record.organisationId === organisation.id && sectorsById.has(record.sectorId))
    .map((record) => record.sectorId);
  const sectorIds = Array.from(new Set(
    explicitSectorIds.length
      ? explicitSectorIds
      : ownedProducts.flatMap((product) =>
          Array.from(sectorIdsByProduct.get(product.id) ?? []),
        ),
  )).sort(byTaxonomyOrder(organisationSectors));
  const segmentIds = Array.from(new Set(
    organisationSegmentRecords
      .filter((record) =>
        record.organisationId === organisation.id &&
        organisationSegments.some((item) => item.id === record.segmentId),
      )
      .map((record) => record.segmentId),
  )).sort(byTaxonomyOrder(organisationSegments));
  const stageIds = Array.from(
    new Set(ownedProducts.map((product) => product.stageId)),
  ).sort(byTaxonomyOrder(softwareStages));
  const presenceRecords = organisationPresenceRecords.filter(
    (record) => record.organisationId === organisation.id,
  );
  const softwareLinkedCountryIso2s = sortCountries(Array.from(new Set(
    deployments
      .filter((deployment) => productIds.has(deployment.productId))
      .map((deployment) => deployment.countryIso2),
  )));
  const evidencedCountryIso2s = sortCountries(Array.from(new Set(
    presenceRecords
      .filter((record) =>
        record.evidenceStatus !== "provider_claim_only" &&
        !providerSourceIds.has(record.sourceId),
      )
      .map((record) => record.countryIso2),
  )));
  const companyStatedCountryIso2s = sortCountries(Array.from(new Set(
    presenceRecords
      .filter((record) =>
        record.evidenceStatus === "provider_claim_only" ||
        providerSourceIds.has(record.sourceId),
      )
      .map((record) => record.countryIso2),
  )));
  const officeCountryIso2s = sortCountries(Array.from(new Set(
    presenceRecords
      .filter((record) => ["office", "legal_entity"].includes(record.presenceType))
      .map((record) => record.countryIso2),
  )));
  const availabilityCountryIso2s = sortCountries(Array.from(new Set(
    presenceRecords
      .filter((record) => record.presenceType === "product_availability")
      .map((record) => record.countryIso2),
  )));
  const countryIso2s = sortCountries(Array.from(new Set([
    ...evidencedCountryIso2s,
    ...companyStatedCountryIso2s,
    ...softwareLinkedCountryIso2s,
  ])));

  return {
    organisation,
    ownedProducts,
    roleIds,
    primaryRole,
    ecosystemGroupIds,
    sectorIds,
    segmentIds,
    stageIds,
    softwareRelationshipTypes: Array.from(new Set(
      [
        ...(directlyOwnedProducts.length ? ["org_software_owns"] : []),
        ...explicitSoftwareRelationships.map((record) => record.relationshipType),
      ],
    )),
    aliases: organisationAliasRecords
      .filter((record) => record.organisationId === organisation.id)
      .map((record) => record.alias),
    presenceRecords,
    evidencedCountryIso2s,
    companyStatedCountryIso2s,
    officeCountryIso2s,
    availabilityCountryIso2s,
    softwareLinkedCountryIso2s,
    countryIso2s,
    countryNames: countryIso2s.map((iso2) => countriesByIso2.get(iso2) ?? iso2),
    productCount: ownedProducts.length,
    countryCount: countryIso2s.length,
  };
}

function sortCountries(values: string[]) {
  return values.sort((left, right) =>
    (countriesByIso2.get(left) ?? left).localeCompare(countriesByIso2.get(right) ?? right),
  );
}

function byTaxonomyOrder(items: TaxonomyItem[]) {
  const order = new Map(items.map((item, index) => [item.id, index]));
  return (left: string, right: string) =>
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(right) ?? Number.MAX_SAFE_INTEGER);
}
