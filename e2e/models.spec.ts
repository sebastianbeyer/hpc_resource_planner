import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Clear persisted state so the test is idempotent.
  await page.goto('/hpcs');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('add HPC + model + cost cell, reload, persist', async ({ page }) => {
  // ---- step 1: set up an HPC with one period ----
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
  await hpcCard.getByTestId('hpc-storage').fill('500');

  await hpcCard.getByTestId('add-period').click();
  const period = hpcCard.getByTestId('period-editor').first();
  await period.getByTestId('period-label').fill('2026');
  await period.getByTestId('period-cpu').fill('1000000');
  await period.getByTestId('period-gpu').fill('50000');

  // Defocus and allow autosave debounce to flush before navigating.
  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 2: navigate to /models and add a model ----
  await page.goto('/models');
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="add-model"]') as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  await page.getByTestId('add-model').click();
  const modelCard = page.getByTestId('model-editor').first();
  await expect(modelCard).toBeVisible();
  await modelCard.getByTestId('model-name').fill('IFS');

  // ---- step 3: find the cell for resolution "tco79" × the HPC ----
  const cell = modelCard
    .locator('[data-testid="cost-cell"][data-resolution="tco79"]')
    .first();
  await expect(cell).toBeVisible();
  await cell.getByTestId('cell-cpu').fill('12345');

  // Defocus + wait for autosave.
  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 4: reload and assert the value is still 12345 ----
  await page.reload();
  await page.waitForLoadState('networkidle');

  const restoredCard = page.getByTestId('model-editor').first();
  await expect(restoredCard).toBeVisible();
  await expect(restoredCard.getByTestId('model-name')).toHaveValue('IFS');
  const restoredCell = restoredCard
    .locator('[data-testid="cost-cell"][data-resolution="tco79"]')
    .first();
  await expect(restoredCell.getByTestId('cell-cpu')).toHaveValue('12345');
});
