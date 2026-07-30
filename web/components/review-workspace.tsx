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
  sourceReviews: SourceReviewRecord[];
  contributions: ModerationContribution[];
};

type Tab = "assertions" | "sources" | "contributions";
type AssertionFilter =
  | "all"
  | "pending"
  | "accept"
  | "amend"
  | "reject"
  | "needs_evidence";
type ApiError = { error?: { message?: string } };

export function ReviewWorkspace({
  assertions,
  sources,
  manifest,
  batchId,
  reviewer,
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
  batchId: string;
  reviewer: { displayName: string; email: string };
}) {
  const [tab, setTab] = useState<Tab>("assertions");
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [loadError, setLoadError] = useState("");
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
  const reviewedAssertions = assertionReviewMap.size;
  const resolvedSources = sources.filter((source) => {
    if (source.sourceLicense !== "unknown") return true;
    return sourceReviewMap.get(source.id)?.rightsStatus === "resolved";
  }).length;
  const openContributions = (workspace?.contributions ?? []).filter(
    (record) =>
      !["accepted", "rejected", "duplicate", "withdrawn"].includes(
        record.status,
      ),
  ).length;
  const progress = assertions.length
    ? Math.round((reviewedAssertions / assertions.length) * 100)
    : 0;
  const activeAssertion =
    assertions.find((assertion) => assertion.id === activeAssertionId) ??
    assertions[0];
  const activeSource =
    sources.find((source) => source.id === activeSourceId) ?? sources[0];
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

  return (
    <main className="review-page" id="main-content">
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
          <button
            className="button button-outline"
            onClick={() => setRefreshKey((value) => value + 1)}
            type="button"
          >
            Refresh
          </button>
          <a className="button button-primary" href="/api/review/export">
            Download package
          </a>
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
              {reviewedAssertions}<small> / {assertions.length}</small>
            </strong>
          </div>
        </div>
        <Metric
          label="Source rights"
          note={`${sources.length - resolvedSources} unresolved`}
          value={`${resolvedSources}/${sources.length}`}
        />
        <Metric
          label="Contributions"
          note={workspace ? "open queue" : "loading"}
          value={workspace ? String(openContributions) : "—"}
        />
        <Metric
          label="Release"
          note="review package only"
          value={manifest.reviewGate.publishable ? "Ready" : "Held"}
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

      <nav aria-label="Review queues" className="review-tabs">
        <TabButton
          active={tab === "assertions"}
          count={assertions.length}
          label="Assertions"
          onClick={() => setTab("assertions")}
        />
        <TabButton
          active={tab === "sources"}
          count={sources.length}
          label="Sources"
          onClick={() => setTab("sources")}
        />
        <TabButton
          active={tab === "contributions"}
          count={contributions.length}
          label="Contributions"
          onClick={() => setTab("contributions")}
        />
      </nav>

      {tab === "assertions" ? (
        <AssertionsWorkspace
          active={activeAssertion}
          assertions={assertions}
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
          sources={sources}
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
    </main>
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
  const filtered = assertions.filter((assertion) => {
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
  });
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
      reviewMap.get(left.id)?.rightsStatus !== "resolved";
    const rightOpen =
      right.sourceLicense === "unknown" &&
      reviewMap.get(right.id)?.rightsStatus !== "resolved";
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
              review?.rightsStatus !== "resolved";
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
        <DataRow label="Category" value={contribution.category} />
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
    const group = `${assertion.subjectLabel} · ${assertion.subjectContext}`;
    groups.set(group, [...(groups.get(group) ?? []), assertion]);
  }
  return Array.from(groups.entries());
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
