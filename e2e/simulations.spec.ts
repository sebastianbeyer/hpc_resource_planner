import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Clear persisted state so the test is idempotent.
  await page.goto('/hpcs');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('create HPC + model + sim, see computed totals', async ({ page }) => {
  // ---- step 1: set up an HPC with one period ----
  await page.goto('/hpcs');
  await page.waitForFunction(() => {
    const btn = document.querySelector(
      '[data-testid="add-hpc"]',
    ) as HTMLButtonElement | null;
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

  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 2: add a model "IFS" and a cost cell tco79 × Levante ----
  await page.goto('/models');
  await page.waitForFunction(() => {
    const btn = document.querySelector(
      '[data-testid="add-model"]',
    ) as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  await page.getByTestId('add-model').click();
  const modelCard = page.getByTestId('model-editor').first();
  await expect(modelCard).toBeVisible();
  await modelCard.getByTestId('model-name').fill('IFS');

  const cell = modelCard
    .locator('[data-testid="cost-cell"][data-resolution="tco79"]')
    .first();
  await expect(cell).toBeVisible();
  await cell.getByTestId('cell-cpu').fill('100');
  await cell.getByTestId('cell-gpu').fill('10');
  await modelCard
    .locator('[data-testid="storage-rates"][data-resolution="tco79"]')
    .locator('[data-testid="cell-storage"][data-portfolio="standard"]')
    .fill('0.5');

  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 3: go to /simulations and add a sim ----
  await page.goto('/simulations');
  await page.waitForFunction(() => {
    const btn = document.querySelector(
      '[data-testid="add-simulation"]',
    ) as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  await page.getByTestId('add-simulation').click();
  const simCard = page.getByTestId('simulation-editor').first();
  await expect(simCard).toBeVisible();

  await simCard.getByTestId('sim-name').fill('test');
  await simCard.getByTestId('sim-model').selectOption({ label: 'IFS' });
  await simCard.getByTestId('sim-resolution').selectOption('tco79');
  await simCard.getByTestId('sim-length').fill('2');
  await simCard.getByTestId('sim-ensembles').fill('1');
  await simCard.getByTestId('sim-portfolio').selectOption('standard');
  await simCard.getByTestId('sim-overhead').fill('1.15');

  const packageInput = simCard.getByTestId('sim-package');
  await packageInput.click();
  await packageInput.pressSequentially('phase1');
  await expect(packageInput).toBeFocused();
  await packageInput.press('Backspace');
  await expect(packageInput).toBeFocused();
  await packageInput.blur();
  await expect(
    page.locator('[data-testid="sim-group"][data-group-label="phase"]'),
  ).toBeVisible();

  // ---- step 4: assert the SimulationTotals row shows the expected math ----
  const totalsRow = page.getByTestId('totals-row').first();
  await expect(totalsRow).toBeVisible();

  // CPU: 100 × 24 × 1.15 = 2760
  await expect(totalsRow.getByTestId('totals-cpu')).toHaveText('2,760');
  // GPU: 10 × 24 × 1.15 = 276
  await expect(totalsRow.getByTestId('totals-gpu')).toHaveText('276');
  // Storage: 0.5 × 24 = 12 (no overhead)
  await expect(totalsRow.getByTestId('totals-storage')).toHaveText('12');

  // ---- step 5: duplicate and fold simulations in the overview ----
  const firstShell = page.getByTestId('sim-shell').first();
  await expect(firstShell.getByTestId('sim-summary')).toContainText('IFS');
  await expect(firstShell.getByTestId('sim-summary')).toContainText('tco79');

  await firstShell.getByTestId('duplicate-sim').click();
  await expect(page.getByTestId('sim-shell')).toHaveCount(2);

  const copiedShell = page.getByTestId('sim-shell').nth(1);
  await expect(copiedShell.getByTestId('sim-name')).toHaveValue('test copy');
  await expect(copiedShell.getByTestId('sim-summary')).toContainText('IFS');

  await firstShell.getByTestId('toggle-sim').click();
  await expect(firstShell).toHaveAttribute('data-expanded', 'false');
  await expect(firstShell.getByTestId('simulation-editor')).toHaveCount(0);
  await expect(firstShell.getByTestId('sim-summary')).toContainText('standard');
  await expect(page.getByTestId('simulation-editor')).toHaveCount(1);
});
