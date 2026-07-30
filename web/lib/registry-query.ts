import {
  type EvidenceStatus,
  type OriginClassification,
  type Product,
  type ProductLifecycle,
} from "@/lib/registry-data";

export type ProductFilters = {
  query: string;
  category: string;
  evidence: string;
  country: string;
  origin: string;
  lifecycle: string;
  access: string;
};

export type ProductSort =
  | "product"
  | "organisation"
  | "category"
  | "checked";

export function filterProducts(
  records: Product[],
  filters: ProductFilters,
) {
  const term = normaliseQuery(filters.query);
  return records.filter((product) => {
    const searchable = normaliseQuery(
      [
        product.name,
        product.organisation,
        product.description,
        product.category,
        product.accessModel,
        ...product.capabilities,
      ].join(" "),
    );
    return (
      (!term || searchable.includes(term)) &&
      (filters.category === "all" ||
        product.categoryId === filters.category) &&
      (filters.evidence === "all" ||
        product.evidence.includes(filters.evidence as EvidenceStatus)) &&
      (filters.country === "all" ||
        product.deploymentCountries.includes(filters.country)) &&
      (filters.origin === "all" ||
        product.origin === (filters.origin as OriginClassification)) &&
      (filters.lifecycle === "all" ||
        product.lifecycle === (filters.lifecycle as ProductLifecycle)) &&
      (filters.access === "all" || product.accessModel === filters.access)
    );
  });
}

export function sortProducts(records: Product[], sort: ProductSort) {
  return [...records].sort((a, b) => {
    if (sort === "organisation")
      return a.organisation.localeCompare(b.organisation);
    if (sort === "category") return a.category.localeCompare(b.category);
    if (sort === "checked") return b.lastChecked.localeCompare(a.lastChecked);
    return a.name.localeCompare(b.name);
  });
}

export function paginate<T>(records: T[], requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return {
    items: records.slice(start, start + pageSize),
    page,
    pageSize,
    total: records.length,
    totalPages,
  };
}

export function normaliseQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("pay-as-you-go", "paygo")
    .replaceAll("pay as you go", "paygo")
    .replaceAll("commercial and industrial", "c&i")
    .replaceAll("advanced metering", "ami");
}
