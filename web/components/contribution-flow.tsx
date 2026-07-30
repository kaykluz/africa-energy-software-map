"use client";

import Link from "next/link";
import { africanCountries, categories, products } from "@/lib/registry-data";
import { type FormEvent, useEffect, useState } from "react";

type FlowType = "product" | "deployment" | "correction" | "claim";
type Receipt = {
  id: string;
  status: string;
  statusLabel: string;
  statusUrl: string | null;
};

const flowContent: Record<
  FlowType,
  {
    eyebrow: string;
    title: string;
    intro: string;
    steps: string[];
    submit: string;
  }
> = {
  product: {
    eyebrow: "Contribute · new product",
    title: "Submit a product",
    intro: "Propose a product and owning organisation for editorial research.",
    steps: ["Product", "Purpose", "Sources", "Review"],
    submit: "Send product for review",
  },
  deployment: {
    eyebrow: "Contribute · evidence",
    title: "Add a deployment",
    intro: "Connect a product to a safe geography, disclosure state and public source.",
    steps: ["Product", "Deployment", "Evidence", "Review"],
    submit: "Send deployment for review",
  },
  correction: {
    eyebrow: "Contribute · correction",
    title: "Correct a record",
    intro: "Identify an exact assertion and provide a sourced proposed value.",
    steps: ["Record", "Correction", "Evidence", "Review"],
    submit: "Send correction for review",
  },
  claim: {
    eyebrow: "Contribute · organisation",
    title: "Claim a profile",
    intro: "Verify your relationship and propose sourced updates without direct editing rights.",
    steps: ["Organisation", "Authority", "Updates", "Review"],
    submit: "Send claim for review",
  },
};

export function ContributionFlow({ type }: { type: FlowType }) {
  const content = flowContent[type];
  const [step, setStep] = useState(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [form, setForm] = useState({
    product: "",
    organisation: "",
    category: "",
    country: "NG",
    customerDisclosure: "named",
    customer: "",
    year: "",
    lifecycle: "pilot",
    field: "",
    proposedValue: "",
    source: "",
    relationship: "",
    authority: "",
    email: "",
    notes: "",
    sensitiveConfirmed: false,
    companyWebsite: "",
  });
  const storageKey = `aesm-contribution-draft-${type}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const timer = window.setTimeout(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as typeof form;
          setForm((current) => ({
            ...current,
            ...parsed,
            email: "",
            companyWebsite: "",
          }));
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!draftReady) return;
    const safeDraft = { ...form, email: "", companyWebsite: "" };
    window.localStorage.setItem(storageKey, JSON.stringify(safeDraft));
  }, [draftReady, form, storageKey]);

  function update(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
    setSubmitError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < content.steps.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...form }),
      });
      const result = (await response.json()) as
        | Receipt
        | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(
          "error" in result
            ? result.error?.message
            : "The contribution could not be saved.",
        );
      }
      setReceipt(result as Receipt);
      window.localStorage.removeItem(storageKey);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : "The contribution could not be saved. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <main className="form-page reading-width" id="main-content">
        <div className="submission-success">
          <span className="success-mark" aria-hidden="true">✓</span>
          <span className="eyebrow">Submission received</span>
          <h1>Thank you. Your contribution is in the editorial queue.</h1>
          <p>
            This does not mean the record is published or verified. A reviewer may
            contact you for clarification using the route provided.
          </p>
          <dl><div><dt>Submission ID</dt><dd className="mono">{receipt.id}</dd></div><div><dt>Status</dt><dd>{receipt.statusLabel}</dd></div></dl>
          <div>
            {receipt.statusUrl ? <Link className="button button-primary" href={receipt.statusUrl}>Track status</Link> : null}
            <button className="button button-outline" onClick={() => { setReceipt(null); setStep(0); }} type="button">Start another</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="form-page reading-width" id="main-content">
      <nav aria-label="Breadcrumb" className="breadcrumb"><Link href="/contribute">Contribute</Link><span aria-hidden="true">/</span><span>{content.title}</span></nav>
      <header>
        <span className="eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.intro} Nothing is published automatically.</p>
      </header>
      <ol aria-label="Form progress" className="form-progress">
        {content.steps.map((label, index) => (
          <li aria-current={step === index ? "step" : undefined} className={step >= index ? "active" : ""} key={label}>
            <span>{index + 1}</span><small>{label}</small>
          </li>
        ))}
      </ol>
      <form onSubmit={submit}>
        <label aria-hidden="true" className="honeypot-field">
          Company website
          <input
            autoComplete="off"
            name="company-website"
            onChange={(event) => update("companyWebsite", event.target.value)}
            tabIndex={-1}
            value={form.companyWebsite}
          />
        </label>
        <div className="form-step">
          <span className="eyebrow">Step {step + 1} of {content.steps.length}</span>
          <h2>{content.steps[step]}</h2>
          {step === 0 ? <FirstStep form={form} type={type} update={update} /> : null}
          {step === 1 ? <DetailStep form={form} type={type} update={update} /> : null}
          {step === 2 ? <EvidenceStep form={form} type={type} update={update} /> : null}
          {step === 3 ? <ReviewStep form={form} type={type} /> : null}
        </div>
        <div className="form-actions">
          {step ? <button className="button button-outline" onClick={() => setStep((current) => current - 1)} type="button">Back</button> : <Link className="button button-outline" href="/contribute">Cancel</Link>}
          <button className="button button-primary" disabled={submitting} type="submit">{submitting ? "Sending…" : step === content.steps.length - 1 ? content.submit : "Continue"}</button>
        </div>
        {submitError ? <p className="submission-error" role="alert">{submitError}</p> : null}
      </form>
      <p className="draft-note">A non-sensitive draft is stored only in this browser. Contact email is sent only with the final contribution, stored separately and scheduled for deletion.</p>
    </main>
  );
}

function FirstStep({ form, type, update }: StepProps) {
  if (type === "product") {
    return <>
      <Field label="Product name" required><input onChange={(event) => update("product", event.target.value)} required value={form.product} /></Field>
      <Field helper="Use the current legal or trading name." label="Owning organisation" required><input onChange={(event) => update("organisation", event.target.value)} required value={form.organisation} /></Field>
      <div className="duplicate-notice"><strong>Duplicate check</strong><p>Existing candidate products will be compared before intake. If this is an update, use Correct a record instead.</p></div>
    </>;
  }
  if (type === "claim") {
    return <>
      <Field label="Organisation" required><select onChange={(event) => update("organisation", event.target.value)} required value={form.organisation}><option value="">Select organisation</option><option>Beacon Power Services</option><option>PAM Africa</option><option>PowerLabs</option></select></Field>
      <Field helper="Use your organisation-domain address. It is not stored in the local draft." label="Work email" required><input onChange={(event) => update("email", event.target.value)} required type="email" value={form.email} /></Field>
    </>;
  }
  return <>
    <Field label={type === "correction" ? "Record to correct" : "Product"} required><select onChange={(event) => update("product", event.target.value)} required value={form.product}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.slug}>{product.name} · {product.organisation}</option>)}</select></Field>
    {type === "correction" ? <Field label="Field or assertion" required><input onChange={(event) => update("field", event.target.value)} placeholder="For example: deployment year" required value={form.field} /></Field> : null}
  </>;
}

function DetailStep({ form, type, update }: StepProps) {
  if (type === "deployment") {
    return <>
      <Field helper="Country or safe subnational area only. Never enter exact infrastructure coordinates." label="Country" required><select onChange={(event) => update("country", event.target.value)} required value={form.country}>{africanCountries.map(([iso2, name]) => <option key={iso2} value={iso2}>{name}</option>)}</select></Field>
      <fieldset className="field-group"><legend>Customer disclosure</legend><label><input checked={form.customerDisclosure === "named"} name="disclosure" onChange={() => update("customerDisclosure", "named")} type="radio" /> Named customer</label><label><input checked={form.customerDisclosure === "undisclosed"} name="disclosure" onChange={() => update("customerDisclosure", "undisclosed")} type="radio" /> Customer undisclosed</label></fieldset>
      <Field helper={form.customerDisclosure === "undisclosed" ? "Do not enter the confidential name. Describe only the publishable verification basis in Notes." : ""} label={form.customerDisclosure === "undisclosed" ? "Publishable customer description" : "Customer name"} required><input onChange={(event) => update("customer", event.target.value)} required value={form.customer} /></Field>
      <div className="field-row"><Field label="Start year"><input inputMode="numeric" maxLength={4} onChange={(event) => update("year", event.target.value)} value={form.year} /></Field><Field label="Lifecycle"><select onChange={(event) => update("lifecycle", event.target.value)} value={form.lifecycle}><option value="live">Live</option><option value="pilot">Pilot</option><option value="historical">Historical</option></select></Field></div>
    </>;
  }
  if (type === "correction") return <Field helper="State the replacement exactly as it should appear." label="Proposed value" required><textarea onChange={(event) => update("proposedValue", event.target.value)} required rows={4} value={form.proposedValue} /></Field>;
  if (type === "claim") return <><Field label="Role and authority" required><textarea onChange={(event) => update("authority", event.target.value)} required rows={4} value={form.authority} /></Field><div className="claim-notice"><strong>Claiming grants no direct editing rights.</strong><p>It also does not independently verify deployments or outcomes.</p></div></>;
  return <><Field label="What does the product do?" required><textarea onChange={(event) => update("notes", event.target.value)} required rows={5} value={form.notes} /></Field><Field label="Primary category" required><select onChange={(event) => update("category", event.target.value)} required value={form.category}><option disabled value="">Select category</option>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></Field></>;
}

function EvidenceStep({ form, type, update }: StepProps) {
  return <>
    <Field helper="Use a direct public page, document or repository URL. Search results and generated summaries are not evidence." label="Source URL" required><input onChange={(event) => update("source", event.target.value)} placeholder="https://" required type="url" value={form.source} /></Field>
    <Field label="Your relationship to this source or record"><select onChange={(event) => update("relationship", event.target.value)} value={form.relationship}><option value="">Select relationship</option><option value="provider">Product provider</option><option value="customer">Customer or user</option><option value="researcher">Independent researcher</option><option value="public">Public-source contributor</option></select></Field>
    {type !== "claim" ? <Field helper="Optional. Stored privately and separately from the contribution." label="Contact email"><input onChange={(event) => update("email", event.target.value)} type="email" value={form.email} /></Field> : null}
    <Field helper="Do not paste confidential excerpts, personal contacts or credentials." label="Notes for the reviewer"><textarea onChange={(event) => update("notes", event.target.value)} rows={4} value={form.notes} /></Field>
    {type === "deployment" ? <label className="source-toggle sensitive-check"><input checked={form.sensitiveConfirmed} onChange={(event) => update("sensitiveConfirmed", event.target.checked)} required type="checkbox" /><span><strong>I have not included sensitive infrastructure data</strong><small>No exact non-public coordinates, vulnerabilities, credentials or confidential identity clues.</small></span></label> : null}
  </>;
}

function ReviewStep({ form, type }: Omit<StepProps, "update">) {
  return <div className="review-card"><p>Review the publishable summary. A human editor will assess the source, wording, independence and privacy.</p><dl>{form.product ? <div><dt>{type === "product" ? "Product" : "Record"}</dt><dd>{form.product}</dd></div> : null}{form.organisation ? <div><dt>Organisation</dt><dd>{form.organisation}</dd></div> : null}{form.category ? <div><dt>Category</dt><dd>{form.category}</dd></div> : null}{form.country ? <div><dt>Country</dt><dd>{form.country}</dd></div> : null}{form.customer ? <div><dt>Customer disclosure</dt><dd>{form.customerDisclosure === "undisclosed" ? "Customer undisclosed" : form.customer}</dd></div> : null}{form.field ? <div><dt>Field</dt><dd>{form.field}</dd></div> : null}{form.proposedValue ? <div><dt>Proposed value</dt><dd>{form.proposedValue}</dd></div> : null}{form.source ? <div><dt>Source</dt><dd>{form.source}</dd></div> : null}</dl><div className="dialog-notice"><strong>Submission status</strong><p>The submission enters editorial review. It is not published or verified automatically.</p></div></div>;
}

type StepProps = {
  form: {
    product: string; organisation: string; category: string; country: string; customerDisclosure: string;
    customer: string; year: string; lifecycle: string; field: string; proposedValue: string;
    source: string; relationship: string; authority: string; email: string; notes: string; sensitiveConfirmed: boolean; companyWebsite: string;
  };
  type: FlowType;
  update: (name: string, value: string | boolean) => void;
};

function Field({ label, helper, required, children }: { label: string; helper?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}{required ? <b aria-hidden="true"> *</b> : null}</span>{children}{helper ? <small>{helper}</small> : null}</label>;
}
