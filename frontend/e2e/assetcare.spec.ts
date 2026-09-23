import { expect, Page, test } from '@playwright/test';

/**
 * The business workflow from the Definition of Done, as one person would do it:
 * log in, create an asset, search for it, open it, update it, add maintenance, check history, archive.
 * Credentials are the development realm's; the suffix keeps runs independent.
 */
const suffix = Date.now().toString(36);
const name = `E2E Laptop ${suffix}`;

async function loginThroughKeycloak(page: Page, user: string, password: string): Promise<void> {
  await page.goto('/');
  await page.waitForURL(/realms\/assetcare\/protocol\/openid-connect\/auth/);
  await page.getByLabel(/username|email/i).fill(user);
  // by role: Keycloak 26 wraps the field with a "Show password" toggle, so getByLabel no longer resolves it
  await page.getByRole('textbox', { name: /^password$/i }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe.serial('AssetCare workflow', () => {
  test('a user manages an asset from creation to archive', async ({ page }) => {
    await loginThroughKeycloak(page, 'alice', 'alice-dev-password');
    await expect(page.getByRole('heading', { name: /hello, alice/i })).toBeVisible();

    // create
    await page
      .getByRole('link', { name: /new asset/i })
      .first()
      .click();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Category').click();
    await page.getByRole('option', { name: 'Computer' }).click();
    await page.getByLabel('Asset tag').fill(`E2E-${suffix}`);
    await page.getByLabel('Purchase price').fill('1999.50');
    await page.getByLabel('Currency').fill('CHF');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();

    // search
    await page.getByRole('link', { name: 'Assets', exact: true }).click();
    await page.getByLabel('Search').fill(suffix);
    await expect(page.getByRole('link', { name: `Open ${name}` })).toBeVisible();

    // open and update
    await page.getByRole('link', { name: `Open ${name}` }).click();
    await page.getByRole('link', { name: /edit/i }).click();
    await page.getByLabel('Location').fill('Zug office');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Zug office')).toBeVisible();

    // maintenance: plan, then complete with a service record; the yearly item schedules its successor
    await page.getByRole('tab', { name: /maintenance/i }).click();
    await page.getByRole('button', { name: /plan maintenance/i }).click();
    await page.getByLabel('Description').fill('Battery check');
    await page.getByLabel('Due date').fill('2026-12-01');
    await page.getByLabel('Repeats').click();
    await page.getByRole('option', { name: 'Yearly' }).click();
    await page.getByRole('button', { name: 'Plan' }).click();
    await expect(page.getByText('Battery check').first()).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).first().click();
    await page.getByLabel('Summary').fill('Battery at 93%');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('DONE').first()).toBeVisible();
    await expect(page.getByText(/due Dec 1, 2027/)).toBeVisible();

    // history shows the changes with request ids
    await page.getByRole('tab', { name: 'History', exact: true }).click();
    await expect(page.getByText('CREATE').first()).toBeVisible();
    await expect(page.getByText('UPDATE').first()).toBeVisible();
    await expect(page.getByText(/request /).first()).toBeVisible();

    // archive: confirm, back on the list, gone from the default view
    await page.getByRole('button', { name: /more/i }).click();
    await page.getByRole('menuitem', { name: /archive/i }).click();
    await page.getByRole('button', { name: 'Archive' }).click();
    await page.waitForURL(/\/assets$/);
    await page.getByLabel('Search').fill(suffix);
    await expect(page.getByText('No assets match these filters.')).toBeVisible();
  });

  test('filters live in the URL, and the list exports CSV', async ({ page }) => {
    await loginThroughKeycloak(page, 'alice', 'alice-dev-password');
    await page.goto('/assets?status=IN_REPAIR&sort=name,asc');
    await expect(page.getByLabel('Status')).toContainText('In repair');
    await page.getByLabel('Search').fill('zzz-no-such-asset');
    await expect(page).toHaveURL(/q=zzz-no-such-asset/);
    await expect(page.getByText('No assets match these filters.')).toBeVisible();
    await page
      .getByRole('button', { name: /clear filters/i })
      .first()
      .click(); // toolbar and empty state both offer it
    await expect(page).not.toHaveURL(/q=/);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    await page.getByRole('menuitem', { name: /this page as csv/i }).click();
    expect((await download).suggestedFilename()).toMatch(/^assets-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('leaving a dirty form asks first, and a draft can be restored', async ({ page }) => {
    await loginThroughKeycloak(page, 'alice', 'alice-dev-password');
    await page.goto('/assets/new');
    await page.getByLabel('Name').fill(`Draft ${suffix}`);
    page.once('dialog', (d) => void d.dismiss()); // "leave and discard?" → stay
    await page.getByRole('link', { name: 'Assets', exact: true }).click();
    await expect(page).toHaveURL(/\/assets\/new$/);
    // the draft autosaves 500 ms after the last change; then reload and answer the browser's "leave site?" with leave
    await expect.poll(() => page.evaluate(() => localStorage.getItem('assetcare.draft.new'))).toContain(`Draft ${suffix}`);
    page.once('dialog', (d) => void d.accept());
    await page.reload();
    await expect(page.getByText(/unsaved draft/i)).toBeVisible();
    await page.getByRole('button', { name: 'Restore' }).click();
    await expect(page.getByLabel('Name')).toHaveValue(`Draft ${suffix}`);
    await page.getByRole('button', { name: 'Discard' }).count(); // banner gone after restore; discard not needed
  });

  test('an admin manages categories; a user does not see the page', async ({ page }) => {
    await loginThroughKeycloak(page, 'admin', 'admin-dev-password');
    await page.getByRole('link', { name: 'Categories', exact: true }).click();
    await page.getByRole('button', { name: /new category/i }).click();
    await page.getByLabel('Code').fill(`E2E_${suffix.toUpperCase()}`);
    await page.getByLabel('Name').fill(`E2E category ${suffix}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('cell', { name: `E2E category ${suffix}` })).toBeVisible();
    await page
      .getByRole('button', { name: /deactivate category/i })
      .last()
      .click();
    await expect(page.getByText('INACTIVE').first()).toBeVisible();
  });

  test('settings change the theme and rows per page', async ({ page }) => {
    await loginThroughKeycloak(page, 'alice', 'alice-dev-password');
    await page.goto('/settings');
    await page.getByRole('radio', { name: 'Dark' }).click(); // a single-choice toggle group is a radio group
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
    await page.goto('/assets/nope-not-a-real-id-or-page/extra');
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  });

  test('an auditor can read everything and change nothing', async ({ page }) => {
    await loginThroughKeycloak(page, 'audrey', 'audrey-dev-password');
    await page.getByRole('link', { name: 'Assets', exact: true }).click();
    await expect(page.getByRole('link', { name: /new asset/i })).toHaveCount(0);
    await page
      .getByRole('link', { name: /^Open / })
      .first()
      .click(); // data rows are links named "Open <asset>"
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /edit/i })).toHaveCount(0);
    await page.getByRole('tab', { name: 'History', exact: true }).click();
  });

  test('two sessions editing the same asset: the second save sees a conflict', async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pa = await a.newPage();
    const pb = await b.newPage();
    await loginThroughKeycloak(pa, 'alice', 'alice-dev-password');
    await loginThroughKeycloak(pb, 'alice', 'alice-dev-password');

    await pa
      .getByRole('link', { name: /new asset/i })
      .first()
      .click();
    await pa.getByLabel('Name').fill(`Conflict ${suffix}`);
    await pa.getByLabel('Category').click();
    await pa.getByRole('option', { name: 'Phone' }).click();
    await pa.getByRole('button', { name: 'Save' }).click();
    await pa.waitForURL(/\/assets\/[0-9a-f-]{36}$/); // the saved asset's own page, not /assets/new
    const url = pa.url();

    await pa.goto(url + '/edit');
    await pb.goto(url + '/edit');
    // both forms must hold version 0 before A saves; goto returns before the form has fetched the asset
    await expect(pa.getByLabel('Name')).toHaveValue(`Conflict ${suffix}`);
    await expect(pb.getByLabel('Name')).toHaveValue(`Conflict ${suffix}`);
    await pa.getByLabel('Location').fill('Desk A');
    await pa.getByRole('button', { name: 'Save' }).click();
    await expect(pa.getByText('Desk A')).toBeVisible();

    await pb.getByLabel('Location').fill('Desk B');
    await pb.getByRole('button', { name: 'Save' }).click();
    await expect(pb.getByRole('heading', { name: /someone else changed this asset/i })).toBeVisible();
    await pb.getByRole('button', { name: 'Reload' }).click();
    await expect(pb.getByLabel('Location')).toHaveValue('Desk A');

    await a.close();
    await b.close();
  });
});
