import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  // Clear persisted state so the test is idempotent.
  await page.goto('/hpcs');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('export, wipe, re-import restores the same state', async ({ page }) => {
  // Auto-accept any window.alert() that the import flow shows on success.
  page.on('dialog', (d) => {
    void d.accept();
  });

  // ---- step 1: build a small, recognisable state on the HPCs tab ----
  await page.goto('/hpcs');
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="add-hpc"]') as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  await page.getByTestId('add-hpc').click();
  const hpcCard = page.getByTestId('hpc-editor').first();
  await expect(hpcCard).toBeVisible();
  await hpcCard.getByTestId('hpc-name').fill('Levante');
  await hpcCard.getByTestId('hpc-storage').fill('10');

  await hpcCard.getByTestId('add-period').click();
  const period = hpcCard.getByTestId('period-editor').first();
  await period.getByTestId('period-label').fill('2026');
  await period.getByTestId('period-cpu').fill('1000');
  await period.getByTestId('period-gpu').fill('100');

  // Flush autosave debounce (250ms in persistence.ts).
  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 2: open the modal and download the JSON ----
  await page.getByTestId('import-export-button').click();
  await expect(page.getByTestId('import-export-modal')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('io-download').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  // Sanity-check the file contents include our HPC name.
  const fileText = await readFile(downloadPath!, 'utf8');
  expect(fileText).toContain('Levante');

  // Close the modal.
  await page.getByTestId('io-close').click();
  await expect(page.getByTestId('import-export-modal')).not.toBeVisible();

  // ---- step 3: wipe state and confirm the HPC is gone ----
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('No HPCs yet')).toBeVisible();

  // ---- step 4: open the modal again and import the downloaded JSON ----
  await page.getByTestId('import-export-button').click();
  await expect(page.getByTestId('import-export-modal')).toBeVisible();

  await page.getByTestId('io-file').setInputFiles(downloadPath!);
  await page.getByTestId('io-replace').click();

  // The modal closes itself after a successful import.
  await expect(page.getByTestId('import-export-modal')).not.toBeVisible();

  // Give autosave (250ms debounce) a chance to flush before navigation,
  // otherwise the reload below would re-hydrate the stale (empty) state.
  await page.waitForTimeout(500);

  // ---- step 5: verify the restored state is visible on /hpcs ----
  await page.goto('/hpcs');
  await expect(page.getByTestId('hpc-editor').first()).toBeVisible();
  await expect(
    page.getByTestId('hpc-editor').first().getByTestId('hpc-name')
  ).toHaveValue('Levante');
});
