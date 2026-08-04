import shard001 from "../../data/landscape/shards/breadth-first-001.json";
import shard002 from "../../data/landscape/shards/breadth-first-002.json";
import shard003 from "../../data/landscape/shards/breadth-first-003.json";
import shard004 from "../../data/landscape/shards/breadth-first-004.json";
import shard005 from "../../data/landscape/shards/breadth-first-005.json";
import shard006 from "../../data/landscape/shards/breadth-first-006.json";
import shard007 from "../../data/landscape/shards/breadth-first-007.json";
import shard008 from "../../data/landscape/shards/breadth-first-008.json";
import phase1001 from "../../data/landscape/shards/phase1-catalogue-001.json";
import phase1002 from "../../data/landscape/shards/phase1-catalogue-002.json";
import phase1003 from "../../data/landscape/shards/phase1-catalogue-003.json";
import phase1004 from "../../data/landscape/shards/phase1-catalogue-004.json";
import phase1005 from "../../data/landscape/shards/phase1-catalogue-005.json";
import phase1006 from "../../data/landscape/shards/phase1-catalogue-006.json";
import phase1007 from "../../data/landscape/shards/phase1-catalogue-007.json";
import phase1008 from "../../data/landscape/shards/phase1-catalogue-008.json";
import phase1009 from "../../data/landscape/shards/phase1-catalogue-009.json";
import phase1010 from "../../data/landscape/shards/phase1-catalogue-010.json";
import phase1011 from "../../data/landscape/shards/phase1-catalogue-011.json";
import phase1012 from "../../data/landscape/shards/phase1-catalogue-012.json";
import phase1013 from "../../data/landscape/shards/phase1-catalogue-013.json";
import phase1014 from "../../data/landscape/shards/phase1-catalogue-014.json";
import phase1015 from "../../data/landscape/shards/phase1-catalogue-015.json";
import phase1016 from "../../data/landscape/shards/phase1-catalogue-016.json";
import phase1017 from "../../data/landscape/shards/phase1-catalogue-017.json";
import phase1018 from "../../data/landscape/shards/phase1-catalogue-018.json";
import landscapeClassificationData from "../../data/landscape/classifications.json";
import taxonomyData from "../../data/taxonomy.json";

export type LandscapeKind =
  | "organisation"
  | "product"
  | "public_tool"
  | "research_lead"
  | "source_directory";

type LandscapeItemRecord = {
  id: string;
  name: string;
  kind: LandscapeKind;
  parent?: string;
  aliases?: string[];
  stageIds: string[];
  categoryIds: string[];
  sectorIds: string[];
  geographies: string[];
  statusAsSubmitted: string;
  summaryAsSubmitted: string;
  sourceDomains: string[];
  sourceUrls?: string[];
  websiteAsSubmitted?: string;
  segmentsAsSubmitted?: string[];
  deliveryModelsAsSubmitted?: string[];
  commercialModelAsSubmitted?: string;
  africaUseAsSubmitted?: AfricaUseAsSubmitted;
  asOfDate?: string;
  canonicalHref?: string;
};

export type EnergyRelationship =
  | "energy_native"
  | "energy_applied"
  | "enabling_infrastructure"
  | "operator_owned"
  | "public_research"
  | "unclassified";

export type LandscapeClassification = {
  itemId: string;
  energyRelationship: EnergyRelationship;
  functionIds: string[];
  logoPath?: string;
  logoSourceUrl?: string;
};

export type LandscapeItem = LandscapeItemRecord & LandscapeClassification;

export type AfricaUseAsSubmitted =
  | "confirmed_deployment"
  | "marketed_to_africa"
  | "africa_usage_likely_unverified"
  | "no_africa_evidence_found";

export type LandscapeDeploymentLead = {
  id: string;
  name: string;
  organisation: string;
  product: string;
  countries: string[];
  customerAsSubmitted: string;
  scaleAsSubmitted: string;
  dateAsSubmitted: string;
  sourceDomains: string[];
  sourceUrls?: string[];
};

export type LandscapeRelationship = {
  id: string;
  name: string;
  subject: string;
  eventAsSubmitted: string;
  dateAsSubmitted: string;
  sourceDomains: string[];
};

type LandscapeShard = {
  schemaVersion: string;
  batchId: string;
  sourceLabel: string;
  sourceAsOf: string;
  items: LandscapeItemRecord[];
  deploymentLeads: LandscapeDeploymentLead[];
  relationships: LandscapeRelationship[];
};

export const landscapeShards = [
  shard001,
  shard002,
  shard003,
  shard004,
  shard005,
  shard006,
  shard007,
  shard008,
  phase1001,
  phase1002,
  phase1003,
  phase1004,
  phase1005,
  phase1006,
  phase1007,
  phase1008,
  phase1009,
  phase1010,
  phase1011,
  phase1012,
  phase1013,
  phase1014,
  phase1015,
  phase1016,
  phase1017,
  phase1018,
] as LandscapeShard[];

const classifications = landscapeClassificationData.items as LandscapeClassification[];
const classificationById = new Map(
  classifications.map((classification) => [classification.itemId, classification]),
);

export const landscapeItems = landscapeShards.flatMap((shard) => shard.items).map((item) => ({
  ...item,
  ...(classificationById.get(item.id) ?? {
    itemId: item.id,
    energyRelationship: "unclassified" as const,
    functionIds: [],
  }),
}));
export const landscapeSoftwareItems = landscapeItems.filter((item) =>
  item.kind === "product" || item.kind === "public_tool" || item.kind === "research_lead",
);
export const landscapeDeploymentLeads = landscapeShards.flatMap(
  (shard) => shard.deploymentLeads,
);
export const landscapeRelationships = landscapeShards.flatMap(
  (shard) => shard.relationships,
);
export const landscapeSourceDomains = Array.from(
  new Set(
    landscapeShards.flatMap((shard) =>
      [...shard.items, ...shard.deploymentLeads, ...shard.relationships].flatMap(
        (record) => record.sourceDomains,
      ),
    ),
  ),
).sort((left, right) => left.localeCompare(right));

export const landscapeSourceAsOf = landscapeShards
  .map((shard) => shard.sourceAsOf)
  .sort()
  .at(-1) ?? "";

export const landscapeKindLabels: Record<LandscapeKind, string> = {
  organisation: "Organisation",
  product: "Product",
  public_tool: "Public tool",
  research_lead: "Research lead",
  source_directory: "Source lead",
};

export const landscapeEnergyRelationshipLabels: Record<EnergyRelationship, string> =
  Object.fromEntries(
    taxonomyData.energy_relationships.map((relationship) => [
      relationship.id,
      relationship.name,
    ]),
  ) as Record<EnergyRelationship, string>;

export const landscapeEnergyRelationshipDescriptions: Record<EnergyRelationship, string> =
  Object.fromEntries(
    taxonomyData.energy_relationships.map((relationship) => [
      relationship.id,
      relationship.description,
    ]),
  ) as Record<EnergyRelationship, string>;

export const landscapeFunctionLabels: Record<string, string> = Object.fromEntries(
  taxonomyData.functions.map((item) => [item.id, item.name]),
);

export const landscapeStageLabels: Record<string, string> = {
  stage_plan_design: "Plan and design",
  stage_finance_procure: "Finance and procure",
  stage_generate_store: "Generate and store",
  stage_transmit_distribute: "Transmit and distribute",
  stage_meter_serve: "Meter and serve",
  stage_trade_report: "Trade and report",
};

export const landscapeCategoryLabels: Record<string, string> = {
  cat_planning_geospatial: "Planning and geospatial",
  cat_engineering_design_simulation: "Engineering, design and simulation",
  cat_finance_procurement_underwriting: "Finance, procurement and underwriting",
  cat_generation_storage_operations: "Generation and storage operations",
  cat_transmission_system_operation: "Transmission and system operation",
  cat_distribution_utility_operations: "Distribution utility operations",
  cat_forecasting_flexibility_der: "Forecasting, flexibility and DER orchestration",
  cat_paygo_minigrid_operations: "PAYGo and mini-grid operations",
  cat_retail_metering_billing_payments: "Retail metering, billing and payments",
  cat_ci_behind_meter: "C&I and behind-the-meter",
  cat_emobility_battery_networks: "E-mobility and battery networks",
  cat_trading_wheeling_settlement: "Trading, wheeling and settlement",
  cat_carbon_mrv_reporting: "Carbon, MRV and reporting",
  cat_data_interoperability_security: "Data, interoperability and security",
};

export const landscapeSectorLabels: Record<string, string> = {
  sector_power_utilities: "Power networks and utilities",
  sector_distributed_energy_access: "Distributed energy and energy access",
  sector_generation_storage: "Generation and storage",
  sector_commercial_industrial: "Commercial and industrial energy",
  sector_emobility_batteries: "E-mobility and battery networks",
  sector_markets_finance_carbon: "Markets, finance and carbon",
};

export const landscapeAfricaUseLabels: Record<AfricaUseAsSubmitted, string> = {
  confirmed_deployment: "African use supplied",
  marketed_to_africa: "Marketed to Africa",
  africa_usage_likely_unverified: "Possible African use",
  no_africa_evidence_found: "No African source supplied",
};
