# For Harsha — how this thing actually works

Plain-language notes on the parts of the dashboard that are easy to get wrong.
Technical docs live next to this file; this one is the "why", the war stories, and
the traps. Add a section whenever a feature ships or a bug teaches us something.

---

## The Quote Register (`/quote/admin`)

### What it is

A register of every quote the sales team has put in front of a prospect: which
accounts we quoted, which pricing options they were offered, by which AM, and
where each quote stands. It is **not** a revenue dashboard. It deliberately
shows no headline money figure.

Think of it as the filing cabinet behind the quote generator. The generator
(`/quote/cost`) writes a row every time someone downloads a PDF; the register is
the drawer you open to see what's in there.

### The mental model: a quote is a menu, not a bill

This is the single most important idea, and it's the one the first version got
wrong.

A myRA quote usually offers the client **several options**: "1 user for
$12.5K, or 5 users for $50K". The client picks **one**. So a quote has a
*range* of value (cheapest option to most expensive option), never a *total*.

The first version of the register summed every option and called the result
"Total contracted: $14.3M". For CEVA Logistics that meant a quote offering
$12.5K *or* $50K was stored as $62,500. 58 of the first 96 quotes had two to
five options, so the headline was fiction.

The register now:

- stores each option separately (`quotes.pricing_options`, one row per option),
- stores `value_min` and `value_max` per quote (cheapest / priciest option),
- shows the options as chips on the account row ("1-Yr · 5 users · $50K") and
  as a table when you expand,
- never adds options together anywhere.

`quotes.total_value` still exists because older reporting queries read it. It
now equals `value_max` (the priciest option). Treat it as legacy; don't build
new aggregates on it.

### Structure of the page

```
Hero        "Quotes register"   ·   N accounts · N quotes · N options (in view)
Filter bar  search | Prepared by (multi) | date range | Clear filters
            Term chips · Pricing chips · Status chips · Options chips · Users chips
            Active-filter pills (each removable) · "Showing X of Y"
List        one row per ACCOUNT (company), newest quote first
              ▸ expand → every quote version, each with its options table
              reference click → read-only drawer with full detail
```

**Account-first.** Quotes are grouped by company name (case- and
whitespace-insensitive). Same company, different contact → same account. A
company that got three revised quotes shows as one row with "3 quotes".

**Filters are OR within a group, AND across groups.** "Term: 1-Year, 2-Year" +
"AM: Satish" = quotes by Satish that offered *at least one* 1-year or 2-year
option. Option filters match if *any* option on the quote satisfies them.

**Filters and sort live in the URL** (`?term=1-Year&am=Satish+Boini&sort=company`).
Copy the link to share a view; the browser Back button undoes a change.

**Small things that are deliberate.** Every facet chip shows how many quotes
sit behind it and mutes itself at zero. Clicking an AM's name on a row filters
to that AM. When every option on a quote shares a term, the term is stated
once so the chips read as the real choice: seats and price. Search matches
are highlighted. Relative dates carry the exact date on hover. Month dividers
appear when sorted by date. "Export CSV" downloads exactly what's in view, one
line per option. The drawer has a copy button for the reference.

**Status is read-only here.** It is shown and filterable, but not editable on
this page. The `PATCH /api/quote/[id]` endpoint still exists for whatever
changes status elsewhere.

### Status lifecycle

| Stored status | Meaning |
|---|---|
| `draft` | Generated / downloaded, not yet sent to the client |
| `sent` | Sent to the client (`first_sent_at` is stamped on the first move to `sent`) |
| `accepted` | Client accepted an option |
| `declined` | Client declined |

`valid_until` is shown on each quote but does not change its status. An
earlier version derived an "expired" status from it; that hid most of the
list behind a red badge and was removed. Status is only what the team set.

Old rows had `downloaded` and `signed`; the migration folded those into `draft`
and `accepted`. "Downloaded" is an event (we keep `download_count`), not a
stage.

### Where the code lives

| Piece | Path |
|---|---|
| Pure logic (parse money, flatten options, group by account, filter matching, URL ↔ filters) | `lib/quote/register.ts` + tests in `lib/quote/__tests__/` |
| Save payload builder used by the generator | `lib/quote/savePayload.ts` |
| Zod schemas for save / status PATCH | `lib/validation/schemas/quote.ts` |
| API: register data | `app/api/quote/list/route.ts` |
| API: save from the generator | `app/api/quote/save/route.ts` |
| API: single quote + status PATCH | `app/api/quote/[id]/route.ts` |
| Page | `app/quote/admin/page.tsx` |
| Layout, Roobert font, scoped myRA tokens | `app/quote/admin/layout.tsx`, `app/quote/admin/register.css` |
| UI pieces | `components/quote/admin/*` (RegisterHeader, FilterBar, FacetChip, AmMultiSelect, ActivePills, AccountRow, QuoteVersionCard, OptionsTable, StatusBadge, AmAvatar) |
| Brand assets | `public/logo-myra.svg` (drop the real wordmark here), `public/fonts/roobert/*` |
| Drawer | `components/quote/QuoteDetailDrawer.tsx` |
| Migration | `supabase/migrations/20260922_quote_register.sql` |

Everything in `register.ts` is side-effect free so the API route, the page, and
the tests share one definition of "what is an option" and "does this quote
match these filters". If you need a new filter, add it there first, write the
test, then wire the chip.

### Look and feel

The register follows the myRA product-app design system, light theme: Roobert
at weight 500 by default, one violet ramp (`#6337FA` primary, `#A86DFF`
accent), hairline borders, neutral ink shadows, and exactly one primary CTA per
view. All tokens live in `app/quote/admin/register.css` under the
`.myra-register` root so nothing leaks into the rest of the dashboard. Rules
worth keeping: no serif display type, no decorative icons, uppercase tracked
labels only for facet groups and table headers, avatars are rounded squares,
motion stays under 200ms.

### Getting quotes into the register

Every download from `/quote/cost` (PDF, PDF from preview, and Word) calls
`POST /api/quote/save`. If that call fails, the generator now shows a red
toast saying the file downloaded but was **not** registered, with the reason.
Quotes downloaded before this existed, or on a machine where the save failed,
sit only in that browser's local history. The "Register local quotes" card in
the generator sidebar pushes every local history entry to the register;
already-registered quotes are skipped by content hash.

### Lessons learned (the expensive kind)

1. **Ask what a number *means* before you sum it.** `total_value` was
   computed as `sum(offerPrice)` across rows from day one. Nobody asked whether
   the rows were line items (add them) or alternatives (pick one). Two months of
   "$14M pipeline" later, someone did.

2. **The generator had two modes and the save path only knew about one.**
   Multi-option quotes (`pricingOptions` groups) were saved from the flat
   `rows` array, so the PDF the client saw and the row in the database could
   disagree, and option labels / project-based groups were lost. Now
   `buildQuoteSavePayload` handles both modes and the API validates the shape
   with Zod. If you add a third mode to the generator, extend `savePayload.ts`
   and its test *before* touching the UI.

3. **`CREATE VIEW ... AS SELECT *` freezes the column list.** `quotes_unique`
   was created with `SELECT *`, so when we added `pricing_options` etc. to
   `quotes`, the view silently didn't have them. The migration drops and
   recreates it. Any time you add a column to `quotes`, recreate the view.

4. **A heuristic that flags 94 of 96 rows is not a signal.** The old "Needs
   attention" section marked any downloaded quote older than 14 days. Since
   every save set status to `downloaded`, almost everything was "stale". We
   replaced it with real statuses plus a derived `expired`. If you find yourself
   writing "older than N days" logic, check the status distribution first.

5. **MSAs were never in the database.** The MSA generator saves to
   `localStorage` only. The old admin page showed "0 MSAs" and, in some states,
   `NaN`, because it was aggregating an empty table. The register is
   quotes-only until MSA persistence is actually built. Don't add MSA columns
   back to the register "for later".

6. **The Word download never saved to the database.** For months, anyone
   who downloaded .docx quotes was invisible to the register, and the PDF
   path hid save failures behind a green "Quote generated successfully"
   toast. Every download path now registers the quote and failures are loud.

7. **Legacy `line_items` is still read.** Rows from before the migration have
   `pricing_options` populated by the backfill, but `flattenOptions` still falls
   back to `line_items` when `pricing_options` is null. Keep that fallback until
   every row has been through the migration (check with
   `select count(*) from quotes where pricing_options is null`).

### Applying the migration

`supabase/migrations/20260922_quote_register.sql` has to be run against the
project (Supabase SQL editor, or `supabase db push` once the CLI is linked).
It is idempotent for the schema parts and only backfills rows where
`pricing_options is null`, so running it twice is safe.

After running it, sanity-check:

```sql
select count(*) filter (where pricing_options is null) as missing_options,
       count(*) filter (where value_min is null)      as missing_min,
       count(*) filter (where status not in ('draft','sent','accepted','declined')) as bad_status
from quotes;
```

All three should be zero.
