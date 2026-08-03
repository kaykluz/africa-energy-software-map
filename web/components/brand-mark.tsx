import Image from "next/image";
import { brandAssetForOrganisation } from "@/lib/brand-assets";

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
  const asset = brandAssetForOrganisation(organisationId);
  if (asset) {
    return (
      <span className={`organisation-mark has-logo ${className}`.trim()}>
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
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`organisation-mark is-type ${className}`.trim()}
    >
      {initials}
    </span>
  );
}
