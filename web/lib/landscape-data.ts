import shard001 from "../../data/landscape/shards/breadth-first-001.json";
import shard002 from "../../data/landscape/shards/breadth-first-002.json";
import shard003 from "../../data/landscape/shards/breadth-first-003.json";
import shard004 from "../../data/landscape/shards/breadth-first-004.json";
import shard005 from "../../data/landscape/shards/breadth-first-005.json";
import shard006 from "../../data/landscape/shards/breadth-first-006.json";
import shard007 from "../../data/landscape/shards/breadth-first-007.json";
import shard008 from "../../data/landscape/shards/breadth-first-008.json";

export type LandscapeKind =
  | "organisation"
  | "product"
  | "public_tool"
  | "research_lead"
  | "source_directory";

export type LandscapeItem = {
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
  canonicalHref?: string;
};

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
  items: LandscapeItem[];
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
] as LandscapeShard[];

export const landscapeItems = landscapeShards.flatMap((shard) => shard.items);
export const landscapeDeploymentLeads = landscapeShards.flatMap(
  (shard) => shard.deploymentLeads,
);
export const landscapeRelationships = landscapeShards.flatMap(
  (shard) => shard.relationships,
);

export const landscapeSourceAsOf = landscapeShards
  .map((shard) => shard.sourceAsOf)
  .sort()
  .at(-1) ?? "";

export const landscapeKindLabels: Record<LandscapeKind, string> = {
  organisation: "Organisation",
  product: "Product",
  public_tool: "Public tool",
  research_lead: "Research lead",
  source_directory: "Source directory",
};

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

