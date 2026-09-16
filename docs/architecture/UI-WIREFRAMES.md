# UI wireframes

Every screen of the AssetCare frontend as a wireframe, with what is on it, who sees which control, and the states
each screen can be in. Drawn from the actual Angular components in `frontend/src/app/features`; when a screen changes,
this page changes with it. Rendered widgets are Angular Material; the boxes below are shapes, not pixels.

Legend: `[ Button ]` primary action, `( Button )` secondary, `< link >`, `[v]` dropdown, `___` text field,
`{ role }` only shown to that role.

## 1. Screen map

```mermaid
flowchart LR
    LOGIN[Keycloak login page] -->|token| SHELL
    subgraph SHELL [Shell: top bar + content]
      DASH[Dashboard] --> LIST[Assets list]
      DASH -->|due item / warranty| DETAIL
      LIST -->|row click| DETAIL[Asset detail]
      LIST -->|New asset| NEW[Asset form: new]
      DETAIL -->|Edit| EDIT[Asset form: edit]
      NEW -->|Save| DETAIL
      EDIT -->|Save| DETAIL
      DETAIL --> PLAN{{Plan maintenance dialog}}
      DETAIL --> SVC{{Record service dialog}}
      DETAIL --> CONF{{Confirm dialog: archive, cancel, restore}}
      EDIT --> STALE{{Conflict dialog: reload their version?}}
      SHELL --> FORB[Not allowed]
    end
    SHELL -->|Sign out| LOGIN
```

Routes: `/dashboard`, `/assets`, `/assets/new`, `/assets/:id`, `/assets/:id/edit`, `/forbidden`. Everything under
the shell needs a login (`authGuard`); an unknown URL goes to the dashboard.

## 2. Login (Keycloak, not ours)

Opening any page without a session redirects to Keycloak's hosted login page and back afterwards (OpenID Connect with
PKCE). The look is Keycloak's default theme; branding it is a Keycloak theme, not frontend code.

```
┌──────────────────────────────────────────────┐
│                 AssetCare                     │
│           Sign in to your account             │
│                                               │
│   Username or email  ____________________     │
│   Password           ____________________     │
│                                               │
│                 [ Sign In ]                   │
│                                               │
│   Forgot password?  (if enabled in the realm) │
└──────────────────────────────────────────────┘
```

## 3. Shell (every page)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ▣ AssetCare   < Dashboard >  < Assets >                    ◉ Alice User  ▾   │  ← toolbar, primary colour
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         (page content, max ~1100 px wide)                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

   Account menu ▾                     On narrow screens (< 600 px):
   ┌───────────────────────┐          ┌────────────────────────────────┐
   │ Roles: USER            │          │ ▣ AssetCare  Dashboard Assets ◉│  ← name hidden, icon stays
   │ ⎋ Sign out             │          └────────────────────────────────┘
   └───────────────────────┘
```

The active link is highlighted. The user's name comes from the token; the roles line lets a person see why a button
is missing.

## 4. Dashboard (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Hello, Alice                                            { USER, ADMIN } [ + New asset ] │
│                                                                              │
│ ┌────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
│ │ Assets             │ │ Due in the next 30 days      │ │ Warranties ending within 60 days │
│ │                    │ │                              │ │                              │
│ │        12          │ │ ▸ Oil change                 │ │ ▸ ThinkPad X1               │
│ │ active, in repair  │ │   VW Golf · 3 Oct 2026  DUE  │ │   until 20 Oct 2026          │
│ │ or retired         │ │ ▸ Descaling                  │ │ ▸ Bosch dishwasher          │
│ │                    │ │   Boiler · 12 Oct 2026  SOON │ │   until 2 Nov 2026           │
│ │ < See all >        │ │                              │ │                              │
│ └────────────────────┘ └──────────────────────────────┘ └──────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘
```

- Three cards; the second and third are lists whose rows open the asset. Urgency chips: `OVERDUE` (red), `DUE`
  (amber, within 7 days), `SOON`.
- Empty texts: "Nothing due. Well maintained." and "No warranty is about to end."
- The cards stack vertically on a phone.

States: loading (spinner), error ("The dashboard could not be loaded."), data.

## 5. Assets list (`/assets`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Assets                                                   { can write } [ + New asset ] │
│                                                                              │
│ 🔍 Search ______________________   Status [ Any (not archived) v ]  Category [ All v ] │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ Name ▲          │ Tag      │ Category │ Status    │ Warranty until │ Price     │ Updated ▾   │
│ ├─────────────────┼──────────┼──────────┼───────────┼────────────────┼───────────┼─────────────┤
│ │ ThinkPad X1     │ LAPTOP-1 │ Computer │ ACTIVE    │ 20 Oct 2026    │ CHF 2,199 │ 12 Sep 2026 │
│ │ Lenovo          │          │          │           │                │           │             │
│ │ VW Golf         │ CAR-1    │ Vehicle  │ IN_REPAIR │ —              │ CHF 24,900│ 10 Sep 2026 │
│ │ Bosch dishwasher│ —        │ Appliance│ ACTIVE    │ 2 Nov 2026     │ —         │ 1 Sep 2026  │
│ └────────────────────────────────────────────────────────────────────────────┘
│                                            Items per page [ 20 v ]  1 – 20 of 12   ‹ › │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Search matches name, tag, serial, manufacturer, model as you type (debounced). Changing a filter returns to page 1.
- Sortable columns: Name, Warranty until, Updated (default: Updated, newest first). Clicking or pressing Enter on a
  row opens the asset.
- On a phone only Name, Status and Updated remain (`hide-sm`); the row shows manufacturer and model under the name.
- The status filter "Any" hides archived assets; choose "Archived" to see them (ADMIN can restore from the detail page).

States: loading, error with a Retry button, empty ("No assets match." plus "Add your first asset" when there is no
filter and the user can write), data.

## 6. Asset form (`/assets/new`, `/assets/:id/edit`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ New asset   /   Edit asset                                                   │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Name *            ______________________________________________________ │ │
│ │ Category *  [ Computer v ]        Asset tag        ________ (LAPTOP-1)   │ │
│ │ Serial number     ________________   Manufacturer   ________________     │ │
│ │ Model             ________________   Purchase date  __/__/____ 📅        │ │
│ │ Warranty until    __/__/____ 📅      Purchase price ______.__            │ │
│ │ Currency          ___ (CHF)                                              │ │
│ │ Location          ______________________________________________________ │ │
│ │ Description       ______________________________________________________ │ │
│ │                   ______________________________________________________ │ │
│ │ Notes             ______________________________________________________ │ │
│ │                   ______________________________________________________ │ │
│ │                                                                          │ │
│ │  ⚠ form-level error, when the server rejects the whole request           │ │
│ │                                              ( Cancel )     [ Save ]     │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Two columns on desktop, one on a phone. `*` required. Field errors appear under the field: client-side rules first
  (required, length, not negative, three-letter currency), then the server's field messages from a 422 Problem
  Details response, mapped onto the same fields.
- Edit loads the asset and remembers its ETag. Save sends `If-Match`. Cancel returns to the detail page (edit) or
  the list (new).
- Save is disabled while saving ("Saving…").

**Conflict dialog** (edit only, when someone saved first: HTTP 409 `stale-version`):

```
┌──────────────────────────────────────────────────────────┐
│ Changed by someone else                                  │
│                                                          │
│ bob saved a newer version at 16 Sep 2026, 09:12.         │
│ Reload their version? Your unsaved changes will be       │
│ discarded.                                               │
│                                       ( Cancel ) [ Reload ] │
└──────────────────────────────────────────────────────────┘
```

Cancel keeps the form with a line "Not saved: the record was changed by someone else. Reload to continue."

## 7. Asset detail (`/assets/:id`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ < ← Assets >                                                                 │
│ ThinkPad X1  [ACTIVE]                  { can write } ( ✎ Edit )  ( ⋯ More ▾ ) │
│ Computer · LAPTOP-1 · v3                                                     │
│                                                                              │
│ ┌ Details ┐┌ Maintenance (2) ┐┌ Service history (1) ┐┌ Attachments (1) ┐┌ History ┐ │
│ │         └──────────────────────────────────────────────────────────────────┤ │
│ │  Manufacturer / model   Lenovo ThinkPad X1 Carbon                          │ │
│ │  Serial number          PF3ABC12                                            │ │
│ │  Purchased              3 Mar 2025 · CHF 2,199.00                           │ │
│ │  Warranty until         20 Oct 2026                                         │ │
│ │  Location               Home office                                         │ │
│ │  Description            Work laptop                                         │ │
│ │  Notes                  Charger in the drawer                               │ │
│ │  Created                3 Mar 2025, 10:02 by alice                          │ │
│ │  Updated                12 Sep 2026, 14:31 by alice                         │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

  More ▾ menu, by current status:              Status chip colours:
  ACTIVE     → Mark as in repair · Retire       ACTIVE green · IN_REPAIR amber
             → Archive                          RETIRED grey  · ARCHIVED grey, struck
  IN_REPAIR  → Back in service · Retire · Archive
  RETIRED    → Archive
  ARCHIVED   → Restore { ADMIN }
```

The version `v3` in the subtitle is the optimistic-lock version. Every action from this page sends it as `If-Match`;
if someone else changed the asset meanwhile, a snackbar says "Someone else changed this asset. Reloading." and the
page refreshes.

### Maintenance tab

```
│ { can write, not archived } [ 📅 Plan maintenance ]                               │
│                                                                                    │
│ ▸ Oil change                                                    OVERDUE            │
│   SERVICE · due 3 Oct 2026 · repeats P6M · Garage Müller     ( Done ) ( ✕ )        │
│ ▸ Clean fans                                                    SOON               │
│   CLEANING · due 30 Oct 2026                                  ( Done ) ( ✕ )        │
│                                                                                    │
│ empty: "Nothing planned."                                                          │
```

`Done` opens the Record service dialog pre-filled from the item; on save the item becomes DONE and, if it repeats, a
new PLANNED item appears with the next due date. `✕` cancels after a confirm dialog.

**Plan maintenance dialog**

```
┌──────────────────────────────────────────────────────────┐
│ Plan maintenance                                         │
│ Type [ SERVICE v ]            Due date  __/__/____       │
│ Description * ___________________________________________ │
│ Repeats [ Once v ]  (Monthly, Quarterly, Twice a year, Yearly) │
│ Service provider ______________  Expected cost ______.__ │
│ Currency ___                                             │
│                                       ( Cancel ) [ Plan ] │
└──────────────────────────────────────────────────────────┘
```

### Service history tab

```
│ { can write, not archived } ( 🔧 Record a repair )                               │
│                                                                                    │
│ ▸ Replaced battery                                          12 Sep 2026            │
│   by Garage Müller · CHF 180.00 · completes "Oil change"                           │
│ ▸ Screen repair after drop                                   4 May 2026            │
│   by Lenovo service                                                                │
│                                                                                    │
│ empty: "No service recorded yet."                                                  │
```

**Record service dialog** (also used by Done):

```
┌──────────────────────────────────────────────────────────┐
│ Record a repair  /  Complete "Oil change"                │
│ Performed on __/__/____     Performed by _______________ │
│ Summary * _______________________________________________ │
│ Cost ______.__   Currency ___                            │
│ Notes ___________________________________________________ │
│                                       ( Cancel ) [ Save ] │
└──────────────────────────────────────────────────────────┘
```

### Attachments tab

```
│ { can write, not archived } ( 📎 Upload )   PDF, JPEG, PNG, WebP, text · up to 10 MB │
│                                                                                    │
│ ▸ invoice-2025.pdf                    application/pdf · 212 KB · alice · 3 Mar 2025  ( ⤓ ) │
│ ▸ photo.jpg                           image/jpeg · 1.4 MB · alice · 3 Mar 2025      ( ⤓ ) │
│                                                                                    │
│ empty: "No documents or photos yet. PDF, JPEG, PNG, WebP and text up to 10 MB."     │
```

Upload shows "Uploading…" and disables the button; a wrong type or size is refused by the API with a message under
the button. Download streams the file with its original name.

### History tab (audit trail)

```
│ ▸ UPDATE  by alice                                     12 Sep 2026, 14:31           │
│     status: IN_REPAIR → ACTIVE                                                     │
│     location: Office → Home office                                                 │
│ ▸ COMPLETE  by alice                                   12 Sep 2026, 14:20           │
│ ▸ CREATE  by alice                                     3 Mar 2025, 10:02            │
│                                                                                    │
│ empty: "No history yet."                                                           │
```

Each entry is one `audit_event` row: operation, actor, time, and the changed fields as `before → after`.

## 8. Not allowed (`/forbidden`)

```
┌──────────────────────────────────────────────┐
│ Not allowed                                  │
│ Your role does not include this action.      │
│                                              │
│ ( Back to the dashboard )                    │
└──────────────────────────────────────────────┘
```

Reached when a guard blocks a route (for example an AUDITOR opening `/assets/new` by URL). Controls the role cannot
use are hidden everywhere, and if a request still gets a 403, the same page appears.

## 9. Shared states and messages

| State | How it looks | Where |
|---|---|---|
| Loading | centred spinner (`app-loading`) | every data screen and tab |
| Empty | icon, one sentence, optional action (`app-empty`) | list, every tab |
| Error | icon, sentence, Retry when a reload makes sense (`app-error-state`) | every data screen and tab |
| Field error | red text under the field | forms and dialogs |
| Form error | red line above the buttons, `role="alert"` | forms |
| Snackbar | bottom toast, 8 s, with Dismiss | after actions ("Asset archived"), API errors that are not field errors, "Someone else changed this asset. Reloading." |
| New version deployed | snackbar "A new version is available. Reload to continue." with a Reload button | any page, when a lazy chunk from the old release is gone |
| Confirm | dialog with Cancel and a primary or red action | archive, cancel maintenance, restore |

## 10. Who sees what

| Control | USER | ADMIN | AUDITOR |
|---|---|---|---|
| Dashboard, list, detail, all tabs | own assets | all assets | all assets, read only |
| New asset, Edit, Plan, Done, Record, Upload, status changes, Archive | ✓ | ✓ | hidden |
| Restore an archived asset | hidden | ✓ | hidden |
| Hard delete | not in the UI (API only, ADMIN) | | |

`canWrite()` is true for USER and ADMIN; `isAdmin()` only for ADMIN. The API enforces the same rules through
`AuthorizationPolicy`, so hiding a button is a courtesy, never the security boundary.

## 11. Accessibility and responsiveness

- Every icon-only button has an `aria-label`; the table has `aria-label="Assets"` and rows are focusable and open
  with Enter; dialogs trap focus and return it on close (Material CDK).
- Colour is never the only signal: status chips carry the word, urgency chips carry the word.
- Breakpoint 600 px: the toolbar hides the user name, the table drops to three columns, form grids and dashboard
  cards become one column.
- Dates and money are formatted for the browser locale; the API stores ISO dates and `numeric` amounts.

## 12. Changing a screen

Components live in `frontend/src/app/features/<area>/`; shared states in `frontend/src/app/shared/`. Every new
screen needs the four states of section 9, a Vitest spec, and a row in section 10 if it has a role-gated control.
Update the wireframe here in the same pull request; `docs/HOW-TO-MODIFY.md` has the checklist.
