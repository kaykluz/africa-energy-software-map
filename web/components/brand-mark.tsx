import Image from "next/image";
import {
  brandAssetForExactName,
  brandAssetForOrganisation,
  brandAssetForProduct,
} from "@/lib/brand-assets";

export function OrganisationMark({
  className = "",
  name,
  organisationId,
  size = 72,
}: {
  className?: string;
  name: string;
  organisationId: string;
  size?: number;
}) {
  const organisationAsset = brandAssetForOrganisation(organisationId);
  const nameMatchedAsset = organisationAsset ? undefined : brandAssetForExactName(name);
  const asset = organisationAsset ?? nameMatchedAsset;
  if (asset) {
    return (
      <span
        className={`organisation-mark has-logo ${className}`.trim()}
        data-brand-source={organisationAsset ? "organisation" : "name-match"}
        style={{ height: size, width: size }}
        title={`${name} identity`}
      >
        <Image
          alt={`${name} logo`}
          height={size}
          src={asset.localPath}
          unoptimized
          width={size}
        />
      </span>
    );
  }
  const initials = markInitials(name);
  return (
    <span
      aria-hidden="true"
      className={`organisation-mark is-type ${className}`.trim()}
      data-brand-source="type"
      style={{ height: size, width: size }}
      title="Logo not yet added"
    >
      {initials}
    </span>
  );
}

export function ProductMark({
  className = "",
  organisationId,
  organisationName,
  productId,
  productName,
  size = 48,
}: {
  className?: string;
  organisationId: string;
  organisationName: string;
  productId: string;
  productName: string;
  size?: number;
}) {
  const productAsset = brandAssetForProduct(productId);
  const organisationAsset = brandAssetForOrganisation(organisationId)
    ?? brandAssetForExactName(organisationName);
  const asset = productAsset ?? organisationAsset;
  if (asset) {
    const inherited = !productAsset && Boolean(organisationAsset);
    return (
      <span
        className={`organisation-mark product-mark has-logo ${className}`.trim()}
        data-brand-source={inherited ? "organisation" : "product"}
        style={{ height: size, width: size }}
        title={inherited ? `${organisationName} identity` : `${productName} identity`}
      >
        <Image
          alt=""
          height={size}
          src={asset.localPath}
          unoptimized
          width={size}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`organisation-mark product-mark is-type ${className}`.trim()}
      data-brand-source="type"
      style={{ height: size, width: size }}
    >
      {markInitials(productName)}
    </span>
  );
}

function markInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
