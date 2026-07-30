import assert from "node:assert/strict";
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
  contributions = new Map();
  contacts = new Map();
  rates = new Map();

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

class MemoryStatement {
  values = [];

  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replaceAll(/\s+/g, " ").trim();
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.startsWith("INSERT INTO contribution_rate_limits")) {
      const key = `${this.values[0]}|${this.values[1]}`;
      const count = this.database.rates.get(key) ?? 0;
      if (count >= this.values[2]) return null;
      this.database.rates.set(key, count + 1);
      return { count: count + 1 };
    }
    if (this.sql.includes("FROM contributions") && this.sql.includes("status_token_hash")) {
      const record = this.database.contributions.get(this.values[0]);
      return record?.statusTokenHash === this.values[1] ? record : null;
    }
    throw new Error(`Unsupported first statement: ${this.sql}`);
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO contributions (")) {
      this.database.contributions.set(this.values[0], {
        id: this.values[0],
        submissionType: this.values[1],
        status: "received",
        submittedAt: this.values[2],
        updatedAt: this.values[3],
        statusTokenHash: this.values[20],
      });
      return { success: true };
    }
    if (this.sql.startsWith("DELETE FROM contribution_rate_limits")) {
      return { success: true };
    }
    if (this.sql.startsWith("DELETE FROM contribution_contacts")) {
      for (const [id, contact] of this.database.contacts) {
        if (contact.deleteAfter <= this.values[0]) {
          this.database.contacts.delete(id);
        }
      }
      return { success: true };
    }
    if (this.sql.startsWith("INSERT INTO contribution_contacts")) {
      this.database.contacts.set(this.values[0], {
        email: this.values[1],
        deleteAfter: this.values[2],
      });
      return { success: true };
    }
    throw new Error(`Unsupported run statement: ${this.sql}`);
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

test("server-renders the Stack with candidate status and useful records", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /The software powering African energy/);
  assert.match(html, /Prototype data/);
  assert.match(html, /Candidate import/);
  assert.match(html, /CAIMS/);
  assert.match(html, /Adora/);
  assert.match(html, /PAYGo and mini-grid operations/);
  assert.match(html, /Skip to main content/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
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

test("server-renders reproducible candidate downloads and review status", async () => {
  const response = await render("/data");
  assert.equal(response.status, 200);
  const html = await response.text();
  const textHtml = html.replaceAll(/<!--.*?-->/g, "");
  assert.match(html, /<h1[^>]*>Data and downloads<\/h1>/i);
  assert.match(textHtml, /0 of\s+88 assertions reviewed/);
  assert.match(textHtml, /5 sources need metadata/);
  assert.match(html, /candidate-csv-package\.zip/);
  assert.match(html, /registry\.json/);
  assert.match(html, /assertions\.jsonl/);
  assert.match(html, /deployments\.geojson/);
  assert.match(html, /They remain candidate data/);
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
  database.contacts.set("expired", {
    email: "old@example.com",
    deleteAfter: "2020-01-01T00:00:00.000Z",
  });
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
  assert.equal(database.contributions.size, 1);
  assert.equal(database.contacts.get(receipt.id).email, "researcher@example.com");
  assert.equal(database.contacts.has("expired"), false);
  assert.notEqual(
    database.contributions.get(receipt.id).statusTokenHash,
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
  assert.equal(database.contributions.size, 0);
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
  assert.equal(database.contributions.size, 0);
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
