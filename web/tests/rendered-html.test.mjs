import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function fetchWorker(pathname = "/", init = {}, environment = {}) {
  globalThis.__AEM_TEST_DB__ = environment.DB;
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);

  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "text/html");
  try {
    return await worker.fetch(
      new Request(`http://localhost${pathname}`, { ...init, headers }),
      {
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
        ...environment,
      },
      {
        waitUntil() {},
        passThroughOnException() {},
      },
    );
  } finally {
    globalThis.__AEM_TEST_DB__ = undefined;
  }
}

async function render(pathname = "/") {
  return fetchWorker(pathname);
}

class MemoryD1 {
  database = new DatabaseSync(":memory:");

  constructor() {
    this.database.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_quick_prodigy.sql",
      "../drizzle/0001_fancy_senator_kelly.sql",
      "../drizzle/0002_aspiring_whistler.sql",
      "../drizzle/0003_deep_magneto.sql",
      "../drizzle/0004_curious_magma.sql",
    ]) {
      const sql = readFileSync(new URL(migration, import.meta.url), "utf8");
      for (const statement of sql.split("--> statement-breakpoint")) {
        if (statement.trim()) this.database.exec(statement);
      }
    }
  }

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  get(sql, ...values) {
    return this.database.prepare(sql).get(...values);
  }

  run(sql, ...values) {
    return this.database.prepare(sql).run(...values);
  }

  count(table) {
    return this.get(`SELECT COUNT(*) AS count FROM ${table}`).count;
  }
}

class MemoryStatement {
  values = [];

  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return this.database.database.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return {
      success: true,
      results: this.database.database.prepare(this.sql).all(...this.values),
    };
  }

  async run() {
    const result = this.database.database.prepare(this.sql).run(...this.values);
    return {
      success: true,
      meta: {
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid),
      },
    };
  }
}

const validProductContribution = {
  type: "product",
  product: "Grid Insight",
  organisation: "Example Energy",
  category: "Distribution utility operations",
  country: "NG",
  customerDisclosure: "named",
  customer: "",
  year: "",
  lifecycle: "pilot",
  field: "",
  proposedValue: "",
  source: "https://example.com/product",
  relationship: "provider",
  authority: "",
  email: "researcher@example.com",
  notes: "Utility network planning and operations.",
  sensitiveConfirmed: false,
  companyWebsite: "",
};

const bulkHeaders = [
  "row_key",
  "record_type",
  "organisation_name",
  "existing_organisation_id",
  "organisation_website",
  "country_of_origin",
  "headquarters_country",
  "origin_classification",
  "product_name",
  "existing_product_id",
  "product_website",
  "open_source_url",
  "product_description",
  "primary_category_id",
  "sector_id",
  "product_lifecycle_status",
  "access_model",
  "deployment_country_iso2",
  "customer_name",
  "customer_disclosure",
  "deployment_lifecycle_status",
  "started_year",
  "source_url",
  "source_title",
  "source_publisher",
  "source_publication_date",
  "source_independence_class",
  "source_license",
  "evidence_status",
  "source_locator",
  "notes",
  "confirms_no_sensitive_data",
];

const validBulkDeployment = {
  row_key: "example-grid-ng-2024",
  record_type: "deployment",
  organisation_name: "Example Global Grid",
  existing_organisation_id: "",
  organisation_website: "https://example.com",
  country_of_origin: "GB",
  headquarters_country: "US",
  origin_classification: "global_deployed_in_africa",
  product_name: "Example Grid Suite",
  existing_product_id: "",
  product_website: "https://example.com/grid",
  open_source_url: "",
  product_description: "Distribution operations software.",
  primary_category_id: "cat_distribution_utility_operations",
  sector_id: "sector_power_utilities",
  product_lifecycle_status: "active",
  access_model: "commercial",
  deployment_country_iso2: "NG",
  customer_name: "Example Distribution Company",
  customer_disclosure: "named",
  deployment_lifecycle_status: "active",
  started_year: "2024",
  source_url: "https://example.org/programme",
  source_title: "Distribution modernisation programme",
  source_publisher: "Example Distribution Company",
  source_publication_date: "2024-06-10",
  source_independence_class: "customer_or_official",
  source_license: "unknown",
  evidence_status: "customer_confirmed",
  source_locator: "Programme update, section 3",
  notes: "",
  confirms_no_sensitive_data: "true",
};

function contributionRequest(body, headers = {}) {
  return {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "cf-connecting-ip": "203.0.113.10",
      "user-agent": "registry-test",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

const reviewerEmail = "editor@example.com";
process.env.REVIEWER_EMAILS = reviewerEmail;
process.env.OPERATIONS_TOKEN = "operations-test-token";

const reviewerHeaders = {
  accept: "application/json",
  "content-type": "application/json",
  origin: "http://localhost",
  "sec-fetch-site": "same-origin",
  "oai-authenticated-user-email": reviewerEmail,
};

function reviewRequest(body, headers = {}) {
  return {
    method: "PUT",
    headers: { ...reviewerHeaders, ...headers },
    body: JSON.stringify(body),
  };
}

test("server-renders the Stack with reviewed status and useful records", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /The software powering African energy/);
  assert.match(html, /Reviewed beta/);
  assert.match(html, /Reviewed data release/);
  assert.match(html, /CAIMS/);
  assert.match(html, /Adora/);
  assert.match(html, /PAYGo and mini-grid operations/);
  assert.match(html, /Skip to main content/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("core public routes expose semantic keyboard and reflow contracts", async () => {
  for (const pathname of [
    "/",
    "/deployments",
    "/directory",
    "/accessibility",
    "/contribute",
  ]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, /<html[^>]*lang="en"/i, pathname);
    assert.match(
      html,
      /<a[^>]*class="skip-link"[^>]*href="#main-content"/i,
      pathname,
    );
    assert.match(
      html,
      /<main[^>]*id="main-content"[^>]*tabindex="-1"/i,
      pathname,
    );
    assert.equal(html.match(/<main\b/gi)?.length, 1, pathname);
    assert.equal(html.match(/<h1\b/gi)?.length, 1, pathname);
    assert.match(html, /aria-label="Primary navigation"/i, pathname);
  }

  const mapResponse = await render("/deployments");
  const mapHtml = await mapResponse.text();
  assert.match(mapHtml, /aria-label="Map layer"/i);
  assert.match(mapHtml, /aria-label="Map representation"/i);
  assert.match(mapHtml, /aria-label="African country data view"/i);
  assert.match(mapHtml, /aria-label="African countries, equal-area grid"/i);
  assert.match(mapHtml, /aria-live="polite"/i);

  const styles = ["../app/globals.css", "../app/visual-system.css"]
    .map((filename) => readFileSync(new URL(filename, import.meta.url), "utf8"))
    .join("\n");
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /min-width:\s*320px/);
});

test("server-renders the Directory and its export action", async () => {
  const response = await render("/directory?country=NG");
  assert.equal(response.status, 200);
  const html = await response.text();
  const textHtml = html.replaceAll(/<!--.*?-->/g, "");
  assert.match(html, /<h1[^>]*>Directory<\/h1>/i);
  assert.match(html, /Export current view/);
  assert.match(html, /Page size/);
  assert.match(textHtml, /Page 1 of 1/);
  assert.match(html, /Nigeria/);
  assert.match(html, /PAM-AI/);
  assert.doesNotMatch(html, /Pai Enterprise/);
});

test("server search includes organisation records", async () => {
  const response = await render("/search?q=Beacon");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Results for “Beacon”/);
  assert.match(html, /Organisations/);
  assert.match(html, /Beacon Power Services/);
  assert.match(html, /Open record/);
});

test("server-renders a source-linked product profile", async () => {
  const response = await render("/products/adora");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<h1[^>]*>Adora<\/h1>/i);
  assert.match(html, /African deployments/);
  assert.match(html, /Abuja Electricity Distribution Company/);
  assert.match(html, /Assertion-level evidence and sources/);
  assert.match(html, /Proparco/);
  assert.match(html, /Editorial review required/);
});

test("server-renders corrected product identity and source-backed fields", async () => {
  const response = await render("/products/pai-enterprise");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<h1[^>]*>Pai Enterprise<\/h1>/i);
  assert.match(html, /PowerLabs/);
  assert.match(html, /2025/);
  assert.match(html, /TechCabal/);
});

test("server-renders reproducible reviewed downloads and review status", async () => {
  const response = await render("/data");
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("permissions-policy"),
    "camera=(), microphone=(), geolocation=()",
  );
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  const html = await response.text();
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/africa-energy-software-map-2026\.kaykluz\.chatgpt\.site\/data"\/>/,
  );
  const textHtml = html.replaceAll(/<!--.*?-->/g, "");
  assert.match(html, /<h1[^>]*>Data and downloads<\/h1>/i);
  assert.match(textHtml, /88 of\s+88 assertions reviewed/);
  assert.match(textHtml, /0 sources need metadata/);
  assert.match(html, /csv-package\.zip/);
  assert.match(html, /registry\.json/);
  assert.match(html, /assertions\.jsonl/);
  assert.match(html, /deployments\.geojson/);
  assert.match(html, /Versioned tables, assertions and country-safe deployment data/);
  assert.doesNotMatch(html, /_vinext\/image/);
});

test("server-renders a country profile from the generated snapshot", async () => {
  const response = await render("/countries/ng");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<h1[^>]*>Nigeria<\/h1>/i);
  assert.match(html, /Evidence-led software index/);
  assert.match(html, /Abuja Electricity Distribution Company/);
  assert.match(html, /View in Data/);
  assert.match(html, /href="\/directory\?country=NG"/);
});

test("server-renders the methodology AI disclosure", async () => {
  const response = await render("/methodology");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /How the map decides what to show/);
  assert.match(html, /AI use and human review/);
  assert.match(html, /AI output is never evidence/);
  assert.match(html, /no autonomous process may publish/);
});

test("server-renders durable contribution and private receipt routes", async () => {
  const formResponse = await render("/contribute/product");
  assert.equal(formResponse.status, 200);
  const formHtml = await formResponse.text();
  assert.match(formHtml, /Submit a product/);
  assert.match(formHtml, /Nothing is published automatically/);
  assert.match(formHtml, /Contact email/);

  const receiptResponse = await render(
    "/contribute/status/AEM-PRO-20260730-ABCDEF1234567890?token=abc",
  );
  assert.equal(receiptResponse.status, 200);
  assert.match(await receiptResponse.text(), /Contribution receipt/);
});

test("contribution API stores moderated content and private contact separately", async () => {
  const database = new MemoryD1();
  database.run(
    `INSERT INTO contributions (
      id, submission_type, status, submitted_at, updated_at, evidence_url,
      sensitive_confirmed, status_token_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    "expired",
    "product",
    "received",
    "2020-01-01T00:00:00.000Z",
    "2020-01-01T00:00:00.000Z",
    "https://example.com/expired",
    0,
    "expired-token-hash",
  );
  database.run(
    "INSERT INTO contribution_contacts (contribution_id, email, delete_after) VALUES (?, ?, ?)",
    "expired",
    "old@example.com",
    "2020-01-01T00:00:00.000Z",
  );
  const response = await fetchWorker(
    "/api/contributions",
    contributionRequest(validProductContribution),
    { DB: database },
  );
  assert.equal(response.status, 201);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const receipt = await response.json();
  assert.match(receipt.id, /^AEM-PRO-\d{8}-[A-F0-9]{16}$/);
  assert.match(receipt.statusUrl, /^\/contribute\/status\//);
  const receiptToken = new URL(receipt.statusUrl, "http://localhost").searchParams.get("token");
  assert.equal(receiptToken.length, 48);
  assert.equal(
    database.get(
      "SELECT COUNT(*) AS count FROM contributions WHERE id = ?",
      receipt.id,
    ).count,
    1,
  );
  assert.equal(
    database.get(
      "SELECT email FROM contribution_contacts WHERE contribution_id = ?",
      receipt.id,
    ).email,
    "researcher@example.com",
  );
  const storedContact = database.get(
    "SELECT delete_after AS deleteAfter FROM contribution_contacts WHERE contribution_id = ?",
    receipt.id,
  );
  const storedContribution = database.get(
    "SELECT submitted_at AS submittedAt FROM contributions WHERE id = ?",
    receipt.id,
  );
  assert.equal(
    Math.round(
      (Date.parse(storedContact.deleteAfter) -
        Date.parse(storedContribution.submittedAt)) /
        86_400_000,
    ),
    150,
  );
  assert.equal(
    database.get(
      "SELECT email FROM contribution_contacts WHERE contribution_id = ?",
      "expired",
    ),
    undefined,
  );
  assert.notEqual(
    database.get(
      "SELECT status_token_hash AS statusTokenHash FROM contributions WHERE id = ?",
      receipt.id,
    ).statusTokenHash,
    receiptToken,
  );

  const statusResponse = await fetchWorker(
    receipt.statusUrl.replace("/contribute/status/", "/api/contributions/"),
    { headers: { accept: "application/json" } },
    { DB: database },
  );
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.deepEqual(
    {
      id: status.id,
      status: status.status,
      statusLabel: status.statusLabel,
    },
    {
      id: receipt.id,
      status: "received",
      statusLabel: "Awaiting intake review",
    },
  );
});

test("contribution API rejects cross-site and sensitive submissions", async () => {
  const database = new MemoryD1();
  const crossSite = await fetchWorker(
    "/api/contributions",
    contributionRequest(validProductContribution, {
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }),
    { DB: database },
  );
  assert.equal(crossSite.status, 403);

  const sensitive = await fetchWorker(
    "/api/contributions",
    contributionRequest({
      ...validProductContribution,
      type: "deployment",
      product: "adora",
      country: "NG",
      customer: "Example utility",
      sensitiveConfirmed: true,
      notes: "Site location 9.076500, 7.398600",
    }),
    { DB: database },
  );
  assert.equal(sensitive.status, 422);
  assert.match(
    JSON.stringify(await sensitive.json()),
    /Remove precise coordinates/,
  );

  const credentials = await fetchWorker(
    "/api/contributions",
    contributionRequest({
      ...validProductContribution,
      notes: "Provider login password=not-for-publication",
    }),
    { DB: database },
  );
  assert.equal(credentials.status, 422);
  assert.match(
    JSON.stringify(await credentials.json()),
    /Remove credentials/,
  );
  assert.equal(database.count("contributions"), 0);
});

test("contribution API enforces registry countries and categories", async () => {
  const database = new MemoryD1();
  const response = await fetchWorker(
    "/api/contributions",
    contributionRequest({
      ...validProductContribution,
      country: "US",
      category: "Uncontrolled category",
    }),
    { DB: database },
  );
  assert.equal(response.status, 422);
  const error = JSON.stringify(await response.json());
  assert.match(error, /African country/);
  assert.match(error, /registry taxonomy/);
  assert.equal(database.count("contributions"), 0);
});

test("contribution API enforces the daily intake limit", async () => {
  const database = new MemoryD1();
  for (let index = 0; index < 5; index += 1) {
    const response = await fetchWorker(
      "/api/contributions",
      contributionRequest({
        ...validProductContribution,
        product: `Grid Insight ${index}`,
        email: "",
      }),
      { DB: database },
    );
    assert.equal(response.status, 201);
  }
  const limited = await fetchWorker(
    "/api/contributions",
    contributionRequest({ ...validProductContribution, email: "" }),
    { DB: database },
  );
  assert.equal(limited.status, 429);
  assert.match(JSON.stringify(await limited.json()), /contribution limit/i);
});

test("review workspace is private and renders for an allowlisted reviewer", async () => {
  const signedOut = await fetchWorker("/review");
  assert.ok([302, 303, 307, 308].includes(signedOut.status));
  assert.match(signedOut.headers.get("location") ?? "", /signin-with-chatgpt/);

  const denied = await fetchWorker("/review", {
    headers: { "oai-authenticated-user-email": "reader@example.com" },
  });
  assert.equal(denied.status, 200);
  assert.match(await denied.text(), /Reviewer access required/);

  const database = new MemoryD1();
  const allowed = await fetchWorker(
    "/review",
    { headers: { "oai-authenticated-user-email": reviewerEmail } },
    { DB: database },
  );
  assert.equal(allowed.status, 200);
  const html = await allowed.text();
  assert.match(html, /<h1[^>]*>Review<\/h1>/i);
  assert.match(html, /Assertions/);
  assert.match(html, /Source rights/);
  assert.match(html, /Contributions/);
  assert.match(html, /Sign out/);
});

test("review API requires an allowlisted ChatGPT identity", async () => {
  const database = new MemoryD1();
  const signedOut = await fetchWorker(
    "/api/review/workspace",
    { headers: { accept: "application/json" } },
    { DB: database },
  );
  assert.equal(signedOut.status, 401);

  const denied = await fetchWorker(
    "/api/review/workspace",
    {
      headers: {
        accept: "application/json",
        "oai-authenticated-user-email": "reader@example.com",
      },
    },
    { DB: database },
  );
  assert.equal(denied.status, 403);

  const allowed = await fetchWorker(
    "/api/review/workspace",
    { headers: reviewerHeaders },
    { DB: database },
  );
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get("cache-control") ?? "", /no-store/);
  const workspace = await allowed.json();
  assert.deepEqual(workspace.assertionReviews, []);
  assert.deepEqual(workspace.sourceReviews, []);
  assert.deepEqual(workspace.contributions, []);
});

test("assertion review records decisions, audits changes, and detects conflicts", async () => {
  const database = new MemoryD1();
  const assertionId = "asrt_07227453704c923a";
  const decision = {
    decision: "accept",
    proposedValue: "",
    proposedEvidenceStatus: "",
    notes: "",
    sourceChecked: true,
    safetyChecked: true,
    expectedVersion: 0,
  };
  const saved = await fetchWorker(
    `/api/review/assertions/${assertionId}`,
    reviewRequest(decision),
    { DB: database },
  );
  assert.equal(saved.status, 200);
  const savedReview = await saved.json();
  assert.equal(savedReview.decision, "accept");
  assert.equal(savedReview.version, 1);
  assert.equal(database.count("assertion_reviews"), 1);
  assert.equal(database.count("review_audit_events"), 1);

  const stale = await fetchWorker(
    `/api/review/assertions/${assertionId}`,
    reviewRequest(decision),
    { DB: database },
  );
  assert.equal(stale.status, 409);

  const invalid = await fetchWorker(
    `/api/review/assertions/${assertionId}`,
    reviewRequest({
      decision: "reject",
      proposedValue: "",
      proposedEvidenceStatus: "",
      notes: "",
      sourceChecked: false,
      safetyChecked: false,
      expectedVersion: 1,
    }),
    { DB: database },
  );
  assert.equal(invalid.status, 422);
});

test("source rights decisions and contribution contact access are audited", async () => {
  const database = new MemoryD1();
  const sourceId = "src_3cbec379ee14aa70";
  const sourceReview = await fetchWorker(
    `/api/review/sources/${sourceId}`,
    reviewRequest({
      rightsStatus: "resolved",
      sourceLicense: "all_rights_reserved_factual_use",
      independenceClass: "independent_primary",
      notes: "Facts may be cited with a link; no source text will be republished.",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(sourceReview.status, 200);
  assert.equal((await sourceReview.json()).version, 1);
  assert.equal(database.count("source_reviews"), 1);

  const contribution = await fetchWorker(
    "/api/contributions",
    contributionRequest(validProductContribution),
    { DB: database },
  );
  assert.equal(contribution.status, 201);
  const receipt = await contribution.json();

  const workspaceResponse = await fetchWorker(
    "/api/review/workspace",
    { headers: reviewerHeaders },
    { DB: database },
  );
  assert.equal(workspaceResponse.status, 200);
  const workspaceText = await workspaceResponse.text();
  assert.match(workspaceText, new RegExp(receipt.id));
  assert.doesNotMatch(workspaceText, /researcher@example\.com/);
  assert.doesNotMatch(workspaceText, /statusTokenHash|status_token_hash/);

  const contact = await fetchWorker(
    `/api/review/contributions/${receipt.id}/contact`,
    {
      method: "POST",
      headers: reviewerHeaders,
      body: "{}",
    },
    { DB: database },
  );
  assert.equal(contact.status, 200);
  assert.equal((await contact.json()).contact.email, "researcher@example.com");

  const moderated = await fetchWorker(
    `/api/review/contributions/${receipt.id}`,
    reviewRequest({
      status: "triaged",
      reason: "Source and product identity checked; ready for evidence review.",
    }),
    { DB: database },
  );
  assert.equal(moderated.status, 200);
  assert.equal((await moderated.json()).status, "triaged");
  assert.equal(database.count("review_audit_events"), 3);

  const skippedReview = await fetchWorker(
    `/api/review/contributions/${receipt.id}`,
    reviewRequest({
      status: "accepted",
      reason: "Attempted to bypass the reviewed state.",
    }),
    { DB: database },
  );
  assert.equal(skippedReview.status, 409);

  const reviewed = await fetchWorker(
    `/api/review/contributions/${receipt.id}`,
    reviewRequest({
      status: "reviewed",
      reason: "Content, source, privacy and duplicate checks completed.",
    }),
    { DB: database },
  );
  assert.equal(reviewed.status, 200);
  assert.equal((await reviewed.json()).status, "reviewed");

  const accepted = await fetchWorker(
    `/api/review/contributions/${receipt.id}`,
    reviewRequest({
      status: "accepted",
      reason: "Ready to translate into a separately reviewed data pull request.",
    }),
    { DB: database },
  );
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).status, "accepted");
  assert.equal(database.count("review_audit_events"), 5);

  const invalidStatus = await fetchWorker(
    `/api/review/contributions/${receipt.id}`,
    reviewRequest({ status: "published", reason: "Not a valid moderation state." }),
    { DB: database },
  );
  assert.equal(invalidStatus.status, 422);
});

test("review export contains decisions and audit history without private contact data", async () => {
  const database = new MemoryD1();
  const saved = await fetchWorker(
    "/api/review/assertions/asrt_07227453704c923a",
    reviewRequest({
      decision: "needs_evidence",
      proposedValue: "",
      proposedEvidenceStatus: "",
      notes: "Find a source that independently confirms the product ownership claim.",
      sourceChecked: false,
      safetyChecked: false,
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(saved.status, 200);

  const exported = await fetchWorker(
    "/api/review/export",
    { headers: reviewerHeaders },
    { DB: database },
  );
  assert.equal(exported.status, 200);
  assert.match(
    exported.headers.get("content-disposition") ?? "",
    /batch-001-human-review-package\.json/,
  );
  const exportText = await exported.text();
  assert.match(exportText, /"publicationAuthorised": false/);
  assert.match(exportText, /needs_evidence/);
  assert.doesNotMatch(
    exportText,
    /contribution_contacts|statusTokenHash|status_token_hash|researcher@example\.com/,
  );
});

test("scheduled maintenance purges retained data and reports queue health", async () => {
  const database = new MemoryD1();
  database.run(
    `INSERT INTO contributions (
      id, submission_type, status, submitted_at, updated_at, evidence_url,
      sensitive_confirmed, status_token_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    "maintenance-fixture",
    "product",
    "received",
    "2020-01-01T00:00:00.000Z",
    "2020-01-01T00:00:00.000Z",
    "https://example.com/maintenance",
    0,
    "maintenance-token-hash",
  );
  database.run(
    "INSERT INTO contribution_contacts (contribution_id, email, delete_after) VALUES (?, ?, ?)",
    "maintenance-fixture",
    "expired@example.com",
    "2020-01-01T00:00:00.000Z",
  );
  database.run(
    "INSERT INTO contribution_rate_limits (key, window_started_at, count) VALUES (?, ?, ?)",
    "old-window",
    "2020-01-01",
    1,
  );

  const denied = await fetchWorker(
    "/api/operations/maintenance",
    { method: "POST", headers: { accept: "application/json" } },
    { DB: database },
  );
  assert.equal(denied.status, 401);

  const response = await fetchWorker(
    "/api/operations/maintenance",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Bearer operations-test-token",
      },
    },
    { DB: database },
  );
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.equal(report.expiredContactsDeleted, 1);
  assert.equal(report.expiredRateLimitsDeleted, 1);
  assert.equal(report.openContributions, 1);
  assert.equal(database.count("contribution_contacts"), 0);
  assert.equal(database.count("contribution_rate_limits"), 0);
  assert.equal(database.count("maintenance_runs"), 1);
  assert.equal(database.count("review_audit_events"), 1);

  const health = await fetchWorker(
    "/api/operations/health",
    {
      headers: {
        accept: "application/json",
        authorization: "Bearer operations-test-token",
      },
    },
    { DB: database },
  );
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "healthy");
});

test("reviewers can pause intake without affecting existing receipt data", async () => {
  const database = new MemoryD1();
  const paused = await fetchWorker(
    "/api/review/operations",
    reviewRequest({
      paused: true,
      reason: "Pause while investigating a privacy report.",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(paused.status, 200);
  const pausedStatus = await paused.json();
  assert.equal(pausedStatus.intakePaused, true);
  assert.equal(pausedStatus.intakeVersion, 1);

  const stale = await fetchWorker(
    "/api/review/operations",
    reviewRequest({
      paused: false,
      reason: "This browser has an outdated operations version.",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(stale.status, 409);
  assert.equal(
    database.get(
      "SELECT COUNT(*) AS count FROM review_audit_events WHERE record_type = 'operations'",
    ).count,
    1,
  );

  const blocked = await fetchWorker(
    "/api/contributions",
    contributionRequest(validProductContribution),
    { DB: database },
  );
  assert.equal(blocked.status, 503);
  assert.match(JSON.stringify(await blocked.json()), /temporarily paused/i);
  assert.equal(database.count("contributions"), 0);

  const resumed = await fetchWorker(
    "/api/review/operations",
    reviewRequest({
      paused: false,
      reason: "Privacy report resolved and intake can resume.",
      expectedVersion: 1,
    }),
    { DB: database },
  );
  assert.equal(resumed.status, 200);
  assert.equal((await resumed.json()).intakePaused, false);

  const accepted = await fetchWorker(
    "/api/contributions",
    contributionRequest(validProductContribution),
    { DB: database },
  );
  assert.equal(accepted.status, 201);
  assert.equal(database.count("contributions"), 1);
  assert.equal(
    database.get(
      "SELECT COUNT(*) AS count FROM review_audit_events WHERE record_type = 'operations'",
    ).count,
    2,
  );
});

test("bulk workbooks enter a private candidate queue and cannot upgrade weak evidence", async () => {
  const database = new MemoryD1();
  const payload = {
    filename: "africa-energy-software-map-bulk-import.xlsx",
    workbookHash: "a".repeat(64),
    headers: bulkHeaders,
    rows: [validBulkDeployment],
  };
  const response = await fetchWorker(
    "/api/review/bulk-imports",
    { ...reviewRequest(payload), method: "POST" },
    { DB: database },
  );
  assert.equal(response.status, 201);
  const record = await response.json();
  assert.equal(record.status, "candidate");
  assert.equal(record.rowCount, 1);
  assert.equal(record.entityCount, 3);
  assert.equal(record.plannedBatchCount, 1);
  assert.equal(database.count("bulk_imports"), 1);
  assert.equal(database.count("bulk_import_rows"), 1);
  assert.equal(
    database.get(
      "SELECT COUNT(*) AS count FROM review_audit_events WHERE record_type = 'bulk_import'",
    ).count,
    1,
  );

  const rowsResponse = await fetchWorker(
    `/api/review/bulk-import-rows?importId=${encodeURIComponent(record.id)}`,
    { headers: reviewerHeaders },
    { DB: database },
  );
  assert.equal(rowsResponse.status, 200);
  const rows = await rowsResponse.json();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rowKey, validBulkDeployment.row_key);
  assert.equal(rows[0].recordType, "deployment");
  assert.equal(rows[0].status, "candidate");
  assert.equal(rows[0].review, null);
  assert.equal(rows[0].promotedAssertionCount, 0);
  assert.equal(
    rows[0].payload.organisation_name,
    validBulkDeployment.organisation_name,
  );
  const rowId = rows[0].id;

  const privateSource = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "needs_evidence",
      amendments: {},
      sourceUrl: "http://127.0.0.1/evidence",
      sourceOpened: false,
      sourceDirect: false,
      sourceSupports: false,
      safetyChecked: false,
      notes: "The candidate needs a public source.",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(privateSource.status, 422);

  const uncheckedApproval = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "accept",
      amendments: {},
      sourceUrl: validBulkDeployment.source_url,
      sourceOpened: true,
      sourceDirect: false,
      sourceSupports: false,
      safetyChecked: false,
      notes: "",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(uncheckedApproval.status, 422);
  assert.equal(database.count("bulk_row_reviews"), 0);
  assert.equal(database.count("promoted_assertions"), 0);

  const evidenceRequested = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "needs_evidence",
      amendments: {},
      sourceUrl: validBulkDeployment.source_url,
      sourceOpened: true,
      sourceDirect: false,
      sourceSupports: false,
      safetyChecked: true,
      notes: "Find a direct customer page for this deployment.",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(evidenceRequested.status, 200);
  const requestedRecord = await evidenceRequested.json();
  assert.equal(requestedRecord.review.decision, "needs_evidence");
  assert.equal(requestedRecord.review.version, 1);
  assert.equal(requestedRecord.importStatus, "blocked");
  assert.equal(requestedRecord.promotedAssertionCount, 0);

  const silentAmendment = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "accept",
      amendments: { product_name: "Changed without Amend" },
      sourceUrl: validBulkDeployment.source_url,
      sourceOpened: true,
      sourceDirect: true,
      sourceSupports: true,
      safetyChecked: true,
      notes: "",
      expectedVersion: 1,
    }),
    { DB: database },
  );
  assert.equal(silentAmendment.status, 422);
  assert.match(JSON.stringify(await silentAmendment.json()), /Choose Amend/i);

  const accepted = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "accept",
      amendments: {},
      sourceUrl:
        "https://example.org/programme?utm_source=review&b=2&a=1#deployment",
      sourceOpened: true,
      sourceDirect: true,
      sourceSupports: true,
      safetyChecked: true,
      notes: "Direct customer source checked.",
      expectedVersion: 1,
    }),
    { DB: database },
  );
  assert.equal(accepted.status, 200);
  const acceptedRecord = await accepted.json();
  assert.equal(acceptedRecord.review.decision, "accept");
  assert.equal(
    acceptedRecord.review.normalizedSourceUrl,
    "https://example.org/programme?a=1&b=2",
  );
  assert.equal(acceptedRecord.importStatus, "reviewed");
  assert.ok(acceptedRecord.promotedAssertionCount > 10);
  assert.equal(
    database.count("promoted_assertions"),
    acceptedRecord.promotedAssertionCount,
  );

  const workspaceResponse = await fetchWorker(
    "/api/review/workspace",
    { headers: reviewerHeaders },
    { DB: database },
  );
  assert.equal(workspaceResponse.status, 200);
  const workspace = await workspaceResponse.json();
  assert.equal(
    workspace.promotedAssertions.length,
    acceptedRecord.promotedAssertionCount,
  );
  assert.equal(
    workspace.promotedAssertions[0].sourceUrl,
    "https://example.org/programme?a=1&b=2",
  );
  assert.equal(workspace.promotedSources.length, 1);
  assert.equal(workspace.promotedSources[0].sourceLicense, "unknown");

  const promotedSourceId = workspace.promotedSources[0].id;
  const sourceResolved = await fetchWorker(
    `/api/review/sources/${promotedSourceId}`,
    reviewRequest({
      rightsStatus: "resolved",
      sourceLicense: "factual_metadata_and_linking_only",
      independenceClass: "customer_or_official",
      notes: "Factual metadata and direct linking only.",
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(sourceResolved.status, 200);
  assert.equal(database.count("source_reviews"), 1);

  const promotedAssertionId = workspace.promotedAssertions[0].id;
  const assertionAccepted = await fetchWorker(
    `/api/review/assertions/${promotedAssertionId}`,
    reviewRequest({
      decision: "accept",
      proposedValue: "",
      proposedEvidenceStatus: "",
      notes: "",
      sourceChecked: true,
      safetyChecked: true,
      expectedVersion: 0,
    }),
    { DB: database },
  );
  assert.equal(assertionAccepted.status, 200);
  assert.equal(database.count("assertion_reviews"), 1);

  const rejected = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "reject",
      amendments: {},
      sourceUrl: validBulkDeployment.source_url,
      sourceOpened: true,
      sourceDirect: true,
      sourceSupports: false,
      safetyChecked: true,
      notes: "The source does not support the named deployment.",
      expectedVersion: 2,
    }),
    { DB: database },
  );
  assert.equal(rejected.status, 200);
  assert.equal((await rejected.json()).promotedAssertionCount, 0);
  assert.equal(database.count("promoted_assertions"), 0);
  assert.equal(database.count("assertion_reviews"), 0);
  assert.equal(database.count("source_reviews"), 0);

  const amended = await fetchWorker(
    `/api/review/bulk-import-rows/${rowId}`,
    reviewRequest({
      decision: "amend",
      amendments: { product_name: "Example Grid Suite Verified" },
      sourceUrl: validBulkDeployment.source_url,
      sourceOpened: true,
      sourceDirect: true,
      sourceSupports: true,
      safetyChecked: true,
      notes: "Product name corrected to match the direct source.",
      expectedVersion: 3,
    }),
    { DB: database },
  );
  assert.equal(amended.status, 200);
  const amendedRecord = await amended.json();
  assert.equal(amendedRecord.review.decision, "amend");
  assert.equal(amendedRecord.review.version, 4);
  assert.ok(amendedRecord.promotedAssertionCount > 10);
  assert.equal(
    database.get(
      "SELECT COUNT(*) AS count FROM promoted_assertions WHERE value = ?",
      "Example Grid Suite Verified",
    ).count > 0,
    true,
  );
  assert.equal(
    JSON.parse(
      database.get("SELECT payload_json AS payload FROM bulk_import_rows").payload,
    ).product_name,
    validBulkDeployment.product_name,
  );

  const reviewedRowsResponse = await fetchWorker(
    `/api/review/bulk-import-rows?importId=${encodeURIComponent(record.id)}`,
    { headers: reviewerHeaders },
    { DB: database },
  );
  const reviewedRows = await reviewedRowsResponse.json();
  assert.equal(reviewedRows[0].status, "amend");
  assert.equal(
    reviewedRows[0].effectivePayload.product_name,
    "Example Grid Suite Verified",
  );
  assert.equal(reviewedRows[0].review.version, 4);
  assert.equal(
    reviewedRows[0].promotedAssertionCount,
    amendedRecord.promotedAssertionCount,
  );
  assert.ok(
    database.get(
      "SELECT COUNT(*) AS count FROM review_audit_events WHERE record_type IN ('bulk_import_row', 'promoted_assertion')",
    ).count >= 7,
  );

  const bulkExportResponse = await fetchWorker(
    "/api/review/export",
    { headers: reviewerHeaders },
    { DB: database },
  );
  assert.equal(bulkExportResponse.status, 200);
  const bulkExport = await bulkExportResponse.json();
  assert.equal(bulkExport.schemaVersion, "1.1.0");
  assert.equal(bulkExport.status.bulkCandidateRows, 1);
  assert.equal(bulkExport.status.bulkCandidateDecisions, 1);
  assert.equal(bulkExport.bulkCandidates[0].review.decision, "amend");
  assert.equal(
    bulkExport.promotedAssertions.length,
    amendedRecord.promotedAssertionCount,
  );

  const hiddenRows = await fetchWorker(
    `/api/review/bulk-import-rows?importId=${encodeURIComponent(record.id)}`,
    {},
    { DB: database },
  );
  assert.equal(hiddenRows.status, 401);

  const duplicate = await fetchWorker(
    "/api/review/bulk-imports",
    { ...reviewRequest(payload), method: "POST" },
    { DB: database },
  );
  assert.equal(duplicate.status, 409);

  const invalid = await fetchWorker(
    "/api/review/bulk-imports",
    {
      ...reviewRequest({
        ...payload,
        workbookHash: "b".repeat(64),
        rows: [
          {
            ...validBulkDeployment,
            source_independence_class: "provider_authored",
            evidence_status: "independently_evidenced",
          },
        ],
      }),
      method: "POST",
    },
    { DB: database },
  );
  assert.equal(invalid.status, 422);
  assert.match(JSON.stringify(await invalid.json()), /cannot independently/i);
  assert.equal(database.count("bulk_imports"), 1);
});
