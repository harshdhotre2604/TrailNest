# AI Integration — Status & Roadmap

> Companion to `AI_Integration_MTS.pdf` (the internal product note proposing AI opportunities
> for MyTripStays). This file tracks what's actually been **built and tested** in trailnest
> against that proposal, and what's still ahead. trailnest is a standalone testing/demo
> sandbox — nothing described here has touched the real MyTripStays codebase or production
> data.

---

## 1. What this is for

The PDF lays out several places AI could help across the platform (§00–§05). Rather than
build any of that against the real app, we're proving the idea out inside **trailnest** — the
DevOps-capstone reference project at `Docker Project/trailnest/` — because it already mirrors
the real stack's shape (Express + MySQL + a real submission form) without any risk to
production code, data, or the manual-deploy flow.

**The "Add property" form is now a full 13-step wizard**, rebuilt to match the real
MyTripStays `SubmitPropertyV2Page.jsx` step-for-step (Basic Info → Location → Property Type &
Vacation → Experience Builder → Package Builder → Room Configuration → Amenities → Activities →
Media Center → Pricing → Corporate & Event → Compliance & Payouts → Review & Submit) — this
supersedes the earlier single-page version this doc originally described. Two deliberate
differences from the real form, both scope decisions rather than gaps:

- TrailNest listings are single bookable units (cabin/cottage/villa/…), not multi-room hotel
  inventory, so "rooms" is a new concept here rather than a port of an existing one — the
  wizard models it (`property_rooms`, with a single flagged row standing in for "the whole
  property" when booking model = entire) so the step structure still matches.
- Reference/dropdown data (property types, vacation types, room types, KYC ID types, etc.) is
  **hardcoded JS constants**, not DB-backed master tables like the real project's
  `GET /api/master/:type` — a deliberate simplicity trade-off, not a limitation of the AI work.

This full rebuild exists specifically so the AI work below has a realistic, full-depth form to
target — mirroring the PDF's actual problem statement (a 13-step form with real drop-off risk),
not a simplified stand-in for it.

---

## 2. What's done

Two independent AI features now exist on the form. They share one Gemini-backed service file
but are otherwise separate — a failure in one never affects the other or the manual form.

### Feature A: "Polish with AI" — per-field assist (Basic Info step)

**Maps to PDF §02D + §02B.** Unchanged in behavior from the original single-page version of
this form:

1. Owner writes a rough description and uploads photos as normal.
2. Clicks **"✨ Polish with AI"** next to the Description field — sends the description text +
   up to 5 photos to Gemini.
3. Gets back a polished description and a list of amenities Gemini can visually confirm,
   matched against the real property-amenity vocabulary — each with its own **Use/Apply** or
   **Discard**, nothing auto-applied.

### Feature B: "AI Form Helper" — whole-form draft from any input (new)

**Maps to PDF §02A (describe-then-confirm intake), extended beyond text to also cover photos,
PDFs, an external listing link, and other documents** — the fuller version of §02A's "one text
box, AI extracts everything" idea the original doc said wasn't literally implemented yet.

**Flow:**

1. On a genuinely fresh, empty draft, Step 1 (Basic Info) shows a dismissible **"New here?"**
   banner offering to draft a starting point instead of filling everything by hand.
2. Owner shares any mix of: free text, a link to where the property is already listed
   elsewhere, up to 5 photos, up to 2 PDFs, up to 2 `.docx`/`.txt` documents.
3. Backend extracts usable text from each input (see below) and sends it all to Gemini in one
   call, constrained to a JSON schema covering **descriptive fields only**.
4. Owner lands on a **review screen** — every suggested field and every suggested
   amenity/experience/room is its own checkbox, individually accept-or-discard (plus warnings
   Gemini surfaces about what it couldn't confidently determine).
5. Accepted values merge into the wizard's draft state; the owner is dropped back at Step 1
   with those fields prefilled and walks the rest of the wizard normally — pricing, media, and
   Compliance & Payouts are never touched by this feature and always stay manual.

**What each input type does server-side:**

| Input | Handling |
|---|---|
| Free text | Passed straight through as context. |
| Photos | Sent to Gemini as inline image data — same mechanism Feature A already used. |
| PDF | Sent to Gemini as inline PDF data — Gemini reads PDFs natively, no extraction library needed. |
| `.docx` / `.txt` | Text extracted server-side (`mammoth` for `.docx`, direct read for `.txt`) before being sent — Gemini never receives the raw file. |
| Link | Fetched **server-side** with SSRF protections (below), stripped to visible text with `cheerio` (scripts/styles/iframes removed), truncated to ~20k chars — Gemini never fetches URLs itself and never sees raw HTML. |

**Response schema is a hard whitelist** — title, description, category, booking model,
vacation type, pure-veg flag, city/state (+ a confidence level, since the model isn't given our
small hardcoded location list to constrain against), property/room amenity names (matched
against the real vocabulary, same as Feature A), dietary options, draft experiences
(type/title/description — **no price**), draft rooms (name/description — **no price**), and a
`warnings` array. The service function's signature has **no parameter at all** for pricing,
owner details, KYC, bank, or commission data — those can't reach the model even by accident,
this isn't just a prompt instruction.

**Where it lives:**

| Piece | Path |
|---|---|
| Gemini calls (both features) | `backend/src/services/ai_service.js` |
| Request handling (Feature A) | `backend/src/controllers/ai.controller.js` → `analyzeProperty` |
| Request handling (Feature B) | `backend/src/controllers/ai.controller.js` → `draftProperty` |
| SSRF-safe link fetch | `backend/src/services/safeFetch.js` |
| `.docx`/`.txt` extraction | `backend/src/services/docText.js` |
| Routes (auth + rate limits) | `backend/src/routes/ai.routes.js` — `POST /api/ai/analyze-property` (20/hr), `POST /api/ai/draft-property` (10/hr, tighter given heavier multi-file payloads) |
| Amenities list (+ `type` column) | `backend/src/controllers/amenities.controller.js`, `backend/src/routes/amenities.routes.js` |
| Property + room image/video upload | `backend/src/middleware/upload.js` |
| Property create (one transaction, all 13 steps' tables) | `backend/src/controllers/properties.controller.js`, `backend/src/services/property.service.js` |
| Hardcoded reference data | `backend/src/constants/propertyOptions.js` (backend), `frontend/lib/propertyOptions.js` (frontend — duplicated by hand, no shared-types setup in this repo) |
| Wizard shell + Feature A UI | `frontend/app/dashboard/properties/new/page.js` |
| Feature B UI | `frontend/components/property-wizard/AiFormHelper.jsx` (intake), `AiSuggestionsReview.jsx` (review/accept) |
| Draft autosave/resume (localStorage) | `frontend/lib/usePropertyDraft.js` |
| API client | `frontend/lib/api.js` |
| Schema | `db/schema.sql` — `properties` (extended), `amenities` (+`type`), `property_amenities` (+`scope`), `property_images` (+`room_id`), plus 14 new tables covering rooms/experiences/packages/meal plans/activities/videos/event facilities/**`property_compliance`** |
| Seed data | `db/seed.sql`, `db/seed_amenities.sql` |

**Guardrails carried over from the PDF's §08:**

- **KYC/bank/commission data is structurally unreachable by AI code.** It lives in its own
  `property_compliance` table, which nothing under `ai.controller.js`/`ai_service.js` ever
  queries — and Feature B's response schema has no fields for it regardless. This matches the
  PDF's Fig. 4 exactly: the AI layer only ever sees descriptive content.
- AI only ever suggests; a human confirms every field (Feature A's Use/Discard, Feature B's
  per-item review screen) before anything is applied, and confirms again at Review & Submit
  before anything is saved.
- Rate-limited and file-capped for cost control: 20/hr + 5 photos (5MB each) for Feature A;
  10/hr + 5 photos/2 PDFs (10MB each)/2 docs (2MB each) for Feature B.
- Link fetching is SSRF-guarded: only `http`/`https`, hostname *and every redirect hop* (up to
  3) checked against loopback/private/link-local/cloud-metadata IP ranges before connecting,
  8s timeout, 3MB response cap. Verified directly: rejects `127.0.0.1`, `localhost`,
  `169.254.169.254`, `ftp://`, and malformed URLs; successfully fetches and extracts text from
  a real public page.
- Graceful fallback is proven, not just designed-for: a real bug surfaced during testing
  (Gemini rejects an empty string as an enum value, which `vacationType`'s schema briefly had)
  and the UI degraded exactly as intended — a dismissible "AI Form Helper is temporarily
  unavailable, you can fill in the form manually" message, wizard otherwise fully usable.

---

## 3. Known gaps / not yet cleaned up

- ~~**`docker-compose.yml` still doesn't pass `GEMINI_API_KEY` through to the backend
  container**~~ — fixed and verified: the backend service takes `GEMINI_API_KEY: ${GEMINI_API_KEY:-}`,
  `.env.example` documents it as optional, and a full `docker compose up` on 2026-09-06
  confirmed both AI endpoints working through the container (`/api/ai/analyze-property` and
  `/api/ai/draft-property` both returned real Gemini output).
- ~~**Local dev MySQL is actually MariaDB 10.4**, not the `mysql:8.0` the compose file
  defines~~ — resolved: verified against the real `mysql:8.0` container on 2026-09-06. Fresh
  `docker compose down -v` + `up` ran all three init scripts (`01-schema` / `02-seed` /
  `03-seed-amenities`) with no errors; 20 tables created, seed counts correct (6 properties,
  24 amenities, 4 leads).
- **Feature B's location guess is free text**, not matched against our hardcoded state/city
  list (that list is too small to meaningfully constrain a real address to). When it doesn't
  match, the wizard falls back to the "custom location" path and the owner may still need to
  manually pick a state from the dropdown to satisfy validation.
- ~~**`.docx` extraction hasn't been exercised through a live end-to-end request**~~ — done
  2026-09-06: a real `.docx` posted to `/api/ai/draft-property` through the running container
  was extracted by `mammoth` and produced a correct structured draft (title, category, city,
  matched amenities). Photos, PDF, text, and link input were already verified live.
- The stale **"Om Farm & Resort"** test property mentioned in earlier notes no longer exists —
  the local `trailnest_dev` database was dropped and recreated from the current
  `db/schema.sql` + seed files while building the 13-step wizard (needed to pick up ~14 new
  tables; safe, since it's explicitly fictional local-only seed data per those files' own
  headers).

---

## 4. Roadmap (from the PDF, not yet built)

- **§02C — Adaptive step order.** Not built. More directly applicable now than when this doc
  was first written, since the form is a real multi-step wizard rather than a single page —
  e.g. Corporate & Event and Package Builder could be skipped for listings that clearly don't
  need them.
- **§02E — Resume nudges.** Partially covered: the wizard autosaves to `localStorage` and
  resumes an in-progress draft on return (`usePropertyDraft.js`), so the underlying "don't lose
  an abandoned submission" problem is handled. The PDF's specific idea — an AI-drafted
  reminder pushed by email/WhatsApp after a day of inactivity — is not built.
- **§02F — Admin review summary.** AI-generated one-paragraph summary + flag list for a
  reviewer. trailnest has no moderation queue yet (properties publish immediately) — would
  need that built first.

Further out, explicitly deferred (per the PDF's own phasing, §07):

- **§03 — AI for activity listings** (same idea, applied to a different form). Not started.
- **§04 — Conversational search & trip planner.** Bigger lift, needs its own scoping pass.
- **§05 — Elsewhere in the platform** (leads triage, admin analytics copilot, guest support
  chat, listing fraud/quality checks, owner pricing suggestions, multilingual listings). None
  started; each would be its own small project like this one.

**Explicitly out of scope for trailnest, always:** none of this work is intended to be ported
into the real MyTripStays codebase directly. trailnest exists to let the idea be demoed and
validated risk-free; if/when a feature is approved for real, it gets built fresh against the
real app's actual schema, auth, and RBAC — not copy-pasted from here.
