"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusRecord = {
  id: string;
  type: string;
  status: string;
  statusLabel: string;
  submittedAt: string;
  updatedAt: string;
};

export function ContributionStatus({
  id,
  token,
}: {
  id: string;
  token: string;
}) {
  const [record, setRecord] = useState<StatusRecord | null>(null);
  const [error, setError] = useState(
    token ? "" : "This status link is incomplete.",
  );

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(
      `/api/contributions/${encodeURIComponent(id)}?token=${encodeURIComponent(
        token,
      )}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const result = (await response.json()) as
          | StatusRecord
          | { error?: { message?: string } };
        if (!response.ok) {
          throw new Error(
            "error" in result
              ? result.error?.message
              : "The receipt could not be loaded.",
          );
        }
        setRecord(result as StatusRecord);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "The receipt could not be loaded.",
          );
        }
      });
    return () => controller.abort();
  }, [id, token]);

  return (
    <main className="form-page reading-width" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/contribute">Contribute</Link>
        <span aria-hidden="true">/</span>
        <span>Status</span>
      </nav>
      <div className="submission-success contribution-status" aria-live="polite">
        <span className="eyebrow">Contribution receipt</span>
        <h1>{record ? record.statusLabel : error ? "Receipt unavailable" : "Checking status…"}</h1>
        {record ? (
          <>
            <p>
              A human editor controls every status change. Acceptance does not
              automatically publish or verify a record.
            </p>
            <dl>
              <div><dt>Submission ID</dt><dd className="mono">{record.id}</dd></div>
              <div><dt>Type</dt><dd>{label(record.type)}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDate(record.submittedAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatDate(record.updatedAt)}</dd></div>
            </dl>
          </>
        ) : null}
        {error ? <p className="submission-error">{error}</p> : null}
        <div>
          <Link className="button button-primary" href="/contribute">Contribute</Link>
          <Link className="button button-outline" href="/directory">Open Data</Link>
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function label(value: string) {
  return {
    product: "New product",
    deployment: "Deployment evidence",
    correction: "Correction",
    claim: "Profile claim",
  }[value] ?? "Contribution";
}
