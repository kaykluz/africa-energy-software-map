# Batch 001 evidence review

Status: **AI-assisted research candidate — human editorial approval pending**

Research date: 2026-07-30

Scope:

- Beacon Power Services — CAIMS, Adora and Xepp
- PAM Africa — PAM-AI
- PowerLabs — Pai Enterprise
- four Nigeria deployment candidates
- 88 atomic assertions

The checked-in research overlay is
`data/imports/kaykluz-v0.1/reviews/batch-001.json`. It is an input to the
workbook importer, not a hand-edited output. This makes source corrections,
evidence classification and unresolved questions reproducible.

## Evidence decisions

| Subject | Decision | Strongest source | Boundary |
|---|---|---|---|
| Beacon and AEDC | Retain two active Abuja deployment records for CAIMS and Adora | [Proparco report, 23 April 2026](https://proparco.fr/en/news/beacon-power-services-harnessing-data-drive-africas-energy-transition) | Proparco is an investor. The report includes direct AEDC comment, but outcome figures remain excluded. |
| Beacon deployment year | Retain 2023 as the programme-support start year | [AFD article, 28 November 2024](https://www.afd.fr/en/actualites/digital-energy-challenge-africa-energy-transition) | The older programme page proves the partnership and year but does not, by itself, identify CAIMS or Adora. |
| Beacon product functions | Keep provider descriptions as provider claims | [CAIMS](https://beaconpowerservices.com/en/solutions/caims), [Adora](https://beaconpowerservices.com/en/solutions/adora), [Xepp](https://www.beaconpowerservices.com/en/solutions/xepp) | Provider pages cannot independently prove deployments or outcomes. |
| PAM-AI | Change product and deployment lifecycle from `pilot` to `active` | [Digital Energy project profile](https://digital-energy.eu/en/projects/pam-africa) | Programme evidence, not customer confirmation. Reported impact figures are not imported. |
| KEDCO deployment | Retain named customer but remove “Northern Nigeria” and reduce precision to country level | [Digital Energy project profile](https://digital-energy.eu/en/projects/pam-africa) | The source names KEDCO and Nigeria but does not publish a specific subnational deployment location. |
| Unnamed PAM mini-grids | Retain one country-level deployment with undisclosed customers | [Digital Energy project profile](https://digital-energy.eu/en/projects/pam-africa) | The source states four mini-grid developers; it does not identify customers or sites. |
| PowerLabs product | Correct `Pai` to `Pai Enterprise`, use the current domain and add a 2025 launch year | [TechCabal, 9 April 2026](https://techcabal.com/2026/04/09/powerlabs-wants-to-make-nigerias-grid-think/) | Product existence and launch are editorially reported. Detailed functionality remains provider-authored. |
| PowerLabs usage | Do not create deployments | [TechCabal](https://techcabal.com/2026/04/09/powerlabs-wants-to-make-nigerias-grid-think/) | The regional usage statement is attributed to the founder and names no customers. It is stored only as `claimed_availability`. |

## Corrected fields

The overlay records every changed field in `changes.csv`. Material corrections
include:

- current product-specific URLs for CAIMS, Adora and Xepp;
- Xepp access changed to `public_access` because the provider says the app is
  free to download and use;
- PAM-AI and its two deployment candidates changed from `pilot` to `active`;
- unsupported PAM subnational descriptions removed;
- PowerLabs moved from the obsolete `powerlabs.energy` URL to
  `powerlabstech.com`;
- `Pai` corrected to `Pai Enterprise`, with a June 2025 launch represented as
  year `2025`; and
- all reviewed records checked on 2026-07-30.

## Headquarters restraint

Two headquarters fields remain blank:

- Beacon has a Nigerian operating company and a US parent. Available sources do
  not establish one unambiguous group headquarters country.
- PAM Africa publishes both Lagos and London locations without labelling one as
  its headquarters.

This is intentional. A blank field is more accurate than forcing a corporate
structure into a single-country value.

## Evidence vocabulary

- `independently_evidenced` means the exact assertion is supported by a source
  separate from the provider. It does not mean the project has completed human
  editorial review.
- `provider_claim_only` is used for provider-authored product functions and for
  statements attributed to a provider within independent reporting.
- `customer_confirmed` is not used in this batch because no customer-owned
  publication was found.
- `public_source` is used where a public source supports visibility of the claim
  but the classification still involves editorial interpretation.

## Remaining editorial work

Before publication, a human editor must:

1. open every source and confirm the listed locator;
2. decide whether Proparco’s investor relationship changes the desired
   independence label for any Beacon assertion;
3. decide whether Digital Energy programme reporting is sufficient for PAM
   deployment publication without direct customer confirmation;
4. confirm the access-model classifications;
5. review the unresolved headquarters fields;
6. record their identity and review date; and
7. approve, amend or reject each candidate assertion.

No autonomous process may mark these steps complete.
