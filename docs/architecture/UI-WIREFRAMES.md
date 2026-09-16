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

Routes: `/dashboard`, `/assets`, `/assets/new`, `/assets/:id`, `/assets/:id/edit`, `/admin/categories` (ADMIN),
`/settings`, `/forbidden`, and a "Page not found" page for anything else. Everything under the shell needs a login
(`authGuard`). The two forms ask before you leave with unsaved changes.

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
│ ▣ AssetCare   < Dashboard >  < Assets >  < Categories >{ADMIN}   ?  ◉ Alice ▾ │  ← toolbar, primary colour
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │  ← thin progress bar while any request runs
│ ☁ You are offline. Changes cannot be saved until the connection is back.     │  ← only while offline
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         (page content, max ~1100 px wide)                    │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ AssetCare 1.0.0 · API 1.0.0                          Documentation · Help    │  ← footer
└──────────────────────────────────────────────────────────────────────────────┘

   Account menu ▾                     On phones (< 720 px): a drawer
   ┌───────────────────────┐          ┌──────────────────────────────┐
   │ Alice User             │          │ ☰  ▣ AssetCare          ?  ◉ │
   │ Roles: USER            │          ├──────────────┐               │
   │ ⚙ Settings             │          │ ▦ Dashboard  │               │
   │ ◐ Theme: system        │          │ ▣ Assets     │               │
   │ ⎋ Sign out             │          │ ⚙ Settings   │               │
   └───────────────────────┘          └──────────────┘───────────────┘
```

The active link is highlighted and announced as the current page. "?" or the help icon opens the help dialog with the
keyboard shortcuts (`g d`, `g a`, `n`, `/`, `?`), the roles explained, and the running versions. A hidden "Skip to
content" link appears on Tab for keyboard users; focus moves to the content after every navigation.

## 4. Dashboard (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Hello, Alice                                            { USER, ADMIN } [ + New asset ] │
│ Wednesday, 16 September 2026                                                 │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │  12    │ │   9    │ │   2    │ │   1    │ │   2    │   ← tiles link to the  │
│ │ assets │ │ ACTIVE │ │IN_REPAIR│ │RETIRED │ │ due 30d│     filtered list      │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                       │
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

- Tiles: total, one per status, and due-soon; each opens the list with that filter. Three cards below: due soon,
  warranties ending, and "Recently updated" (last five changes with who and when). Urgency chips: `OVERDUE` (red),
  `DUE` (amber, within 7 days), `SOON`.
- Empty texts: "Nothing due. Well maintained." and "No warranty is about to end."
- The cards stack vertically on a phone.

States: loading (spinner), error ("The dashboard could not be loaded."), data.

## 5. Assets list (`/assets`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Assets                                       ( ↻ ) ( ⤓ Export ▾ ) { can write } [ + New asset ] │
│ 12 assets matching                                                           │
│ 🔍 Search ________________ ✕   Status [ Any (not archived) v ]  Category [ All v ]  ( Clear filters ) │
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

- Search matches name, tag, serial, manufacturer, model as you type (debounced); `/` focuses it, Esc clears it.
  Changing a filter returns to page 1. Every filter, sort and page lives in the URL, so reload, the back button and a
  shared link restore the same view. "Clear filters" appears when any filter is set.
- Export: this page or every matching asset (up to 5 000) as a CSV that opens correctly in Excel.
- The chosen rows-per-page is remembered as a preference.
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

- Two columns on desktop, one on a phone. `*` required; the name field has focus on open. Field errors appear under
  the field: client-side rules first (required, length, not negative, three-letter currency, warranty not before
  purchase), then the server's field messages from a 422 Problem Details response, mapped onto the same fields.
- Entering a price fills the preferred currency from Settings. Ctrl/⌘+S saves.
- Leaving with unsaved changes asks first (also on tab close). A draft is autosaved locally; on return a banner
  offers "Restore" or "Discard".
- "Duplicate" from a detail page opens this form prefilled with "(copy)" in the name and empty tag and serial.
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

  More ▾ menu:                                  Status chip colours:
  always     → Copy link · Duplicate · Print    ACTIVE green · IN_REPAIR amber
  ACTIVE     → Mark as in repair · Retire       RETIRED grey  · ARCHIVED grey, struck
             → Archive
  IN_REPAIR  → Back in service · Retire · Archive
  RETIRED    → Archive
  ARCHIVED   → Restore { ADMIN } · Delete permanently { ADMIN, typed confirmation }
  Read-only users get Copy link and Print as icons instead of the menu.
```

The version `v3` in the subtitle is the optimistic-lock version. Every action from this page sends it as `If-Match`;
if someone else changed the asset meanwhile, a snackbar says "Someone else changed this asset. Reloading." and the
page refreshes.

### Maintenance tab

```
│ { can write, not archived } [ 📅 Plan maintenance ]                               │
│                                                                                    │
│ ▸ Oil change                                                    OVERDUE            │
│   SERVICE · due 3 Oct 2026 · repeats P6M · Garage Müller  ( Done ) ( 📅 ) ( ✕ )    │
│ ▸ Clean fans                                                    SOON               │
│   CLEANING · due 30 Oct 2026                                  ( Done ) ( ✕ )        │
│                                                                                    │
│ empty: "Nothing planned."                                                          │
```

`Done` opens the Record service dialog pre-filled from the item; on save the item becomes DONE and, if it repeats, a
new PLANNED item appears with the next due date. `📅` opens the same dialog as Plan, prefilled, to edit or reschedule.
`✕` cancels after a confirm dialog.

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
│ ▸ invoice-2025.pdf                    application/pdf · 212 KB · alice · 3 Mar 2025      ( ⤓ ) │
│ ▸ photo.jpg                           image/jpeg · 1.4 MB · alice · 3 Mar 2025    ( 👁 ) ( ⤓ ) │
│                                                                                    │
│ empty: "No documents or photos yet. PDF, JPEG, PNG, WebP and text up to 10 MB."     │
```

Upload shows "Uploading…" and disables the button; a wrong type or size is refused by the API with a message under
the button. Images have a Preview that opens them in a dialog. Download streams the file with its original name.

### History tab (audit trail)

```
│ ▸ UPDATE  by alice · 4 days ago                        12 Sep 2026, 14:31           │
│     status: IN_REPAIR → ACTIVE                                                     │
│     location: Office → Home office                                                 │
│ ▸ COMPLETE  by alice                                   12 Sep 2026, 14:20           │
│ ▸ CREATE  by alice                                     3 Mar 2025, 10:02            │
│                                                                                    │
│ empty: "No history yet."                                                           │
```

Each entry is one `audit_event` row: operation, actor, time, and the changed fields as `before → after`.

## 8. Categories (`/admin/categories`, ADMIN only)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Categories                                                  [ + New category ] │
│ Reference data for every asset. Inactive categories stay on existing assets… │
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ Order │ Code       │ Name                       │ Status   │              │
│ │ 10    │ COMPUTER   │ Computer                   │ ACTIVE   │ ( ✎ ) ( 👁 ) │
│ │ 20    │ VEHICLE    │ Vehicle · cars, bikes      │ ACTIVE   │ ( ✎ ) ( 👁 ) │
│ │ 90    │ OTHER      │ Other                      │ INACTIVE │ ( ✎ ) ( 👁 ) │
│ └────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘

  New / Edit category dialog:
  ┌──────────────────────────────────────────────────────────┐
  │ New category                                             │
  │ Code * ________ (VEHICLE; cannot change later)  Name * ________ │
  │ Description ____________________________________________ │
  │ Sort order ___  (lower comes first)   (●) Active         │
  │                                       ( Cancel ) [ Save ] │
  └──────────────────────────────────────────────────────────┘
```

Deactivate instead of delete: existing assets keep the category; new assets cannot pick it.

## 9. Settings (`/settings`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                     │
│ ┌ Account ───────────────┐ ┌ Appearance ────────────┐ ┌ Defaults ───────────┐ │
│ │ Signed in as  alice    │ │ Theme  [System|Light|Dark] │ Rows per page [20 v]│ │
│ │ Roles         USER     │ │ Density [Comfortable|Compact] │ Default currency CHF │ │
│ │ User id       1000…    │ │                        │ │ ( Reset to defaults )│ │
│ │ ( Sign out )           │ └────────────────────────┘ └─────────────────────┘ │
│ └────────────────────────┘ ┌ Keyboard shortcuts ────┐ ┌ About ──────────────┐ │
│                            │ g then d  Dashboard …  │ │ UI 1.0.0 · API 1.0.0│ │
│                            └────────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Preferences are stored in this browser only; identity (name, password) is managed in Keycloak.

## 10. Not allowed (`/forbidden`) and Page not found

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

## 11. Shared states and messages

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

## 12. Who sees what

| Control | USER | ADMIN | AUDITOR |
|---|---|---|---|
| Dashboard, list, detail, all tabs | own assets | all assets | all assets, read only |
| New asset, Edit, Plan, Done, Record, Upload, status changes, Archive | ✓ | ✓ | hidden |
| Restore an archived asset | hidden | ✓ | hidden |
| Delete permanently (archived, typed confirmation) | hidden | ✓ | hidden |
| Categories page | hidden | ✓ | hidden |
| Copy link, Print, Export CSV, Settings | ✓ | ✓ | ✓ |

`canWrite()` is true for USER and ADMIN; `isAdmin()` only for ADMIN. The API enforces the same rules through
`AuthorizationPolicy`, so hiding a button is a courtesy, never the security boundary.

## 13. Accessibility and responsiveness

- Every icon-only button has an `aria-label`; the table has `aria-label="Assets"` and rows are focusable and open
  with Enter; dialogs trap focus and return it on close (Material CDK).
- Colour is never the only signal: status chips carry the word, urgency chips carry the word.
- Breakpoint 720 px: navigation becomes a drawer; 600 px: the table drops to three columns, form grids and
  dashboard cards become one column. Reduced-motion preference disables animations. Print styles hide chrome.
- Theme follows the system or the user's choice; density can be compact for dense tables.
- Dates and money are formatted for the browser locale; the API stores ISO dates and `numeric` amounts.

## 14. Changing a screen

Components live in `frontend/src/app/features/<area>/`; shared states in `frontend/src/app/shared/`. Every new
screen needs the four states of section 9, a Vitest spec, and a row in section 10 if it has a role-gated control.
Update the wireframe here in the same pull request; `docs/HOW-TO-MODIFY.md` has the checklist.
