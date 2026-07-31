# Moderated accessibility and user-testing protocol

Status: protocol ready; participant sessions not yet completed

Last updated: 31 July 2026

## Purpose

Test whether people can find, understand, compare, export and improve the map
without learning the interface first. Automated checks are a preflight only.
Moderated sessions are required because semantic markup cannot reveal whether
the evidence model, map alternative, labels or navigation make sense in use.

## Participant mix

Recruit six to eight participants. A person may represent more than one group.

- two energy researchers, academics or data journalists;
- two utility, mini-grid, regulator or programme users working with African
  energy data;
- two software providers, implementers or contributors;
- at least two blind or low-vision screen-reader users;
- at least one keyboard-only or switch user; and
- at least two people who regularly work on a mobile device or constrained
  connection.

Do not recruit only project insiders. Pay participants consistently. Collect the
minimum contact and access-needs information needed to schedule and support the
session, then delete it under the research retention plan.

## Test conditions

Run 45 to 60 minute remote sessions against the same reviewed site version.
Record the version, viewport, browser, operating system, assistive technology and
connection treatment. Obtain explicit consent before recording. Notes must not
contain unnecessary personal information or confidential infrastructure data.

Each participant uses their normal setup. Across the sample, cover:

- keyboard-only operation;
- VoiceOver with Safari and NVDA with Firefox or Chrome;
- 200% and 400% zoom;
- reduced motion;
- a 320 CSS-pixel reflow view; and
- a throttled or genuinely constrained mobile connection.

## Preflight record

On 31 July 2026, a keyboard smoke test against production confirmed that the
Skip link was first in the focus order but only scrolled the page; it left focus
on `body`. The implementation branch makes every `#main-content` landmark
programmatically focusable and adds this requirement to the rendered-route test.
That fix must be retested after deployment.

The repository also checks one H1, one main landmark, English document language,
the primary navigation label, live result announcements, focus-visible styling,
reduced-motion styling and the country-grid alternative on core routes. These
checks do not replace screen-reader, zoom, mobile, slow-connection or moderated
participant sessions.

## Facilitator script

1. Explain that the product, not the participant, is being tested.
2. Ask the participant to think aloud, but do not explain the navigation or the
   evidence labels.
3. Confirm consent and preferred access setup.
4. Start from the homepage with no task-specific filters applied.
5. Read one task at a time. Offer neutral clarification only.
6. After each task ask: “What did you expect to happen?” and “What, if anything,
   felt unclear?”
7. Finish with a short debrief and explain how findings will be used.

### Tasks

1. Find a software product that supports electricity distribution operations.
2. Find where that product is used in Africa without relying only on the visual
   map.
3. Identify whether one deployment is independently evidenced or only claimed by
   a provider, then open the supporting source.
4. Narrow the directory to one country and one category, share or reopen that
   state, and return with Back without losing the filters.
5. Export the filtered results and explain what the export contains.
6. Find an inaccurate or incomplete entry and start a correction without
   submitting real sensitive information.
7. On mobile or zoomed layout, open and close search or the menu, then continue
   from the point where focus returns.

For screen-reader participants, also ask them to describe the page structure,
result count changes, evidence status and the non-map geography alternative.
For keyboard participants, observe focus order, visibility, trapping and Escape
behaviour without directing their key choices.

## Observation record

Create one private record per session with no names in GitHub:

```text
Session ID:
Site version and date:
Participant groups represented:
Browser / OS / assistive technology:
Viewport, zoom, motion and connection treatment:
Recording consent: yes / no

Task 1–7 for each:
- completed independently / completed with help / not completed
- route taken
- barrier or misunderstanding
- participant wording, paraphrased unless quotation consent was explicit

Findings:
- short title
- affected route and control
- expected behaviour
- observed behaviour
- access impact
- reproducibility
- suggested design response, if any
```

Never put participant email, disability history, recordings or unredacted notes
in a GitHub issue.

## Severity and decision rules

| Severity | Meaning | Release treatment |
| --- | --- | --- |
| Blocker | A core task cannot be completed by an affected participant | Do not launch publicly |
| High | A core task requires help, loses data/context, or creates a serious evidence misunderstanding | Fix and retest before launch |
| Moderate | Task is possible but inefficient, confusing or inconsistent | Prioritise for the next tested build |
| Low | Cosmetic or low-frequency friction with a usable workaround | Record and schedule |

Public launch requires:

- no unresolved blocker or high accessibility findings;
- every core task completed independently by at least one person in each relevant
  participant group;
- evidence classes understood without facilitator explanation;
- geography usable through a non-spatial alternative;
- filtered export and contribution routes usable with keyboard and screen reader;
- fixes retested with the participant setup that exposed the barrier; and
- privacy and licence wording accepted by the editorial owner.

## Finding workflow

File one GitHub issue per de-identified finding. Link the site version, route,
task, access setup, severity and reproducible steps. Keep recordings and raw
notes in the approved private research store. The issue may link to the private
session ID but must not expose participant identity.

Issue #9 remains open until the sessions, fixes and retests meet the exit rules.
