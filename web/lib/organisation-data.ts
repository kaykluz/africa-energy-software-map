import taxonomyJson from "../../data/taxonomy.json";
import {
  africanCountries,
  assertions,
  deployments,
  organisationRoleRecords,
  organisationSectorRecords,
  organisationSegmentRecords,
  organisationSoftwareRelationshipRecords,
  organisations,
  products,
  type Organisation,
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
  valueChainIds: string[];
};

type OrganisationTaxonomy = {
  sectors: TaxonomyItem[];
  stages: TaxonomyItem[];
  organisation_value_chain: TaxonomyItem[];
  organisation_role_families: TaxonomyItem[];
  organisation_roles: OrganisationRole[];
  organisation_segments: TaxonomyItem[];
  organisation_software_relationships: TaxonomyItem[];
};

const taxonomy = taxonomyJson as OrganisationTaxonomy;

export const organisationValueChain = [...taxonomy.organisation_value_chain].sort(
  (left, right) => (left.order ?? 0) - (right.order ?? 0),
);
export const organisationRoles = taxonomy.organisation_roles;
export const organisationRoleFamilies = taxonomy.organisation_role_families;
export const organisationSegments = taxonomy.organisation_segments;
export const organisationSoftwareRelationships =
  taxonomy.organisation_software_relationships;
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
  valueChainIds: string[];
  sectorIds: string[];
  segmentIds: string[];
  stageIds: string[];
  softwareRelationshipTypes: string[];
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

export function organisationSectorName(sectorId: string) {
  return sectorsById.get(sectorId)?.name ?? sectorId;
}

export function organisationSegmentName(segmentId: string) {
  return organisationSegments.find((item) => item.id === segmentId)?.name ?? segmentId;
}

export function softwareStageName(stageId: string) {
  return stagesById.get(stageId)?.name ?? stageId;
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
      ? ["org_role_software_data_provider"]
      : ["org_role_to_classify"];
  const primaryRole = rolesById.get(roleIds[0]);
  if (!primaryRole) throw new Error(`Unknown organisation role: ${roleIds[0]}`);
  const valueChainIds = Array.from(
    new Set(roleIds.flatMap((roleId) => rolesById.get(roleId)?.valueChainIds ?? [])),
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
  const countryIso2s = Array.from(
    new Set(
      deployments
        .filter((deployment) => productIds.has(deployment.productId))
        .map((deployment) => deployment.countryIso2),
    ),
  ).sort((left, right) =>
    (countriesByIso2.get(left) ?? left).localeCompare(countriesByIso2.get(right) ?? right),
  );

  return {
    organisation,
    ownedProducts,
    roleIds,
    primaryRole,
    valueChainIds,
    sectorIds,
    segmentIds,
    stageIds,
    softwareRelationshipTypes: Array.from(new Set(
      [
        ...(directlyOwnedProducts.length ? ["org_software_owns"] : []),
        ...explicitSoftwareRelationships.map((record) => record.relationshipType),
      ],
    )),
    countryIso2s,
    countryNames: countryIso2s.map((iso2) => countriesByIso2.get(iso2) ?? iso2),
    productCount: ownedProducts.length,
    countryCount: countryIso2s.length,
  };
}

function byTaxonomyOrder(items: TaxonomyItem[]) {
  const order = new Map(items.map((item, index) => [item.id, index]));
  return (left: string, right: string) =>
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(right) ?? Number.MAX_SAFE_INTEGER);
}
