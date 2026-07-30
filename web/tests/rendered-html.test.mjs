import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${Math.random()}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
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
