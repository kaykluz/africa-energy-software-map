export type EvidenceStatus =
  | "provider_claim_only"
  | "public_source"
  | "independently_evidenced"
  | "customer_confirmed";

export type Product = {
  id: string;
  name: string;
  slug: string;
  organisationId: string;
  organisation: string;
  description: string;
  categoryId: string;
  category: string;
  stageId: string;
  origin: "africa_built" | "global_deployed_in_africa";
  lifecycle: "active" | "pilot" | "historical";
  accessModel: string;
  website: string;
  lastChecked: string;
  deploymentCountries: string[];
  evidence: EvidenceStatus[];
  capabilities: string[];
};

export type Deployment = {
  id: string;
  productId: string;
  countryIso2: string;
  country: string;
  area: string;
  customer: string;
  customerDisclosure: "named" | "undisclosed";
  lifecycle: "live" | "pilot" | "historical";
  year: string;
  evidence: EvidenceStatus;
  sourceId: string;
  lastChecked: string;
};

export type Category = {
  id: string;
  name: string;
  stageId: string;
  marketCondition:
    | "commercial_market"
    | "bundled_or_gated"
    | "donor_supported"
    | "structurally_thin"
    | "insufficient_evidence";
  verdict: string;
  researchState:
    | "published"
    | "research_queue"
    | "not_researched"
    | "no_verified_entry"
    | "structurally_thin";
};

export const release = {
  version: "prototype-0.1",
  date: "30 July 2026",
  isoDate: "2026-07-30",
  status: "Candidate import — editorial review required",
};

export const organisations = [
  {
    id: "org_001",
    name: "Beacon Power Services",
    slug: "beacon-power-services",
    type: "Utility software scale-up",
    origin: "Africa-built",
    countryOfOrigin: "Nigeria",
    headquarters: "Not publicly documented",
    lifecycle: "Active",
    website: "https://beaconpowerservices.com/",
    description:
      "Distribution utility digitisation, grid mapping, customer and asset systems.",
    lastChecked: "24 July 2026",
  },
  {
    id: "org_002",
    name: "PAM Africa",
    slug: "pam-africa",
    type: "Energy software start-up",
    origin: "Africa-built",
    countryOfOrigin: "Nigeria",
    headquarters: "Nigeria",
    lifecycle: "Active",
    website: "https://pamafrica.com/",
    description:
      "Mini-grid optimisation, smart metering, payments and demand response.",
    lastChecked: "24 July 2026",
  },
  {
    id: "org_003",
    name: "PowerLabs",
    slug: "powerlabs",
    type: "Energy software start-up",
    origin: "Africa-built",
    countryOfOrigin: "Nigeria",
    headquarters: "Nigeria",
    lifecycle: "Active",
    website: "https://powerlabs.energy/",
    description:
      "Hybrid power orchestration for grid, solar, batteries, generators and inverters.",
    lastChecked: "24 July 2026",
  },
] as const;

export const products: Product[] = [
  {
    id: "prod_001",
    name: "CAIMS",
    slug: "caims",
    organisationId: "org_001",
    organisation: "Beacon Power Services",
    description:
      "Customer and asset information, network surveys, connections and digital-twin workflows.",
    categoryId: "cat_distribution_utility_operations",
    category: "Distribution utility operations",
    stageId: "stage_transmit_distribute",
    origin: "africa_built",
    lifecycle: "active",
    accessModel: "Commercial proprietary",
    website: "https://beaconpowerservices.com/en/solutions/caims",
    lastChecked: "30 July 2026",
    deploymentCountries: ["NG"],
    evidence: ["independently_evidenced", "provider_claim_only"],
    capabilities: [
      "Customer information",
      "Asset registry",
      "Network surveys",
      "Connection workflows",
    ],
  },
  {
    id: "prod_002",
    name: "Adora",
    slug: "adora",
    organisationId: "org_001",
    organisation: "Beacon Power Services",
    description:
      "Grid operations, outage and loss analytics, field work and commercial operations.",
    categoryId: "cat_distribution_utility_operations",
    category: "Distribution utility operations",
    stageId: "stage_transmit_distribute",
    origin: "africa_built",
    lifecycle: "active",
    accessModel: "Commercial proprietary",
    website: "https://beaconpowerservices.com/en/solutions/adora",
    lastChecked: "30 July 2026",
    deploymentCountries: ["NG"],
    evidence: ["independently_evidenced", "provider_claim_only"],
    capabilities: [
      "Grid operations",
      "Outage analytics",
      "Loss analytics",
      "Field work",
    ],
  },
  {
    id: "prod_003",
    name: "Xepp",
    slug: "xepp",
    organisationId: "org_001",
    organisation: "Beacon Power Services",
    description:
      "Consumption insights, payments, customer engagement and distributed-solar offers.",
    categoryId: "cat_retail_metering_billing_payments",
    category: "Retail metering, billing and payments",
    stageId: "stage_meter_serve",
    origin: "africa_built",
    lifecycle: "active",
    accessModel: "Public access",
    website: "https://www.beaconpowerservices.com/en/solutions/xepp",
    lastChecked: "30 July 2026",
    deploymentCountries: [],
    evidence: ["provider_claim_only"],
    capabilities: [
      "Consumption insights",
      "Payments",
      "Customer engagement",
      "Distributed-solar offers",
    ],
  },
  {
    id: "prod_004",
    name: "PAM-AI",
    slug: "pam-ai",
    organisationId: "org_002",
    organisation: "PAM Africa",
    description:
      "Real-time monitoring, smart tariffs, remote device control, payment integration and demand response.",
    categoryId: "cat_paygo_minigrid_operations",
    category: "PAYGo and mini-grid operations",
    stageId: "stage_meter_serve",
    origin: "africa_built",
    lifecycle: "pilot",
    accessModel: "Commercial service",
    website: "https://www.pamafrica.com/",
    lastChecked: "30 July 2026",
    deploymentCountries: ["NG"],
    evidence: ["independently_evidenced", "public_source"],
    capabilities: [
      "Smart tariffs",
      "Remote device control",
      "Payment integration",
      "Demand response",
    ],
  },
  {
    id: "prod_005",
    name: "Pai Enterprise",
    slug: "pai-enterprise",
    organisationId: "org_003",
    organisation: "PowerLabs",
    description:
      "Energy monitoring, analytics, sizing optimisation, anomaly detection and multi-source orchestration.",
    categoryId: "cat_ci_behind_meter",
    category: "C&I and behind-the-meter",
    stageId: "stage_meter_serve",
    origin: "africa_built",
    lifecycle: "active",
    accessModel: "Commercial service",
    website: "https://www.powerlabstech.com/pai-enterprise/software",
    lastChecked: "30 July 2026",
    deploymentCountries: [],
    evidence: ["provider_claim_only"],
    capabilities: [
      "Energy monitoring",
      "Anomaly detection",
      "Sizing optimisation",
      "Multi-source orchestration",
    ],
  },
];

export const deployments: Deployment[] = [
  {
    id: "dep_001",
    productId: "prod_001",
    countryIso2: "NG",
    country: "Nigeria",
    area: "Abuja distribution area",
    customer: "Abuja Electricity Distribution Company (AEDC)",
    customerDisclosure: "named",
    lifecycle: "pilot",
    year: "2023",
    evidence: "independently_evidenced",
    sourceId: "src_72a68084f5f1f2f3",
    lastChecked: "24 July 2026",
  },
  {
    id: "dep_002",
    productId: "prod_002",
    countryIso2: "NG",
    country: "Nigeria",
    area: "Abuja distribution area",
    customer: "Abuja Electricity Distribution Company (AEDC)",
    customerDisclosure: "named",
    lifecycle: "pilot",
    year: "2023",
    evidence: "independently_evidenced",
    sourceId: "src_72a68084f5f1f2f3",
    lastChecked: "24 July 2026",
  },
  {
    id: "dep_003",
    productId: "prod_004",
    countryIso2: "NG",
    country: "Nigeria",
    area: "Northern Nigeria",
    customer: "Kano Electricity Distribution Company (KEDCO)",
    customerDisclosure: "named",
    lifecycle: "pilot",
    year: "2025",
    evidence: "independently_evidenced",
    sourceId: "src_353841a5fa8a37f5",
    lastChecked: "24 July 2026",
  },
  {
    id: "dep_004",
    productId: "prod_004",
    countryIso2: "NG",
    country: "Nigeria",
    area: "Country-level disclosure",
    customer: "Customer undisclosed",
    customerDisclosure: "undisclosed",
    lifecycle: "pilot",
    year: "2025",
    evidence: "independently_evidenced",
    sourceId: "src_353841a5fa8a37f5",
    lastChecked: "24 July 2026",
  },
];

export const sources = [
  {
    id: "src_792d6f5e54ae6a49",
    title: "Beacon Power Services — product information",
    publisher: "Beacon Power Services",
    url: "https://beaconpowerservices.com/",
    independence: "Provider-authored",
    retrieved: "24 July 2026",
  },
  {
    id: "src_353841a5fa8a37f5",
    title: "Digital Energy Challenge 2025 results",
    publisher: "Digital Energy Challenge",
    url: "https://digital-energy.eu/fr/resultats-du-challenge-2025",
    independence: "Independent primary",
    retrieved: "24 July 2026",
  },
  {
    id: "src_72a68084f5f1f2f3",
    title: "Digital Energy Challenge for Africa’s energy transition",
    publisher: "Agence Française de Développement",
    url: "https://www.afd.fr/en/actualites/digital-energy-challenge-africa-energy-transition",
    independence: "Independent primary",
    retrieved: "24 July 2026",
  },
  {
    id: "src_0dbeea2074ea9657",
    title: "PowerLabs — company information",
    publisher: "PowerLabs",
    url: "https://powerlabs.energy/",
    independence: "Provider-authored",
    retrieved: "24 July 2026",
  },
] as const;

export const stages = [
  { id: "stage_plan_design", name: "Plan and design", order: 1 },
  { id: "stage_finance_procure", name: "Finance and procure", order: 2 },
  { id: "stage_generate_store", name: "Generate and store", order: 3 },
  {
    id: "stage_transmit_distribute",
    name: "Transmit and distribute",
    order: 4,
  },
  { id: "stage_meter_serve", name: "Meter and serve", order: 5 },
  { id: "stage_trade_report", name: "Trade and report", order: 6 },
] as const;

export const categories: Category[] = [
  {
    id: "cat_planning_geospatial",
    name: "Planning and geospatial",
    stageId: "stage_plan_design",
    marketCondition: "insufficient_evidence",
    verdict: "Research coverage is still being established.",
    researchState: "research_queue",
  },
  {
    id: "cat_engineering_design_simulation",
    name: "Engineering, design and simulation",
    stageId: "stage_plan_design",
    marketCondition: "insufficient_evidence",
    verdict: "Four candidates remain in the research queue.",
    researchState: "research_queue",
  },
  {
    id: "cat_finance_procurement_underwriting",
    name: "Finance, procurement and underwriting",
    stageId: "stage_finance_procure",
    marketCondition: "insufficient_evidence",
    verdict: "No candidate record has completed editorial review.",
    researchState: "no_verified_entry",
  },
  {
    id: "cat_generation_storage_operations",
    name: "Generation and storage operations",
    stageId: "stage_generate_store",
    marketCondition: "insufficient_evidence",
    verdict: "This category has not yet received a complete research pass.",
    researchState: "not_researched",
  },
  {
    id: "cat_transmission_system_operation",
    name: "Transmission and system operation",
    stageId: "stage_transmit_distribute",
    marketCondition: "structurally_thin",
    verdict:
      "No verified entry found; procurement and system-access constraints require research.",
    researchState: "structurally_thin",
  },
  {
    id: "cat_distribution_utility_operations",
    name: "Distribution utility operations",
    stageId: "stage_transmit_distribute",
    marketCondition: "commercial_market",
    verdict: "Early candidate evidence shows utility digitisation activity.",
    researchState: "published",
  },
  {
    id: "cat_forecasting_flexibility_der",
    name: "Forecasting, flexibility and DER orchestration",
    stageId: "stage_transmit_distribute",
    marketCondition: "donor_supported",
    verdict: "Research queue open; commercial maturity is not yet assessed.",
    researchState: "research_queue",
  },
  {
    id: "cat_paygo_minigrid_operations",
    name: "PAYGo and mini-grid operations",
    stageId: "stage_meter_serve",
    marketCondition: "commercial_market",
    verdict: "Candidate evidence includes named and undisclosed pilot customers.",
    researchState: "published",
  },
  {
    id: "cat_retail_metering_billing_payments",
    name: "Retail metering, billing and payments",
    stageId: "stage_meter_serve",
    marketCondition: "bundled_or_gated",
    verdict: "Product availability is documented; deployment evidence is pending.",
    researchState: "published",
  },
  {
    id: "cat_ci_behind_meter",
    name: "C&I and behind-the-meter",
    stageId: "stage_meter_serve",
    marketCondition: "commercial_market",
    verdict: "Provider-authored product evidence is available.",
    researchState: "published",
  },
  {
    id: "cat_emobility_battery_networks",
    name: "E-mobility and battery networks",
    stageId: "stage_meter_serve",
    marketCondition: "insufficient_evidence",
    verdict: "Research pass scheduled; no completeness claim is made.",
    researchState: "research_queue",
  },
  {
    id: "cat_trading_wheeling_settlement",
    name: "Trading, wheeling and settlement",
    stageId: "stage_trade_report",
    marketCondition: "structurally_thin",
    verdict:
      "No verified entry found; market structure and regulation may constrain deployment.",
    researchState: "structurally_thin",
  },
  {
    id: "cat_carbon_mrv_reporting",
    name: "Carbon, MRV and reporting",
    stageId: "stage_trade_report",
    marketCondition: "insufficient_evidence",
    verdict: "Candidate discovery has not yet become a publishable record.",
    researchState: "research_queue",
  },
  {
    id: "cat_data_interoperability_security",
    name: "Data, interoperability and security",
    stageId: "cross_cutting",
    marketCondition: "insufficient_evidence",
    verdict: "Cross-cutting research queue open.",
    researchState: "research_queue",
  },
];

export const africanCountries = [
  ["DZ", "Algeria"],
  ["AO", "Angola"],
  ["BJ", "Benin"],
  ["BW", "Botswana"],
  ["BF", "Burkina Faso"],
  ["BI", "Burundi"],
  ["CV", "Cabo Verde"],
  ["CM", "Cameroon"],
  ["CF", "Central African Republic"],
  ["TD", "Chad"],
  ["KM", "Comoros"],
  ["CD", "Democratic Republic of the Congo"],
  ["CG", "Republic of the Congo"],
  ["CI", "Côte d’Ivoire"],
  ["DJ", "Djibouti"],
  ["EG", "Egypt"],
  ["GQ", "Equatorial Guinea"],
  ["ER", "Eritrea"],
  ["SZ", "Eswatini"],
  ["ET", "Ethiopia"],
  ["GA", "Gabon"],
  ["GM", "The Gambia"],
  ["GH", "Ghana"],
  ["GN", "Guinea"],
  ["GW", "Guinea-Bissau"],
  ["KE", "Kenya"],
  ["LS", "Lesotho"],
  ["LR", "Liberia"],
  ["LY", "Libya"],
  ["MG", "Madagascar"],
  ["MW", "Malawi"],
  ["ML", "Mali"],
  ["MR", "Mauritania"],
  ["MU", "Mauritius"],
  ["MA", "Morocco"],
  ["MZ", "Mozambique"],
  ["NA", "Namibia"],
  ["NE", "Niger"],
  ["NG", "Nigeria"],
  ["RW", "Rwanda"],
  ["ST", "São Tomé and Príncipe"],
  ["SN", "Senegal"],
  ["SC", "Seychelles"],
  ["SL", "Sierra Leone"],
  ["SO", "Somalia"],
  ["ZA", "South Africa"],
  ["SS", "South Sudan"],
  ["SD", "Sudan"],
  ["TZ", "Tanzania"],
  ["TG", "Togo"],
  ["TN", "Tunisia"],
  ["UG", "Uganda"],
  ["ZM", "Zambia"],
  ["ZW", "Zimbabwe"],
] as const;

export const evidenceLabels: Record<EvidenceStatus, string> = {
  provider_claim_only: "Provider claim",
  public_source: "Publicly sourced",
  independently_evidenced: "Independently evidenced",
  customer_confirmed: "Customer confirmed",
};

export const productBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);

export const productById = (id: string) =>
  products.find((product) => product.id === id);

export const organisationBySlug = (slug: string) =>
  organisations.find((organisation) => organisation.slug === slug);
