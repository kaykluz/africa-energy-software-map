"use client";

import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AssertionReviewRecord,
  ModerationContribution,
  SourceReviewRecord,
} from "@/db/reviews";
import type { OperationsStatus } from "@/db/operations";
import type {
  BulkImportRecord,
  BulkImportRowRecord,
} from "@/db/bulk-imports";
import type {
  BulkAmendableField,
  BulkRowDecision,
  BulkRowReviewRecord,
} from "@/db/bulk-reviews";
import type {
  OrganisationCatalogueAmendableField,
  OrganisationCatalogueDecision,
  OrganisationCatalogueReviewRecord,
} from "@/db/organisation-catalogue-reviews";
import { parseBulkWorkbook } from "@/lib/bulk-xlsx-client";
import type { OrganisationCatalogueRecord } from "@/lib/organisation-catalogue";
import type {
  ReviewAssertion,
} from "@/lib/review-data";
import {
  reviewDecisions,
  reviewEvidenceOptions,
} from "@/lib/review-data";
import type { Source } from "@/lib/registry-data";

type WorkspaceState = {
  assertionReviews: AssertionReviewRecord[];
  promotedAssertions: ReviewAssertion[];
  promotedSources: Source[];
  sourceReviews: SourceReviewRecord[];
  contributions: ModerationContribution[];
  operations: OperationsStatus;
  bulkImports: BulkImportRecord[];
  organisationCatalogueReviews: OrganisationCatalogueReviewRecord[];
};

type Tab =
  | "assertions"
  | "sources"
  | "organisations"
  | "contributions"
  | "bulk"
  | "operations";
type AssertionFilter =
  | "all"
  | "pending"
  | "accept"
  | "amend"
  | "reject"
  | "needs_evidence";
type ApiError = { error: { message?: string; details?: string[] } };
type ReviewCataloguePage = {
  counts: { total: number; reviewedMatches: number; needsReview: number; africaHeadquartered: number };
  decisions: number;
  reconciledOrDecided: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  records: Array<{
    record: OrganisationCatalogueRecord;
    review: OrganisationCatalogueReviewRecord | null;
  }>;
  options: { roles: string[]; segments: string[] };
};
type BulkReviewSaveResult = {
  review: BulkRowReviewRecord;
  status: string;
  promotedAssertionCount: number;
  importStatus: string;
  importVersion: number;
};
type BulkRecordType =
  | "organisation"
  | "product"
  | "deployment"
  | "organisation_alias"
  | "organisation_relationship"
  | "organisation_software_relationship"
  | "organisation_presence";

const bulkRecordTypeOptions: Array<{
  value: "all" | BulkRecordType;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "organisation", label: "Organisations" },
  { value: "product", label: "Products" },
  { value: "deployment", label: "Deployments" },
  { value: "organisation_alias", label: "Aliases" },
  { value: "organisation_relationship", label: "Relationships" },
  { value: "organisation_software_relationship", label: "Software links" },
  { value: "organisation_presence", label: "Country presence" },
];

export function ReviewWorkspace({
  assertions,
  sources,
  manifest,
  organisationCatalogueSummary,
  batchId,
  reviewer,
  signOutHref,
}: {
  assertions: ReviewAssertion[];
  sources: Source[];
  manifest: {
    reviewGate: {
      assertions: number;
      unresolvedSources: number;
      publishable: boolean;
    };
    counts: {
      organisations: number;
      products: number;
      deployments: number;
      sources: number;
      assertions: number;
    };
  };
  organisationCatalogueSummary: {
    total: number;
    reviewedMatches: number;
    needsReview: number;
    africaHeadquartered: number;
  };
  batchId: string;
  reviewer: { displayName: string; email: string };
  signOutHref: string;
}) {
  const [tab, setTab] = useState<Tab>("assertions");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeAssertionId, setActiveAssertionId] = useState(
    assertions[0]?.id ?? "",
  );
  const [activeSourceId, setActiveSourceId] = useState(
    sources.find((source) => source.sourceLicense === "unknown")?.id ??
      sources[0]?.id ??
      "",
  );
  const [activeContributionId, setActiveContributionId] = useState("");
  const [assertionFilter, setAssertionFilter] =
    useState<AssertionFilter>("pending");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/review/workspace", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as
          | WorkspaceState
          | { error?: { message?: string } };
        if (!response.ok) {
          throw new Error(
            "error" in result
              ? result.error?.message
              : "The review queue could not be loaded.",
          );
        }
        setWorkspace(result as WorkspaceState);
        setLoadError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "The review queue could not be loaded.",
          );
        }
      });
    return () => controller.abort();
  }, [refreshKey]);

  const assertionReviewMap = useMemo(
    () =>
      new Map(
        (workspace?.assertionReviews ?? []).map((review) => [
          review.assertionId,
          review,
        ]),
      ),
    [workspace],
  );
  const sourceReviewMap = useMemo(
    () =>
      new Map(
        (workspace?.sourceReviews ?? []).map((review) => [
          review.sourceId,
          review,
        ]),
      ),
    [workspace],
  );
  const combinedAssertions = useMemo(() => {
    const values = new Map(assertions.map((assertion) => [assertion.id, assertion]));
    for (const assertion of workspace?.promotedAssertions ?? []) {
      values.set(assertion.id, assertion);
    }
    return Array.from(values.values());
  }, [assertions, workspace?.promotedAssertions]);
  const combinedSources = useMemo(() => {
    const values = new Map(sources.map((source) => [source.id, source]));
    for (const source of workspace?.promotedSources ?? []) {
      values.set(source.id, source);
    }
    return Array.from(values.values());
  }, [sources, workspace?.promotedSources]);
  const reviewedAssertions = combinedAssertions.filter((assertion) =>
    assertionReviewMap.has(assertion.id),
  ).length;
  const resolvedSources = combinedSources.filter((source) => {
    if (source.sourceLicense !== "unknown") return true;
    return ["resolved", "exclude"].includes(
      sourceReviewMap.get(source.id)?.rightsStatus ?? "",
    );
  }).length;
  const openContributions = (workspace?.contributions ?? []).filter(
    (record) =>
      !["accepted", "rejected", "duplicate", "withdrawn"].includes(
        record.status,
      ),
  ).length;
  const progress = combinedAssertions.length
    ? Math.round((reviewedAssertions / combinedAssertions.length) * 100)
    : 0;
  const assertionsPending = combinedAssertions.length - reviewedAssertions;
  const heldCandidateRows = (workspace?.bulkImports ?? []).reduce(
    (total, record) => total + record.decisionCounts.needsEvidence,
    0,
  );
  const organisationCatalogueReviewMap = useMemo(
    () =>
      new Map(
        (workspace?.organisationCatalogueReviews ?? []).map((review) => [
          review.candidateId,
          review,
        ]),
      ),
    [workspace?.organisationCatalogueReviews],
  );
  const organisationCatalogueDecided =
    organisationCatalogueSummary.reviewedMatches +
    organisationCatalogueReviewMap.size;
  const organisationCataloguePending = Math.max(
    0,
    organisationCatalogueSummary.total - organisationCatalogueDecided,
  );
  const releaseReady =
    manifest.reviewGate.publishable &&
    assertionsPending === 0 &&
    resolvedSources === combinedSources.length;
  const activeAssertion =
    combinedAssertions.find((assertion) => assertion.id === activeAssertionId) ??
    combinedAssertions[0];
  const activeSource =
    combinedSources.find((source) => source.id === activeSourceId) ??
    combinedSources[0];
  const contributions = workspace?.contributions ?? [];
  const activeContribution =
    contributions.find(
      (contribution) => contribution.id === activeContributionId,
    ) ?? contributions[0];

  function replaceAssertionReview(review: AssertionReviewRecord | null) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      assertionReviews: review
        ? [
            review,
            ...workspace.assertionReviews.filter(
              (item) => item.assertionId !== review.assertionId,
            ),
          ]
        : workspace.assertionReviews.filter(
            (item) => item.assertionId !== activeAssertionId,
          ),
    });
  }

  function replaceSourceReview(review: SourceReviewRecord) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      sourceReviews: [
        review,
        ...workspace.sourceReviews.filter(
          (item) => item.sourceId !== review.sourceId,
        ),
      ],
    });
  }

  function replaceContribution(
    contributionId: string,
    status: string,
    updatedAt: string,
  ) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      contributions: workspace.contributions.map((item) =>
        item.id === contributionId ? { ...item, status, updatedAt } : item,
      ),
    });
  }

  function replaceOperations(operations: OperationsStatus) {
    if (!workspace) return;
    setWorkspace({ ...workspace, operations });
  }

  function replaceOrganisationCatalogueReview(
    review: OrganisationCatalogueReviewRecord,
  ) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      organisationCatalogueReviews: [
        review,
        ...workspace.organisationCatalogueReviews.filter(
          (item) => item.candidateId !== review.candidateId,
        ),
      ],
    });
  }

  function addBulkImport(record: BulkImportRecord) {
    if (!workspace) return;
    setWorkspace({
      ...workspace,
      bulkImports: [
        record,
        ...workspace.bulkImports.filter((item) => item.id !== record.id),
      ],
    });
  }

  async function downloadReviewPackage() {
    setExporting(true);
    setExportError("");
    try {
      const response = await fetch("/api/review/export", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Package download failed (${response.status}).`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = exportFilename(
        response.headers.get("content-disposition"),
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (reason) {
      setExportError(
        reason instanceof Error
          ? reason.message
          : "The review package could not be downloaded.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="review-page" id="main-content" tabIndex={-1}>
      <header className="review-header">
        <div>
          <div className="review-header-line">
            <span className="review-live-dot" aria-hidden="true" />
            <span>Private workspace</span>
            <span className="mono">{shortBatch(batchId)}</span>
          </div>
          <h1>Review</h1>
        </div>
        <div className="review-identity">
          <span>{reviewer.displayName}</span>
          <small>{reviewer.email}</small>
        </div>
        <div className="review-header-actions">
          <Link className="button button-outline" href={signOutHref}>
            Sign out
          </Link>
          <button
            className="button button-outline"
            onClick={() => setRefreshKey((value) => value + 1)}
            type="button"
          >
            Refresh
          </button>
          <button
            className="button button-primary"
            disabled={exporting}
            onClick={downloadReviewPackage}
            type="button"
          >
            {exporting ? "Preparing…" : "Download package"}
          </button>
        </div>
      </header>

      <section aria-label="Review progress" className="review-scoreboard">
        <div className="review-progress-card">
          <div
            aria-label={`${progress}% of assertions decided`}
            className="review-progress-ring"
            style={{ "--review-progress": `${progress * 3.6}deg` } as React.CSSProperties}
          >
            <strong>{progress}%</strong>
          </div>
          <div>
            <span>Assertions</span>
            <strong>
              {reviewedAssertions}<small> / {combinedAssertions.length}</small>
            </strong>
          </div>
        </div>
        <Metric
          label="Source rights"
          note={`${combinedSources.length - resolvedSources} unresolved`}
          value={`${resolvedSources}/${combinedSources.length}`}
        />
        <Metric
          label="Contributions"
          note={
            workspace
              ? workspace.operations.intakePaused
                ? "intake paused"
                : "intake active"
              : "loading"
          }
          value={workspace ? String(openContributions) : "—"}
        />
        <Metric
          label="Release"
          note={
            assertionsPending
              ? `${assertionsPending} assertions pending`
              : resolvedSources < combinedSources.length
                ? `${combinedSources.length - resolvedSources} source rights pending`
                : heldCandidateRows
                  ? `${heldCandidateRows} candidates held out`
                  : organisationCataloguePending
                    ? `core ready · ${organisationCataloguePending.toLocaleString()} catalogue listings open`
                    : "review package only"
          }
          value={releaseReady ? "Ready" : "Held"}
        />
      </section>

      {loadError ? (
        <div className="review-global-error" role="alert">
          <span>{loadError}</span>
          <button onClick={() => setRefreshKey((value) => value + 1)} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {exportError ? (
        <div className="review-global-error" role="alert">
          <span>{exportError}</span>
          <button onClick={downloadReviewPackage} type="button">
            Try again
          </button>
        </div>
      ) : null}

      <nav aria-label="Review queues" className="review-tabs">
        <TabButton
          active={tab === "assertions"}
          count={combinedAssertions.length}
          label="Assertions"
          onClick={() => setTab("assertions")}
        />
        <TabButton
          active={tab === "sources"}
          count={combinedSources.length}
          label="Sources"
          onClick={() => setTab("sources")}
        />
        <TabButton
          active={tab === "organisations"}
          count={organisationCatalogueSummary.total}
          label="Organisations"
          onClick={() => setTab("organisations")}
        />
        <TabButton
          active={tab === "contributions"}
          count={contributions.length}
          label="Contributions"
          onClick={() => setTab("contributions")}
        />
        <TabButton
          active={tab === "bulk"}
          count={workspace?.bulkImports.length ?? 0}
          label="Bulk"
          onClick={() => setTab("bulk")}
        />
        <TabButton
          active={tab === "operations"}
          count={
            workspace
              ? workspace.operations.expiredContacts +
                Number(workspace.operations.intakePaused)
              : 0
          }
          label="Operations"
          onClick={() => setTab("operations")}
        />
      </nav>

      {workspace && reviewedAssertions === combinedAssertions.length ? (
        <ReviewNextStep
          allSourcesResolved={resolvedSources === combinedSources.length}
          exporting={exporting}
          heldCandidateRows={heldCandidateRows}
          onDownload={downloadReviewPackage}
          onOpenSources={() => setTab("sources")}
        />
      ) : null}

      {tab === "assertions" ? (
        <AssertionsWorkspace
          active={activeAssertion}
          assertions={combinedAssertions}
          filter={assertionFilter}
          onFilter={setAssertionFilter}
          onReviewSaved={replaceAssertionReview}
          onSelect={setActiveAssertionId}
          query={query}
          reviewMap={assertionReviewMap}
          setQuery={setQuery}
        />
      ) : null}

      {tab === "sources" ? (
        <SourcesWorkspace
          active={activeSource}
          onReviewSaved={replaceSourceReview}
          onSelect={setActiveSourceId}
          reviewMap={sourceReviewMap}
          sources={combinedSources}
        />
      ) : null}

      {tab === "organisations" && workspace ? (
        <OrganisationCatalogueWorkspace
          decided={organisationCatalogueDecided}
          onSaved={replaceOrganisationCatalogueReview}
          summary={organisationCatalogueSummary}
        />
      ) : null}

      {tab === "contributions" ? (
        <ContributionsWorkspace
          active={activeContribution}
          contributions={contributions}
          onSelect={setActiveContributionId}
          onStatusSaved={replaceContribution}
        />
      ) : null}

      {tab === "bulk" && workspace ? (
        <BulkImportPanel
          imports={workspace.bulkImports}
          onImported={addBulkImport}
          onWorkspaceRefresh={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}

      {tab === "operations" && workspace ? (
        <OperationsPanel
          onSaved={replaceOperations}
          operations={workspace.operations}
        />
      ) : null}
    </main>
  );
}

function ReviewNextStep({
  allSourcesResolved,
  exporting,
  heldCandidateRows,
  onDownload,
  onOpenSources,
}: {
  allSourcesResolved: boolean;
  exporting: boolean;
  heldCandidateRows: number;
  onDownload: () => void;
  onOpenSources: () => void;
}) {
  return (
    <section className="review-next-step">
      <div>
        <strong>
          {allSourcesResolved ? "Review package ready" : "Assertions complete"}
        </strong>
        <span>
          {allSourcesResolved
            ? heldCandidateRows
              ? `The approved set is ready. ${heldCandidateRows} candidates remain held for evidence.`
              : "Download the package for the reviewed data pull request."
            : "Resolve source rights before preparing the release."}
        </span>
      </div>
      {allSourcesResolved ? (
        <button
          className="button button-primary"
          disabled={exporting}
          onClick={onDownload}
          type="button"
        >
          {exporting ? "Preparing…" : "Download package"}
        </button>
      ) : (
        <button
          className="button button-primary"
          onClick={onOpenSources}
          type="button"
        >
          Review sources
        </button>
      )}
    </section>
  );
}

function OrganisationCatalogueWorkspace({
  decided,
  summary,
  onSaved,
}: {
  decided: number;
  summary: { total: number; reviewedMatches: number; needsReview: number; africaHeadquartered: number };
  onSaved: (review: OrganisationCatalogueReviewRecord) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("pending");
  const [role, setRole] = useState("all");
  const [segment, setSegment] = useState("all");
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState("");
  const [result, setResult] = useState<ReviewCataloguePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ status, page: String(page), pageSize: "40" });
      if (query.trim()) params.set("q", query.trim());
      if (role !== "all") params.set("role", role);
      if (segment !== "all") params.set("segment", segment);
      fetch(`/api/review/organisation-catalogue?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const value = (await response.json()) as ReviewCataloguePage | ApiError;
          if (!response.ok || "error" in value) {
            throw new Error("error" in value ? value.error?.message : "The organisation queue could not be loaded.");
          }
          setResult(value);
          setActiveId((current) =>
            value.records.some((item) => item.record.id === current)
              ? current
              : value.records[0]?.record.id ?? "",
          );
          setError("");
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "The organisation queue could not be loaded.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, query ? 180 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [page, query, refreshKey, role, segment, status]);

  const activeItem = result?.records.find((item) => item.record.id === activeId) ?? result?.records[0];
  const active = activeItem?.record;

  function resetPage() {
    setPage(1);
  }

  return (
    <section className="review-catalogue-section">
      <header className="review-catalogue-header">
        <div>
          <span>Inclusion catalogue</span>
          <h2>{summary.total.toLocaleString()} organisations</h2>
          <p>
            {decided.toLocaleString()} reconciled or decided ·{" "}
            {(summary.total - decided).toLocaleString()} awaiting review
          </p>
        </div>
        <div className="review-catalogue-boundary">
          <strong>Listed ≠ reviewed</strong>
          <span>Identity, source, roles, markets and relationships are checked here before release promotion.</span>
        </div>
      </header>

      <div className="review-catalogue-filters">
        <label>
          <span className="sr-only">Search organisation candidates</span>
          <input
            onChange={(event) => { setQuery(event.target.value); resetPage(); }}
            placeholder={`Search ${summary.total.toLocaleString()} organisations`}
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Filter organisation review status"
          onChange={(event) => { setStatus(event.target.value); resetPage(); }}
          value={status}
        >
          <option value="pending">Awaiting review</option>
          <option value="decided">Decided in workspace</option>
          <option value="reviewed">Matched to reviewed release</option>
          <option value="accept">Accepted</option>
          <option value="amend">Amended</option>
          <option value="needs_evidence">More evidence</option>
          <option value="duplicate">Duplicate</option>
          <option value="reject">Rejected</option>
          <option value="all">All</option>
        </select>
        <select
          aria-label="Filter by organisation role"
          onChange={(event) => { setRole(event.target.value); resetPage(); }}
          value={role}
        >
          <option value="all">All roles</option>
          {(result?.options.roles ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          aria-label="Filter by market segment"
          onChange={(event) => { setSegment(event.target.value); resetPage(); }}
          value={segment}
        >
          <option value="all">All markets</option>
          {(result?.options.segments ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <span>{loading ? "Loading…" : `${(result?.total ?? 0).toLocaleString()} shown`}</span>
      </div>

      {error ? <div className="review-global-error" role="alert">{error}</div> : null}

      <div className="review-catalogue-workspace">
        <aside aria-label="Organisation candidates" className="review-catalogue-list">
          {(result?.records ?? []).map(({ record, review }) => {
            return (
              <button
                aria-current={record.id === active?.id ? "true" : undefined}
                key={record.id}
                onClick={() => setActiveId(record.id)}
                type="button"
              >
                <span>
                  <strong>{record.name}</strong>
                  <small>{record.primaryRole || record.organisationType || "Role not classified"}</small>
                </span>
                <i data-status={review?.decision ?? record.reviewState}>
                  {review
                    ? catalogueDecisionLabel(review.decision)
                    : record.reviewState === "reviewed"
                      ? "Reviewed"
                      : "Open"}
                </i>
              </button>
            );
          })}
          {!loading && !result?.records.length ? <p className="review-catalogue-empty">No matching organisations.</p> : null}
          {(result?.pageCount ?? 1) > 1 ? (
            <nav aria-label="Organisation candidate pages" className="review-catalogue-pagination">
              <button disabled={result?.page === 1 || loading} onClick={() => setPage((result?.page ?? 1) - 1)} type="button">Previous</button>
              <span>{result?.page} / {result?.pageCount}</span>
              <button disabled={result?.page === result?.pageCount || loading} onClick={() => setPage((result?.page ?? 1) + 1)} type="button">Next</button>
            </nav>
          ) : null}
        </aside>

        {active ? (
          <article className="review-catalogue-detail">
            <header>
              <div>
                <span>{active.workbookId} · row {active.sourceRow}</span>
                <h2>{active.name}</h2>
                <p>{[active.primaryRole, active.headquartersCountry].filter(Boolean).join(" · ")}</p>
              </div>
              {active.reconciliation.status === "reviewed_match" ? (
                <Link href={active.reconciliation.canonicalHref}>Open reviewed record ↗</Link>
              ) : active.website ? (
                <a href={active.website} rel="noreferrer" target="_blank">Website ↗</a>
              ) : null}
            </header>
            <CatalogueFacts record={active} />
            {active.reviewState === "reviewed" ? (
              <div className="review-catalogue-reviewed-note">
                <strong>Already reconciled</strong>
                <span>This listing matches an organisation in the reviewed release.</span>
              </div>
            ) : (
              <OrganisationCatalogueReviewForm
                key={`${active.id}-${activeItem?.review?.version ?? 0}`}
                onSaved={(review) => {
                  onSaved(review);
                  setRefreshKey((value) => value + 1);
                }}
                record={active}
                review={activeItem?.review ?? null}
              />
            )}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function CatalogueFacts({ record }: { record: OrganisationCatalogueRecord }) {
  const facts = [
    ["Actor roles", record.roles.join(" · ")],
    ["Energy markets", record.segments.join(" · ")],
    ["Countries", record.countriesActive.join(" · ")],
    ["Parent / group", record.parent],
    ["Technologies", record.technologies.join(" · ")],
    ["Status", record.lifecycle],
    ["Evidence", `${record.confidence} · ${record.inclusionBasis}`],
    ["Last checked", record.lastReviewed],
  ].filter(([, value]) => value);
  return (
    <dl className="review-catalogue-facts">
      {facts.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
      {record.description ? <div className="wide"><dt>Description</dt><dd>{record.description}</dd></div> : null}
      {record.coverageNotes ? <div className="wide"><dt>Coverage note</dt><dd>{record.coverageNotes}</dd></div> : null}
      <div className="wide">
        <dt>Primary source</dt>
        <dd>
          {record.sourceUrl ? (
            <a href={record.sourceUrl} rel="noreferrer" target="_blank">{record.sourceUrl} ↗</a>
          ) : "No direct URL supplied"}
        </dd>
      </div>
    </dl>
  );
}

function OrganisationCatalogueReviewForm({
  record,
  review,
  onSaved,
}: {
  record: OrganisationCatalogueRecord;
  review: OrganisationCatalogueReviewRecord | null;
  onSaved: (review: OrganisationCatalogueReviewRecord) => void;
}) {
  const [decision, setDecision] = useState<OrganisationCatalogueDecision>(review?.decision ?? "accept");
  const [sourceUrl, setSourceUrl] = useState(review?.normalizedSourceUrl ?? record.sourceUrl ?? record.website);
  const [sourceOpened, setSourceOpened] = useState(Boolean(review?.sourceOpened));
  const [identityConfirmed, setIdentityConfirmed] = useState(Boolean(review?.identityConfirmed));
  const [classificationsConfirmed, setClassificationsConfirmed] = useState(Boolean(review?.classificationsConfirmed));
  const [safetyChecked, setSafetyChecked] = useState(Boolean(review?.safetyChecked));
  const [notes, setNotes] = useState(review?.notes ?? "");
  const [amendField, setAmendField] = useState<OrganisationCatalogueAmendableField>(
    (Object.keys(review?.amendments ?? {})[0] as OrganisationCatalogueAmendableField) || "name",
  );
  const [amendValue, setAmendValue] = useState(
    Object.values(review?.amendments ?? {})[0] ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/review/organisation-catalogue/${encodeURIComponent(record.id)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            decision,
            amendments: decision === "amend" && amendValue.trim()
              ? { [amendField]: amendValue.trim() }
              : {},
            sourceUrl,
            sourceOpened,
            identityConfirmed,
            classificationsConfirmed,
            safetyChecked,
            notes,
            expectedVersion: review?.version ?? 0,
          }),
        },
      );
      const result = (await response.json()) as OrganisationCatalogueReviewRecord | ApiError;
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error?.message : "The review could not be saved.");
      }
      onSaved(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The review could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="review-catalogue-form" onSubmit={submit}>
      <fieldset>
        <legend>Decision</legend>
        {(["accept", "amend", "needs_evidence", "duplicate", "reject"] as OrganisationCatalogueDecision[]).map((value) => (
          <label key={value}>
            <input checked={decision === value} name={`decision-${record.id}`} onChange={() => setDecision(value)} type="radio" />
            <span>{catalogueDecisionLabel(value)}</span>
          </label>
        ))}
      </fieldset>
      {decision === "amend" ? (
        <div className="review-catalogue-amendment">
          <label>
            <span>Field to correct</span>
            <select onChange={(event) => setAmendField(event.target.value as OrganisationCatalogueAmendableField)} value={amendField}>
              <option value="name">Name</option>
              <option value="website">Website</option>
              <option value="parent">Parent / group</option>
              <option value="primaryRole">Primary role</option>
              <option value="roles">Roles</option>
              <option value="segments">Energy markets</option>
              <option value="headquartersCountry">HQ country</option>
              <option value="countriesActive">Countries active</option>
              <option value="lifecycle">Status</option>
              <option value="description">Description</option>
              <option value="sourceUrl">Source URL</option>
              <option value="confidence">Confidence</option>
              <option value="coverageNotes">Coverage note</option>
            </select>
          </label>
          <label>
            <span>Corrected value</span>
            <textarea onChange={(event) => setAmendValue(event.target.value)} rows={2} value={amendValue} />
          </label>
        </div>
      ) : null}
      <label className="review-catalogue-source-input">
        <span>Direct source URL</span>
        <input onChange={(event) => setSourceUrl(event.target.value)} type="url" value={sourceUrl} />
      </label>
      <div className="review-catalogue-checks">
        <label><input checked={sourceOpened} onChange={(event) => setSourceOpened(event.target.checked)} type="checkbox" />Source opened</label>
        <label><input checked={identityConfirmed} onChange={(event) => setIdentityConfirmed(event.target.checked)} type="checkbox" />Identity checked</label>
        <label><input checked={classificationsConfirmed} onChange={(event) => setClassificationsConfirmed(event.target.checked)} type="checkbox" />Roles and markets checked</label>
        <label><input checked={safetyChecked} onChange={(event) => setSafetyChecked(event.target.checked)} type="checkbox" />Safe to publish</label>
      </div>
      <label>
        <span>Review note</span>
        <textarea onChange={(event) => setNotes(event.target.value)} placeholder="What did you confirm, change or still need?" rows={3} value={notes} />
      </label>
      {error ? <p className="review-form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={saving} type="submit">
        {saving ? "Saving…" : review ? "Update decision" : "Save decision"}
      </button>
    </form>
  );
}

function BulkImportPanel({
  imports,
  onImported,
  onWorkspaceRefresh,
}: {
  imports: BulkImportRecord[];
  onImported: (record: BulkImportRecord) => void;
  onWorkspaceRefresh: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const [activeImportId, setActiveImportId] = useState("");
  const [rows, setRows] = useState<BulkImportRowRecord[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState("");
  const [rowQuery, setRowQuery] = useState("");
  const [rowType, setRowType] = useState<"all" | BulkRecordType>("all");
  const [batchFilter, setBatchFilter] = useState<number | "all">("all");
  const activeImport = imports.find((record) => record.id === activeImportId);
  const decidedRows = rows.filter((row) => row.review).length;
  const promotedAssertions = rows.reduce(
    (total, row) => total + row.promotedAssertionCount,
    0,
  );
  const visibleRows = useMemo(() => {
    const needle = rowQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (rowType !== "all" && row.recordType !== rowType) return false;
      const batch = activeImport?.batches.find((item) =>
        item.rowKeys.includes(row.rowKey),
      )?.number;
      if (batchFilter !== "all" && batch !== batchFilter) return false;
      if (!needle) return true;
      const value = row.effectivePayload;
      return [
        row.rowKey,
        value.organisation_name,
        value.product_name,
        value.organisation_alias,
        value.related_organisation_id,
        value.organisation_software_relationship_type,
        value.existing_product_id,
        value.primary_organisation_role_id,
        value.organisation_segment_ids,
        value.customer_name,
        value.deployment_country_iso2,
        value.organisation_presence_country_iso2,
        value.organisation_presence_type,
        value.country_of_origin,
        value.source_publisher,
        value.primary_category_id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activeImport?.batches, batchFilter, rowQuery, rowType, rows]);

  async function toggleRows(record: BulkImportRecord) {
    if (record.id === activeImportId) {
      setActiveImportId("");
      setRows([]);
      setRowsError("");
      return;
    }
    setActiveImportId(record.id);
    setRows([]);
    setRowsError("");
    setRowQuery("");
    setRowType("all");
    setBatchFilter("all");
    setRowsLoading(true);
    try {
      const response = await fetch(
        `/api/review/bulk-import-rows?importId=${encodeURIComponent(record.id)}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as
        | BulkImportRowRecord[]
        | ApiError;
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(
          !Array.isArray(result)
            ? result.error?.message
            : "The candidate rows could not be loaded.",
        );
      }
      setRows(result);
    } catch (reason) {
      setRowsError(
        reason instanceof Error
          ? reason.message
          : "The candidate rows could not be loaded.",
      );
    } finally {
      setRowsLoading(false);
    }
  }

  function replaceRow(row: BulkImportRowRecord) {
    setRows((current) =>
      current.map((item) => (item.id === row.id ? row : item)),
    );
    onWorkspaceRefresh();
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    setDetails([]);
    try {
      const payload = await parseBulkWorkbook(file);
      const response = await fetch("/api/review/bulk-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as BulkImportRecord | ApiError;
      if (!response.ok) {
        if ("error" in result) {
          setDetails(result.error?.details ?? []);
        }
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The workbook could not be imported.",
        );
      }
      onImported(result as BulkImportRecord);
      setFile(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The workbook could not be imported.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="review-bulk">
      <header>
        <div>
          <h2>Bulk intake</h2>
          <p>Organisations, software, deployments and corporate links enter as candidates.</p>
        </div>
        <a
          className="button button-outline"
          download
          href="/downloads/templates/africa-energy-software-map-bulk-import.xlsx"
        >
          Download template
        </a>
      </header>
      <form className="review-bulk-upload" onSubmit={upload}>
        <label>
          <span>Completed workbook</span>
          <input
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <small>The workbook is read locally; only validated rows are sent.</small>
        </label>
        <button
          className="button button-primary"
          disabled={!file || uploading}
          type="submit"
        >
          {uploading ? "Checking…" : "Import to review"}
        </button>
        {error ? (
          <div className="review-form-error" role="alert">
            <strong>{error}</strong>
            {details.slice(0, 8).map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        ) : null}
      </form>
      <div className="review-bulk-list">
        <h3>Recent imports</h3>
        {imports.map((record) => (
          <article key={record.id}>
            <div className="review-bulk-import-summary">
              <div className="review-bulk-import-title">
                <strong>{record.originalFilename}</strong>
                <span>{formatDate(record.uploadedAt)}</span>
              </div>
              <dl>
                <div>
                  <dt>Rows</dt>
                  <dd>{record.rowCount}</dd>
                </div>
                <div>
                  <dt>Entities</dt>
                  <dd>{record.entityCount}</dd>
                </div>
                <div>
                  <dt>Batches</dt>
                  <dd>{record.plannedBatchCount}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{bulkImportStatusLabel(record.status)}</dd>
                </div>
              </dl>
              <button
                aria-controls={`bulk-records-${record.id}`}
                aria-expanded={activeImportId === record.id}
                className="button button-outline"
                onClick={() => void toggleRows(record)}
                type="button"
              >
                {activeImportId === record.id
                  ? "Hide records"
                  : `View ${record.rowCount} records`}
              </button>
            </div>
            {record.warnings.length ? (
              <small>{record.warnings.join(" · ")}</small>
            ) : null}
            {activeImportId === record.id ? (
              <section
                aria-label={`${record.originalFilename} candidate records`}
                className="review-bulk-records"
                id={`bulk-records-${record.id}`}
              >
                <header>
                  <div>
                    <strong>Candidate records</strong>
                    <span>
                      {decidedRows}/{rows.length} decided · {promotedAssertions} assertions
                    </span>
                  </div>
                  <span aria-live="polite">
                    {rowsLoading
                      ? "Loading…"
                      : `${visibleRows.length} shown`}
                  </span>
                </header>
                {rows.length ? (
                  <div
                    aria-label={`${decidedRows} of ${rows.length} candidates decided`}
                    className="review-bulk-progress"
                    role="progressbar"
                    aria-valuemax={rows.length}
                    aria-valuemin={0}
                    aria-valuenow={decidedRows}
                  >
                    <span
                      style={{
                        width: `${Math.round((decidedRows / rows.length) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
                {rowsError ? (
                  <div className="review-form-error" role="alert">
                    <strong>{rowsError}</strong>
                  </div>
                ) : null}
                {!rowsError ? (
                  <>
                    <div
                      aria-label="Review batch"
                      className="review-bulk-batches"
                      role="group"
                    >
                      <button
                        aria-pressed={batchFilter === "all"}
                        onClick={() => setBatchFilter("all")}
                        type="button"
                      >
                        All
                        <small>{decidedRows}/{rows.length}</small>
                      </button>
                      {(activeImport?.batches ?? []).map((batch) => {
                        const batchRows = rows.filter((row) =>
                          batch.rowKeys.includes(row.rowKey),
                        );
                        const batchDecided = batchRows.filter(
                          (row) => row.review,
                        ).length;
                        return (
                          <button
                            aria-pressed={batchFilter === batch.number}
                            key={batch.number}
                            onClick={() => setBatchFilter(batch.number)}
                            type="button"
                          >
                            {batch.number}
                            <small>{batchDecided}/{batchRows.length}</small>
                          </button>
                        );
                      })}
                    </div>
                    <div className="review-bulk-record-tools">
                      <label>
                        <span>Find a record</span>
                        <input
                          onChange={(event) => setRowQuery(event.target.value)}
                          placeholder="Organisation, product, role or country"
                          type="search"
                          value={rowQuery}
                        />
                      </label>
                      <div aria-label="Record type" role="group">
                        {bulkRecordTypeOptions.map(
                          (option) => (
                            <button
                              aria-pressed={rowType === option.value}
                              key={option.value}
                              onClick={() => setRowType(option.value)}
                              type="button"
                            >
                              {option.label}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="review-bulk-record-list">
                      {visibleRows.map((row) => {
                        const batch = activeImport?.batches.find((item) =>
                          item.rowKeys.includes(row.rowKey),
                        )?.number;
                        return (
                          <BulkCandidateRow
                            batch={batch ?? 1}
                            key={`${row.id}-${row.review?.version ?? 0}`}
                            onSaved={replaceRow}
                            row={row}
                          />
                        );
                      })}
                      {!rowsLoading && !visibleRows.length ? (
                        <div className="review-empty-list">
                          <strong>No matching records</strong>
                          <span>Clear the search or change the record type.</span>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}
          </article>
        ))}
        {!imports.length ? (
          <div className="review-empty-list">
            <strong>No bulk imports yet</strong>
            <span>Use the template to stage the first batch.</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type BulkEditField = {
  field: BulkAmendableField;
  label: string;
  wide?: boolean;
};

const sourceEditFields: BulkEditField[] = [
  { field: "source_publisher", label: "Publisher" },
  { field: "source_title", label: "Source title", wide: true },
  { field: "source_locator", label: "Source locator", wide: true },
  { field: "notes", label: "Record notes", wide: true },
];

const bulkEditFieldsByType: Record<BulkRecordType, BulkEditField[]> = {
  organisation: [
    { field: "organisation_name", label: "Organisation" },
    { field: "existing_organisation_id", label: "Existing ID" },
    { field: "organisation_website", label: "Website" },
    { field: "organisation_description", label: "Description", wide: true },
    { field: "country_of_origin", label: "Origin country" },
    { field: "headquarters_country", label: "Headquarters" },
    { field: "origin_classification", label: "Origin class" },
    { field: "organisation_lifecycle_status", label: "Lifecycle" },
    { field: "primary_organisation_role_id", label: "Primary role" },
    { field: "additional_organisation_role_ids", label: "Other roles", wide: true },
    { field: "organisation_sector_ids", label: "Sectors", wide: true },
    { field: "organisation_segment_ids", label: "Segments", wide: true },
  ],
  product: [
    { field: "organisation_name", label: "Organisation" },
    { field: "existing_organisation_id", label: "Existing organisation ID" },
    { field: "product_name", label: "Product" },
    { field: "existing_product_id", label: "Existing product ID" },
    { field: "primary_category_id", label: "Category" },
    { field: "sector_id", label: "Sector" },
    { field: "product_lifecycle_status", label: "Product status" },
  ],
  deployment: [
    { field: "organisation_name", label: "Organisation" },
    { field: "existing_organisation_id", label: "Existing organisation ID" },
    { field: "product_name", label: "Product" },
    { field: "existing_product_id", label: "Existing product ID" },
    { field: "deployment_country_iso2", label: "Deployment country" },
    { field: "customer_name", label: "Customer" },
    { field: "started_year", label: "Started" },
    { field: "deployment_lifecycle_status", label: "Deployment status" },
  ],
  organisation_alias: [
    { field: "existing_organisation_id", label: "Organisation ID" },
    { field: "organisation_alias", label: "Alias" },
    { field: "organisation_alias_type", label: "Alias type" },
    { field: "valid_from", label: "Valid from" },
    { field: "valid_to", label: "Valid to" },
  ],
  organisation_relationship: [
    { field: "existing_organisation_id", label: "Organisation ID" },
    { field: "related_organisation_id", label: "Related organisation ID" },
    { field: "organisation_relationship_type", label: "Relationship" },
    { field: "valid_from", label: "Valid from" },
    { field: "valid_to", label: "Valid to" },
  ],
  organisation_software_relationship: [
    { field: "existing_organisation_id", label: "Organisation ID" },
    { field: "existing_product_id", label: "Product ID" },
    { field: "organisation_software_relationship_type", label: "Software relationship" },
    { field: "valid_from", label: "Valid from" },
    { field: "valid_to", label: "Valid to" },
  ],
  organisation_presence: [
    { field: "existing_organisation_id", label: "Organisation ID" },
    { field: "organisation_presence_country_iso2", label: "Country" },
    { field: "organisation_presence_type", label: "Presence type" },
    { field: "organisation_presence_lifecycle_status", label: "Presence status" },
    { field: "valid_from", label: "Valid from" },
    { field: "valid_to", label: "Valid to" },
  ],
};

function bulkRecordLabel(recordType: string) {
  return ({
    organisation: "O",
    product: "P",
    deployment: "D",
    organisation_alias: "A",
    organisation_relationship: "R",
    organisation_software_relationship: "S",
    organisation_presence: "C",
  } as Record<string, string>)[recordType] ?? "?";
}

function bulkCandidateTitle(recordType: string, value: BulkImportRowRecord["effectivePayload"]) {
  if (recordType === "organisation") return value.organisation_name;
  if (recordType === "organisation_alias") return value.organisation_alias;
  if (recordType === "organisation_relationship") {
    return `${value.organisation_name || value.existing_organisation_id} → ${value.related_organisation_id}`;
  }
  if (recordType === "organisation_software_relationship") {
    return `${value.organisation_name || value.existing_organisation_id} → ${value.product_name || value.existing_product_id}`;
  }
  if (recordType === "organisation_presence") {
    return `${value.organisation_name || value.existing_organisation_id} · ${value.organisation_presence_country_iso2}`;
  }
  return value.product_name;
}

function BulkCandidateRow({
  row,
  batch,
  onSaved,
}: {
  row: BulkImportRowRecord;
  batch: number;
  onSaved: (row: BulkImportRowRecord) => void;
}) {
  const [decision, setDecision] = useState<BulkRowDecision | "">(
    row.review?.decision ?? "",
  );
  const [amendments, setAmendments] = useState<
    Partial<Record<BulkAmendableField, string>>
  >(row.review?.amendments ?? {});
  const [sourceUrl, setSourceUrl] = useState(
    row.review?.normalizedSourceUrl ?? row.effectivePayload.source_url,
  );
  const [sourceOpened, setSourceOpened] = useState(
    row.review?.sourceOpened ?? false,
  );
  const [sourceDirect, setSourceDirect] = useState(
    row.review?.sourceDirect ?? false,
  );
  const [sourceSupports, setSourceSupports] = useState(
    row.review?.sourceSupports ?? false,
  );
  const [safetyChecked, setSafetyChecked] = useState(
    row.review?.safetyChecked ?? false,
  );
  const [notes, setNotes] = useState(row.review?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveDetails, setSaveDetails] = useState<string[]>([]);
  const value = {
    ...row.payload,
    ...amendments,
    source_url: sourceUrl,
  };
  const country =
    value.deployment_country_iso2 ||
    value.organisation_presence_country_iso2 ||
    value.country_of_origin ||
    value.headquarters_country ||
    "—";
  const editFields = [
    ...(bulkEditFieldsByType[row.recordType as BulkRecordType] ?? []),
    ...sourceEditFields,
  ];

  function updateField(field: BulkAmendableField, next: string) {
    setAmendments((current) => {
      const updated = { ...current };
      if (next === row.payload[field]) delete updated[field];
      else updated[field] = next;
      return updated;
    });
  }

  async function saveReview(event: FormEvent) {
    event.preventDefault();
    if (!decision) return;
    setSaving(true);
    setSaveError("");
    setSaveDetails([]);
    try {
      const response = await fetch(
        `/api/review/bulk-import-rows/${encodeURIComponent(row.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            amendments,
            sourceUrl,
            sourceOpened,
            sourceDirect,
            sourceSupports,
            safetyChecked,
            notes,
            expectedVersion: row.review?.version ?? 0,
          }),
        },
      );
      const result = (await response.json()) as
        | BulkReviewSaveResult
        | ApiError;
      if (!response.ok || !("review" in result)) {
        if ("error" in result) setSaveDetails(result.error?.details ?? []);
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The candidate decision could not be saved.",
        );
      }
      const review = result.review;
      setDecision(review.decision);
      setAmendments(review.amendments);
      setSourceUrl(review.normalizedSourceUrl);
      setSourceOpened(review.sourceOpened);
      setSourceDirect(review.sourceDirect);
      setSourceSupports(review.sourceSupports);
      setSafetyChecked(review.safetyChecked);
      setNotes(review.notes ?? "");
      onSaved({
        ...row,
        status: result.status,
        effectivePayload: {
          ...row.payload,
          ...review.amendments,
          source_url: review.normalizedSourceUrl,
        },
        review,
        promotedAssertionCount: result.promotedAssertionCount,
      });
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "The candidate decision could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="review-bulk-candidate">
      <summary>
        <span className="review-bulk-record-type">
          {bulkRecordLabel(row.recordType)}
        </span>
        <span>
          <strong>{bulkCandidateTitle(row.recordType, value)}</strong>
          <small>
            {row.recordType === "organisation"
              ? value.primary_organisation_role_id
              : value.organisation_name || value.existing_organisation_id}
          </small>
        </span>
        <span>{country}</span>
        <span>{evidenceLabel(value.evidence_status)}</span>
        <span className={`review-bulk-row-state ${row.status}`}>
          <small>Batch {batch}</small>
          <strong>{bulkDecisionLabel(row.status)}</strong>
        </span>
      </summary>
      <form className="review-bulk-review-form" onSubmit={saveReview}>
        <section className="review-bulk-source-check">
          <div>
            <span>Direct source</span>
            <strong>{value.source_title}</strong>
            <small>{value.source_publisher}</small>
          </div>
          <label>
            <span>Normalised URL</span>
            <input
              onChange={(event) => setSourceUrl(event.target.value)}
              type="url"
              value={sourceUrl}
            />
          </label>
          <a href={sourceUrl} rel="noreferrer" target="_blank">
            Open evidence ↗
          </a>
        </section>

        <details className="review-bulk-amendments">
          <summary>Edit candidate</summary>
          <div>
            {editFields.map(({ field, label, wide }) => (
              <label className={wide ? "wide" : undefined} key={field}>
                <span>{label}</span>
                {wide ? (
                  <textarea
                    onChange={(event) => updateField(field, event.target.value)}
                    rows={field === "notes" ? 3 : 2}
                    value={value[field]}
                  />
                ) : (
                  <input
                    onChange={(event) => updateField(field, event.target.value)}
                    value={value[field]}
                  />
                )}
              </label>
            ))}
            <label>
              <span>Evidence class</span>
              <select
                onChange={(event) =>
                  updateField("evidence_status", event.target.value)
                }
                value={value.evidence_status}
              >
                {reviewEvidenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>

        <fieldset className="review-bulk-checks">
          <legend>Checks for approval</legend>
          <label>
            <input
              checked={sourceOpened}
              onChange={(event) => setSourceOpened(event.target.checked)}
              type="checkbox"
            />
            Source opened
          </label>
          <label>
            <input
              checked={sourceDirect}
              onChange={(event) => setSourceDirect(event.target.checked)}
              type="checkbox"
            />
            Direct page
          </label>
          <label>
            <input
              checked={sourceSupports}
              onChange={(event) => setSourceSupports(event.target.checked)}
              type="checkbox"
            />
            Supports record
          </label>
          <label>
            <input
              checked={safetyChecked}
              onChange={(event) => setSafetyChecked(event.target.checked)}
              type="checkbox"
            />
            Safe to publish
          </label>
        </fieldset>

        <div aria-label="Candidate decision" className="review-bulk-decisions">
          {(
            [
              ["accept", "Accept"],
              ["amend", "Amend"],
              ["reject", "Reject"],
              ["needs_evidence", "More evidence"],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={decision === value}
              key={value}
              onClick={() => setDecision(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <label className="review-bulk-note">
          <span>Review note</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Reason, correction or missing evidence"
            rows={3}
            value={notes}
          />
        </label>

        {saveError ? (
          <div className="review-form-error" role="alert">
            <strong>{saveError}</strong>
            {saveDetails.slice(0, 8).map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>
        ) : null}

        <footer>
          <span>
            {row.promotedAssertionCount
              ? `${row.promotedAssertionCount} assertions created`
              : "No assertions created"}
          </span>
          <button
            className="button button-primary"
            disabled={!decision || saving}
            type="submit"
          >
            {saving ? "Saving…" : "Save decision"}
          </button>
        </footer>
      </form>
    </details>
  );
}

function OperationsPanel({
  operations,
  onSaved,
}: {
  operations: OperationsStatus;
  onSaved: (operations: OperationsStatus) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function changeIntake(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/review/operations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paused: !operations.intakePaused,
          reason,
          expectedVersion: operations.intakeVersion,
        }),
      });
      const result = (await response.json()) as OperationsStatus | ApiError;
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "Operations could not be updated.",
        );
      }
      onSaved(result as OperationsStatus);
      setReason("");
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Operations could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="review-operations">
      <header>
        <div>
          <h2>Operations</h2>
        </div>
        <StatusPill
          value={operations.intakePaused ? "Intake paused" : "Intake active"}
          warning={operations.intakePaused}
        />
      </header>
      <div className="review-operations-grid">
        <article>
          <span>Maintenance</span>
          <strong>
            {operations.lastMaintenance
              ? formatDate(operations.lastMaintenance.finishedAt)
              : "Not run"}
          </strong>
          <small>
            {operations.lastMaintenance
              ? `${operations.lastMaintenance.expiredContactsDeleted} contacts · ${operations.lastMaintenance.expiredRateLimitsDeleted} counters cleared`
              : "The scheduled job has not reported yet."}
          </small>
        </article>
        <article>
          <span>Retention</span>
          <strong>{operations.expiredContacts}</strong>
          <small>expired contacts awaiting deletion</small>
        </article>
        <article>
          <span>Open queue</span>
          <strong>{operations.openContributions}</strong>
          <small>
            {operations.oldestOpenAt
              ? `oldest received ${formatDate(operations.oldestOpenAt)}`
              : "no open contributions"}
          </small>
        </article>
      </div>
      <form className="review-intake-control" onSubmit={changeIntake}>
        <div>
          <strong>
            {operations.intakePaused
              ? "Resume contributions"
              : "Pause contributions"}
          </strong>
          <p>
            Existing receipts remain available. This control only stops new
            submissions.
          </p>
        </div>
        <label className="review-field">
          <span>Reason · required</span>
          <textarea
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is intake changing?"
            required
            rows={3}
            value={reason}
          />
        </label>
        {error ? <p className="review-form-error" role="alert">{error}</p> : null}
        <button
          className={
            operations.intakePaused
              ? "button button-primary"
              : "button button-outline"
          }
          disabled={saving || !reason.trim()}
          type="submit"
        >
          {saving
            ? "Saving…"
            : operations.intakePaused
              ? "Resume intake"
              : "Pause intake"}
        </button>
      </form>
      <footer>
        <span>Every change is logged.</span>
        {operations.intakeUpdatedAt ? (
          <small>
            Last changed {formatDate(operations.intakeUpdatedAt)} by{" "}
            {operations.intakeUpdatedBy}
          </small>
        ) : null}
      </footer>
    </section>
  );
}

function AssertionsWorkspace({
  assertions,
  reviewMap,
  active,
  onSelect,
  onReviewSaved,
  filter,
  onFilter,
  query,
  setQuery,
}: {
  assertions: ReviewAssertion[];
  reviewMap: Map<string, AssertionReviewRecord>;
  active: ReviewAssertion | undefined;
  onSelect: (id: string) => void;
  onReviewSaved: (review: AssertionReviewRecord | null) => void;
  filter: AssertionFilter;
  onFilter: (filter: AssertionFilter) => void;
  query: string;
  setQuery: (query: string) => void;
}) {
  const filtered = assertions
    .filter((assertion) => {
      const review = reviewMap.get(assertion.id);
      if (filter === "pending" && review) return false;
      if (!["all", "pending"].includes(filter) && review?.decision !== filter) {
        return false;
      }
      const search = query.trim().toLowerCase();
      if (!search) return true;
      return [
        assertion.subjectLabel,
        assertion.subjectContext,
        assertion.predicateLabel,
        assertion.value,
        assertion.sourcePublisher,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort(
      (left, right) =>
        left.assist.priority - right.assist.priority ||
        left.sourcePublisher.localeCompare(right.sourcePublisher) ||
        left.id.localeCompare(right.id),
    );
  const groups = groupAssertions(filtered);

  return (
    <section className="review-workbench">
      <aside className="review-queue">
        <div className="review-queue-tools">
          <label>
            <span className="sr-only">Search assertions</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a claim"
              type="search"
              value={query}
            />
          </label>
          <div aria-label="Filter assertions" className="review-filter-row">
            {[
              ["pending", "Pending"],
              ["all", "All"],
              ["needs_evidence", "Evidence"],
              ["amend", "Amend"],
            ].map(([value, label]) => (
              <button
                aria-pressed={filter === value}
                className={filter === value ? "active" : ""}
                key={value}
                onClick={() => onFilter(value as AssertionFilter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <small className="review-queue-mode">Grouped by source</small>
        </div>
        <div className="review-queue-scroll">
          {groups.map(([group, items]) => (
            <section className="review-queue-group" key={group}>
              <header>
                <span>{group}</span>
                <small>{items.length}</small>
              </header>
              {items.map((assertion) => {
                const review = reviewMap.get(assertion.id);
                return (
                  <button
                    aria-current={active?.id === assertion.id ? "true" : undefined}
                    className={active?.id === assertion.id ? "active" : ""}
                    key={assertion.id}
                    onClick={() => onSelect(assertion.id)}
                    type="button"
                  >
                    <i
                      className={`review-decision-dot ${review?.decision ?? "pending"}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{assertion.predicateLabel}</strong>
                      <small>{truncate(assertion.value, 64)}</small>
                    </span>
                    <em>{review ? decisionLabel(review.decision) : "Open"}</em>
                  </button>
                );
              })}
            </section>
          ))}
          {!groups.length ? (
            <div className="review-empty-list">
              <strong>No matching claims</strong>
              <button
                onClick={() => {
                  setQuery("");
                  onFilter("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="review-detail">
        {active ? (
          <AssertionReviewPanel
            assertion={active}
            key={`${active.id}-${reviewMap.get(active.id)?.version ?? 0}`}
            onSaved={onReviewSaved}
            review={reviewMap.get(active.id)}
          />
        ) : (
          <ReviewEmpty title="No assertion selected" />
        )}
      </div>
    </section>
  );
}

function AssertionReviewPanel({
  assertion,
  review,
  onSaved,
}: {
  assertion: ReviewAssertion;
  review?: AssertionReviewRecord;
  onSaved: (review: AssertionReviewRecord | null) => void;
}) {
  const [decision, setDecision] = useState(review?.decision ?? "");
  const [proposedValue, setProposedValue] = useState(
    review?.proposedValue ?? assertion.value,
  );
  const [proposedEvidenceStatus, setProposedEvidenceStatus] = useState(
    review?.proposedEvidenceStatus ?? assertion.evidenceStatus,
  );
  const [notes, setNotes] = useState(review?.notes ?? "");
  const [sourceChecked, setSourceChecked] = useState(
    Boolean(review?.sourceChecked),
  );
  const [safetyChecked, setSafetyChecked] = useState(
    Boolean(review?.safetyChecked),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/review/assertions/${encodeURIComponent(assertion.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            proposedValue: decision === "amend" ? proposedValue : "",
            proposedEvidenceStatus:
              proposedEvidenceStatus === assertion.evidenceStatus
                ? ""
                : proposedEvidenceStatus,
            notes,
            sourceChecked,
            safetyChecked,
            expectedVersion: review?.version ?? 0,
          }),
        },
      );
      const result = (await response.json()) as
        | AssertionReviewRecord
        | ApiError;
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The review could not be saved.",
        );
      }
      onSaved(result as AssertionReviewRecord);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The review could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearReview() {
    if (!review) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/review/assertions/${encodeURIComponent(assertion.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedVersion: review.version }),
        },
      );
      const result = (await response.json()) as
        | { assertionId: string; cleared: boolean }
        | ApiError;
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The review could not be cleared.",
        );
      }
      onSaved(null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The review could not be cleared.",
      );
    } finally {
      setSaving(false);
    }
  }

  function onDecisionKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const match = reviewDecisions.find((item) => item.key === event.key);
    if (match) setDecision(match.value);
  }

  return (
    <form className="assertion-review-form" onSubmit={save}>
      <header className="review-record-header">
        <div>
          <span>{assertion.subjectContext}</span>
          <h2>{assertion.subjectLabel}</h2>
        </div>
        <Link href={assertion.subjectHref} target="_blank">
          Open record ↗
        </Link>
      </header>

      <section className="review-claim">
        <span>{assertion.predicateLabel}</span>
        <strong>{assertion.value || "Blank"}</strong>
        <div>
          <StatusPill value={evidenceLabel(assertion.evidenceStatus)} />
          <span className="mono">{assertion.id}</span>
        </div>
      </section>

      <section className="review-source-card">
        <div>
          <span>Source</span>
          <a href={assertion.sourceUrl} rel="noreferrer" target="_blank">
            {assertion.sourceTitle} ↗
          </a>
          <small>
            {assertion.sourcePublisher} · {assertion.sourceIndependence}
          </small>
        </div>
        <StatusPill
          value={
            assertion.sourceLicense === "unknown"
              ? "Rights unresolved"
              : assertion.sourceLicense.replaceAll("_", " ")
          }
          warning={assertion.sourceLicense === "unknown"}
        />
        {assertion.locator ? (
          <p>
            <strong>Look for</strong>
            {assertion.locator}
          </p>
        ) : null}
      </section>

      <div className="review-prep-strip">
        <strong>
          {assertion.assist.recommendedAction === "request_evidence"
            ? "Evidence gap"
            : "Ready to inspect"}
        </strong>
        <div>
          {assertion.assist.signals.slice(0, 4).map((signal) => (
            <span key={signal}>{assistSignalLabel(signal)}</span>
          ))}
        </div>
        <small>Preparation only · you decide</small>
      </div>

      <fieldset className="review-checks">
        <legend>Checks</legend>
        <label>
          <input
            checked={sourceChecked}
            onChange={(event) => setSourceChecked(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>Source opened</strong>
            <small>The cited passage supports this exact value.</small>
          </span>
        </label>
        <label>
          <input
            checked={safetyChecked}
            onChange={(event) => setSafetyChecked(event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong>Safe to publish</strong>
            <small>No confidential or sensitive infrastructure detail.</small>
          </span>
        </label>
      </fieldset>

      <div
        className="review-decision-grid"
        onKeyDown={onDecisionKey}
        role="group"
        aria-label="Editorial decision"
      >
        {reviewDecisions.map((item) => (
          <button
            aria-pressed={decision === item.value}
            className={decision === item.value ? `active ${item.value}` : ""}
            key={item.value}
            onClick={() => setDecision(item.value)}
            type="button"
          >
            <span>{item.label}</span>
            <kbd>{item.key}</kbd>
          </button>
        ))}
      </div>

      {decision === "amend" ? (
        <label className="review-field">
          <span>Corrected value</span>
          <textarea
            onChange={(event) => setProposedValue(event.target.value)}
            required
            rows={3}
            value={proposedValue}
          />
        </label>
      ) : null}

      <label className="review-field">
        <span>Evidence class</span>
        <select
          onChange={(event) => setProposedEvidenceStatus(event.target.value)}
          value={proposedEvidenceStatus}
        >
          {reviewEvidenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="review-field">
        <span>
          Review note
          {decision && decision !== "accept" ? " · required" : ""}
        </span>
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What did you confirm or change?"
          rows={4}
          value={notes}
        />
      </label>

      {error ? <p className="review-form-error" role="alert">{error}</p> : null}

      <footer className="review-form-footer">
        <div>
          {review ? (
            <>
              <span>{decisionLabel(review.decision)}</span>
              <small>Version {review.version}</small>
            </>
          ) : (
            <span>Not decided</span>
          )}
        </div>
        {review ? (
          <button
            className="button button-outline"
            disabled={saving}
            onClick={clearReview}
            type="button"
          >
            Clear
          </button>
        ) : null}
        <button
          className="button button-primary"
          disabled={saving || !decision}
          type="submit"
        >
          {saving ? "Saving…" : "Save decision"}
        </button>
      </footer>
    </form>
  );
}

function SourcesWorkspace({
  sources,
  active,
  reviewMap,
  onSelect,
  onReviewSaved,
}: {
  sources: Source[];
  active: Source | undefined;
  reviewMap: Map<string, SourceReviewRecord>;
  onSelect: (id: string) => void;
  onReviewSaved: (review: SourceReviewRecord) => void;
}) {
  const ordered = [...sources].sort((left, right) => {
    const leftOpen =
      left.sourceLicense === "unknown" &&
      !["resolved", "exclude"].includes(
        reviewMap.get(left.id)?.rightsStatus ?? "",
      );
    const rightOpen =
      right.sourceLicense === "unknown" &&
      !["resolved", "exclude"].includes(
        reviewMap.get(right.id)?.rightsStatus ?? "",
      );
    return Number(rightOpen) - Number(leftOpen);
  });
  return (
    <section className="review-workbench">
      <aside className="review-queue source-review-queue">
        <div className="review-queue-heading">
          <strong>Source register</strong>
          <span>{sources.length}</span>
        </div>
        <div className="review-queue-scroll">
          {ordered.map((source) => {
            const review = reviewMap.get(source.id);
            const unresolved =
              source.sourceLicense === "unknown" &&
              !["resolved", "exclude"].includes(review?.rightsStatus ?? "");
            return (
              <button
                aria-current={active?.id === source.id ? "true" : undefined}
                className={active?.id === source.id ? "active" : ""}
                key={source.id}
                onClick={() => onSelect(source.id)}
                type="button"
              >
                <i
                  className={`review-decision-dot ${
                    unresolved ? "needs_evidence" : "accept"
                  }`}
                  aria-hidden="true"
                />
                <span>
                  <strong>{source.publisher}</strong>
                  <small>{truncate(source.title, 72)}</small>
                </span>
                <em>{unresolved ? "Rights" : "Ready"}</em>
              </button>
            );
          })}
        </div>
      </aside>
      <div className="review-detail">
        {active ? (
          <SourceReviewPanel
            key={`${active.id}-${reviewMap.get(active.id)?.version ?? 0}`}
            onSaved={onReviewSaved}
            review={reviewMap.get(active.id)}
            source={active}
          />
        ) : (
          <ReviewEmpty title="No source selected" />
        )}
      </div>
    </section>
  );
}

function SourceReviewPanel({
  source,
  review,
  onSaved,
}: {
  source: Source;
  review?: SourceReviewRecord;
  onSaved: (review: SourceReviewRecord) => void;
}) {
  const [rightsStatus, setRightsStatus] = useState(
    review?.rightsStatus ??
      (source.sourceLicense === "unknown" ? "needs_research" : "resolved"),
  );
  const [sourceLicense, setSourceLicense] = useState(
    review?.sourceLicense ?? source.sourceLicense,
  );
  const [independenceClass, setIndependenceClass] = useState(
    review?.independenceClass ?? source.independenceClass,
  );
  const [notes, setNotes] = useState(review?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/review/sources/${encodeURIComponent(source.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rightsStatus,
            sourceLicense,
            independenceClass,
            notes,
            expectedVersion: review?.version ?? 0,
          }),
        },
      );
      const result = (await response.json()) as SourceReviewRecord | ApiError;
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The source review could not be saved.",
        );
      }
      onSaved(result as SourceReviewRecord);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The source review could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="source-review-form" onSubmit={save}>
      <header className="review-record-header">
        <div>
          <span>{source.sourceType.replaceAll("_", " ")}</span>
          <h2>{source.publisher}</h2>
        </div>
        <a href={source.url} rel="noreferrer" target="_blank">
          Open source ↗
        </a>
      </header>
      <section className="source-review-title">
        <strong>{source.title}</strong>
        <p>{source.notes}</p>
      </section>
      <div className="source-review-fields">
        <label className="review-field">
          <span>Rights decision</span>
          <select
            onChange={(event) =>
              setRightsStatus(
                event.target.value as
                  | "resolved"
                  | "needs_research"
                  | "exclude",
              )
            }
            value={rightsStatus}
          >
            <option value="resolved">Resolved</option>
            <option value="needs_research">Needs research</option>
            <option value="exclude">Exclude from release</option>
          </select>
        </label>
        <label className="review-field">
          <span>Licence or factual-use basis</span>
          <input
            onChange={(event) => setSourceLicense(event.target.value)}
            placeholder="For example: all_rights_reserved"
            value={sourceLicense}
          />
        </label>
        <label className="review-field">
          <span>Independence</span>
          <select
            onChange={(event) => setIndependenceClass(event.target.value)}
            value={independenceClass}
          >
            <option value="provider_authored">Provider-authored</option>
            <option value="customer_or_official">Customer or official</option>
            <option value="independent_primary">Independent primary</option>
            <option value="independent_secondary">Independent secondary</option>
            <option value="aggregator">Aggregator</option>
            <option value="community_submission">Community submission</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label className="review-field">
          <span>Review note</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Rights basis, independence decision or exclusion reason"
            rows={5}
            value={notes}
          />
        </label>
      </div>
      {error ? <p className="review-form-error" role="alert">{error}</p> : null}
      <footer className="review-form-footer">
        <div>
          <span>{review ? "Saved" : source.sourceLicense}</span>
          <small>{source.independence}</small>
        </div>
        <button
          className="button button-primary"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save source review"}
        </button>
      </footer>
    </form>
  );
}

function ContributionsWorkspace({
  contributions,
  active,
  onSelect,
  onStatusSaved,
}: {
  contributions: ModerationContribution[];
  active: ModerationContribution | undefined;
  onSelect: (id: string) => void;
  onStatusSaved: (
    contributionId: string,
    status: string,
    updatedAt: string,
  ) => void;
}) {
  return (
    <section className="review-workbench">
      <aside className="review-queue contribution-review-queue">
        <div className="review-queue-heading">
          <strong>Incoming</strong>
          <span>{contributions.length}</span>
        </div>
        <div className="review-queue-scroll">
          {contributions.map((contribution) => (
            <button
              aria-current={active?.id === contribution.id ? "true" : undefined}
              className={active?.id === contribution.id ? "active" : ""}
              key={contribution.id}
              onClick={() => onSelect(contribution.id)}
              type="button"
            >
              <i
                className={`review-decision-dot ${contribution.status}`}
                aria-hidden="true"
              />
              <span>
                <strong>{contributionLabel(contribution)}</strong>
                <small>{contribution.submissionType} · {formatDate(contribution.submittedAt)}</small>
              </span>
              <em>{statusLabel(contribution.status)}</em>
            </button>
          ))}
          {!contributions.length ? (
            <ReviewEmpty title="No contributions yet" />
          ) : null}
        </div>
      </aside>
      <div className="review-detail">
        {active ? (
          <ContributionReviewPanel
            contribution={active}
            key={`${active.id}-${active.updatedAt}`}
            onSaved={onStatusSaved}
          />
        ) : (
          <ReviewEmpty title="The intake queue is empty" />
        )}
      </div>
    </section>
  );
}

function ContributionReviewPanel({
  contribution,
  onSaved,
}: {
  contribution: ModerationContribution;
  onSaved: (id: string, status: string, updatedAt: string) => void;
}) {
  const [status, setStatus] = useState(nextSuggestedStatus(contribution.status));
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState<{
    email: string;
    deleteAfter: string;
  } | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/review/contributions/${encodeURIComponent(contribution.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reason }),
        },
      );
      const result = (await response.json()) as
        | { status: string; updatedAt: string }
        | ApiError;
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The status could not be updated.",
        );
      }
      if ("status" in result) {
        onSaved(contribution.id, result.status, result.updatedAt);
      }
      setReason("");
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "The status could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function revealContact() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/review/contributions/${encodeURIComponent(contribution.id)}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const result = (await response.json()) as
        | {
            contact: { email: string; deleteAfter: string } | null;
          }
        | ApiError;
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "Private contact could not be loaded.",
        );
      }
      if ("contact" in result) setContact(result.contact);
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : "Private contact could not be loaded.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="contribution-review-form" onSubmit={save}>
      <header className="review-record-header">
        <div>
          <span>{contribution.submissionType}</span>
          <h2>{contributionLabel(contribution)}</h2>
        </div>
        <StatusPill value={statusLabel(contribution.status)} />
      </header>
      <dl className="contribution-review-data">
        <DataRow label="Submission" value={contribution.id} mono />
        <DataRow label="Received" value={formatDate(contribution.submittedAt)} />
        <DataRow label="Product" value={contribution.relatedEntityId || contribution.productName} />
        <DataRow label="Organisation" value={contribution.organisationName} />
        <DataRow label={contribution.submissionType === "organisation" ? "Actor type" : "Category"} value={contribution.category} />
        <DataRow label="Country" value={contribution.countryIso2} />
        <DataRow label="Customer" value={contribution.customerPublic} />
        <DataRow label="Proposed value" value={contribution.proposedValue} />
        <DataRow label="Authority" value={contribution.authority} />
        <DataRow label="Notes" value={contribution.notes} />
      </dl>
      <a
        className="contribution-source-link"
        href={contribution.evidenceUrl}
        rel="noreferrer"
        target="_blank"
      >
        Open supplied source <span aria-hidden="true">↗</span>
      </a>
      <section className="review-private-contact">
        <div>
          <strong>Private contact</strong>
          <small>Access is logged. Never copy this into public data.</small>
        </div>
        {contact === undefined ? (
          <button
            className="button button-outline"
            disabled={saving}
            onClick={revealContact}
            type="button"
          >
            Reveal
          </button>
        ) : contact ? (
          <div>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <small>Delete after {formatDate(contact.deleteAfter)}</small>
          </div>
        ) : (
          <span>No retained contact</span>
        )}
      </section>
      <div className="contribution-moderation">
        <label className="review-field">
          <span>Next status</span>
          <select onChange={(event) => setStatus(event.target.value)} value={status}>
            {contributionStatusOptions(contribution.status).map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="review-field">
          <span>Reason · required</span>
          <textarea
            onChange={(event) => setReason(event.target.value)}
            placeholder="What changed and why?"
            required
            rows={4}
            value={reason}
          />
        </label>
      </div>
      <div className="review-boundary-note">
        Accepted means ready for a data pull request. It does not publish the
        record.
      </div>
      {error ? <p className="review-form-error" role="alert">{error}</p> : null}
      <footer className="review-form-footer">
        <div>
          <span>{statusLabel(contribution.status)}</span>
          <small>Current status</small>
        </div>
        <button
          className="button button-primary"
          disabled={saving || !reason}
          type="submit"
        >
          {saving ? "Saving…" : "Update status"}
        </button>
      </footer>
    </form>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="review-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={active ? "active" : ""}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <span>{label}</span>
      <small>{count}</small>
    </button>
  );
}

function StatusPill({
  value,
  warning = false,
}: {
  value: string;
  warning?: boolean;
}) {
  return (
    <span className={`review-status-pill ${warning ? "warning" : ""}`}>
      {value}
    </span>
  );
}

function ReviewEmpty({ title }: { title: string }) {
  return (
    <div className="review-empty">
      <span aria-hidden="true">○</span>
      <strong>{title}</strong>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{value}</dd>
    </div>
  );
}

function groupAssertions(assertions: ReviewAssertion[]) {
  const groups = new Map<string, ReviewAssertion[]>();
  for (const assertion of assertions) {
    const group = `${assertion.sourcePublisher} · ${truncate(
      assertion.sourceTitle,
      58,
    )}`;
    groups.set(group, [...(groups.get(group) ?? []), assertion]);
  }
  return Array.from(groups.entries());
}

function assistSignalLabel(value: string) {
  return (
    {
      rights_unresolved: "Rights",
      human_only_source: "Human source",
      provider_authored: "Provider",
      provider_claim: "Claim",
      missing_locator: "Locator",
      safety_review: "Safety",
    }[value] ?? value.replaceAll("_", " ")
  );
}

function contributionLabel(contribution: ModerationContribution) {
  return (
    contribution.productName ||
    contribution.organisationName ||
    contribution.relatedEntityId ||
    "Contribution"
  );
}

function contributionStatusOptions(current: string) {
  const map: Record<string, string[]> = {
    received: ["triaged", "rejected", "duplicate", "withdrawn"],
    triaged: [
      "researching",
      "needs_evidence",
      "reviewed",
      "rejected",
      "duplicate",
      "withdrawn",
    ],
    researching: [
      "needs_evidence",
      "reviewed",
      "rejected",
      "duplicate",
      "withdrawn",
    ],
    needs_evidence: [
      "researching",
      "reviewed",
      "rejected",
      "duplicate",
      "withdrawn",
    ],
    reviewed: [
      "accepted",
      "needs_evidence",
      "researching",
      "rejected",
      "withdrawn",
    ],
    accepted: ["researching", "withdrawn"],
    rejected: ["researching"],
    duplicate: ["researching"],
    withdrawn: ["researching"],
  };
  return map[current] ?? ["triaged"];
}

function nextSuggestedStatus(current: string) {
  return contributionStatusOptions(current)[0];
}

function statusLabel(value: string) {
  return (
    {
      received: "Received",
      triaged: "Triaged",
      researching: "Researching",
      needs_evidence: "Needs evidence",
      reviewed: "Reviewed",
      accepted: "Accepted for data PR",
      rejected: "Rejected",
      duplicate: "Duplicate",
      withdrawn: "Withdrawn",
    }[value] ?? value.replaceAll("_", " ")
  );
}

function decisionLabel(value: string) {
  return (
    {
      accept: "Accepted",
      amend: "Amend",
      reject: "Rejected",
      needs_evidence: "More evidence",
    }[value] ?? value
  );
}

function evidenceLabel(value: string) {
  return (
    reviewEvidenceOptions.find((option) => option.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

function exportFilename(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);
  return (match?.[1] ?? "aesm-review-package-batch-001.json").replace(
    /[\\/]/g,
    "-",
  );
}

function bulkDecisionLabel(value: string) {
  return (
    {
      candidate: "Open",
      accept: "Accepted",
      amend: "Amended",
      reject: "Rejected",
      needs_evidence: "More evidence",
    }[value] ?? value.replaceAll("_", " ")
  );
}

function catalogueDecisionLabel(value: string) {
  return (
    {
      accept: "Accept",
      amend: "Amend",
      reject: "Reject",
      needs_evidence: "More evidence",
      duplicate: "Duplicate",
    }[value] ?? value.replaceAll("_", " ")
  );
}

function bulkImportStatusLabel(value: string) {
  return (
    {
      candidate: "Candidate",
      in_review: "In review",
      blocked: "Evidence needed",
      reviewed: "Reviewed",
    }[value] ?? value.replaceAll("_", " ")
  );
}

function shortBatch(value: string) {
  return value.split("/").at(-1) ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
