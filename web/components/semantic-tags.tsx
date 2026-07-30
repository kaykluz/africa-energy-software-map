import {
  evidenceLabels,
  originLabels,
  type EvidenceStatus,
  type OriginClassification,
} from "@/lib/registry-data";

export function EvidenceStatusLabel({
  status,
  compact = false,
}: {
  status: EvidenceStatus;
  compact?: boolean;
}) {
  return (
    <span className={`semantic-tag evidence-tag ${compact ? "compact" : ""}`}>
      {evidenceLabels[status]}
    </span>
  );
}

export function LifecycleTag({ value }: { value: string }) {
  return (
    <span className="semantic-tag lifecycle-tag">
      {value.charAt(0).toUpperCase() + value.slice(1)}
    </span>
  );
}

export function OriginLabel({
  value,
}: {
  value: OriginClassification;
}) {
  return (
    <span className="origin-label">
      <span aria-hidden="true" className="origin-mark" />
      {originLabels[value]}
    </span>
  );
}

export function Freshness({
  date,
  stale = false,
}: {
  date: string;
  stale?: boolean;
}) {
  return (
    <span className={stale ? "freshness stale" : "freshness"}>
      {stale ? "Stale — last checked " : "Last checked "}
      {date}
    </span>
  );
}

export function MarketCondition({
  value,
  text,
}: {
  value: string;
  text: string;
}) {
  return (
    <span className="market-condition">
      <span
        aria-hidden="true"
        className={`market-dot market-${value}`}
      />
      {text}
    </span>
  );
}
