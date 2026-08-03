import brandAssetData from "../../data/brand-assets/organisations.json";
import productBrandAssetData from "../../data/brand-assets/products.json";
import { normaliseQuery } from "@/lib/registry-query";

export type BrandAsset = {
  organisationId: string;
  name: string;
  aliases: string[];
  localPath: string;
  sourcePageUrl: string;
  assetSourceUrl: string;
};

export const organisationBrandAssets = brandAssetData.assets as BrandAsset[];

export type ProductBrandAsset = {
  productId: string;
  name: string;
  localPath: string;
  sourcePageUrl: string;
  assetSourceUrl: string;
};

export const productBrandAssets = productBrandAssetData.assets as ProductBrandAsset[];

const byOrganisationId = new Map(
  organisationBrandAssets.map((asset) => [asset.organisationId, asset]),
);
const byProductId = new Map(
  productBrandAssets.map((asset) => [asset.productId, asset]),
);

const byExactAlias = new Map<string, BrandAsset>();
for (const asset of organisationBrandAssets) {
  for (const alias of [asset.name, ...asset.aliases]) {
    byExactAlias.set(normaliseQuery(alias), asset);
  }
}

export function brandAssetForOrganisation(organisationId: string) {
  return byOrganisationId.get(organisationId);
}

export function brandAssetForProduct(productId: string) {
  return byProductId.get(productId);
}

export function brandAssetForExactName(name?: string) {
  return name ? byExactAlias.get(normaliseQuery(name)) : undefined;
}
