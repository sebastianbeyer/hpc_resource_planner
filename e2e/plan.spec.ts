import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/hpcs');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('assign sim → meter updates; bust the budget → red over-budget styling', async ({
  page
}) => {
  // ---- step 1: set up an HPC "Levante" with 1 period "2026" ----
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

  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 2: add a model "M1" with a cost cell tco79 × Levante ----
  await page.goto('/models');
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="add-model"]') as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  await page.getByTestId('add-model').click();
  const modelCard = page.getByTestId('model-editor').first();
  await expect(modelCard).toBeVisible();
  await modelCard.getByTestId('model-name').fill('M1');

  const cell = modelCard
    .locator('[data-testid="cost-cell"][data-resolution="tco79"]')
    .first();
  await expect(cell).toBeVisible();
  await cell.getByTestId('cell-cpu').fill('10');
  await cell.getByTestId('cell-gpu').fill('1');
  await modelCard
    .locator('[data-testid="storage-rates"][data-resolution="tco79"]')
    .locator('[data-testid="cell-storage"][data-portfolio="standard"]')
    .fill('0.5');

  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 3: add a sim using M1/tco79/length 1/ensembles 1/standard/overhead 1 ----
  await page.goto('/simulations');
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="add-simulation"]') as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  await page.getByTestId('add-simulation').click();
  const simCard = page.getByTestId('simulation-editor').first();
  await expect(simCard).toBeVisible();

  await simCard.getByTestId('sim-name').fill('plan-sim');
  await simCard.getByTestId('sim-model').selectOption({ label: 'M1' });
  await simCard.getByTestId('sim-resolution').selectOption('tco79');
  await simCard.getByTestId('sim-length').fill('1');
  await simCard.getByTestId('sim-ensembles').fill('1');
  await simCard.getByTestId('sim-portfolio').selectOption('standard');
  await simCard.getByTestId('sim-overhead').fill('1');
  await simCard.getByTestId('sim-completed').check();

  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 4: navigate to /plan and assign the sim ----
  await page.goto('/plan');
  await page.waitForFunction(() => {
    const tray = document.querySelector('[data-testid="unassigned-tray"]');
    return tray !== null;
  });
  await page.waitForLoadState('networkidle');

  const tray = page.getByTestId('unassigned-tray');
  const trayCard = tray.getByTestId('simulation-card').first();
  await expect(trayCard).toBeVisible();

  // Click the "Assign to ▾" button then pick Levante from the menu.
  await trayCard.getByTestId('assign-to').click();
  await trayCard
    .locator('[data-testid="assign-option"][data-target-hpc-id]')
    .first()
    .click();

  await page.waitForTimeout(500);

  // ---- step 5: assert the lane has the sim and the CPU meter is 120/1000 ----
  const lane = page.getByTestId('hpc-lane').first();
  await expect(lane).toBeVisible();
  await expect(lane.getByTestId('simulation-card')).toHaveCount(1);
  const assignedCard = lane.getByTestId('simulation-card').first();

  await expect(assignedCard.getByTestId('card-compute-share')).toContainText(
    'CPU 12% / GPU 12%'
  );
  await expect(assignedCard.getByTestId('card-storage-share')).toContainText(
    'Storage 60%'
  );
  await assignedCard.getByTestId('card-actions').click();
  await expect(assignedCard.getByTestId('card-actions-menu')).toBeVisible();
  await expect(assignedCard.getByTestId('edit-split')).toBeVisible();
  await expect(assignedCard.getByTestId('unassign')).toBeVisible();

  // First budget-meter in the lane is "CPU" for the (only) period.
  // Sim cost: 1 sim × 12 months × 10 cpuPerMonth × 1 overhead = 120 CPU h
  const cpuMeter = lane.getByTestId('budget-meter').first();
  await expect(cpuMeter.getByTestId('meter-numeric')).toContainText('120');
  await expect(cpuMeter.getByTestId('meter-numeric')).toContainText('1,000');
  await expect(cpuMeter.getByTestId('completed-used')).toContainText(
    '120 CPU h completed'
  );
  await expect(cpuMeter).toHaveAttribute('data-over-budget', 'false');

  // Storage meter: 0.5 × 12 = 6 TB / 10 TB → not over budget
  const storageWrapper = lane.getByTestId('storage-meter-wrapper');
  await expect(storageWrapper.getByTestId('meter-numeric')).toContainText('6');
  await expect(storageWrapper.getByTestId('completed-used')).toContainText(
    '6 TB completed'
  );
  await expect(storageWrapper.getByTestId('budget-meter')).toHaveAttribute(
    'data-over-budget',
    'false'
  );

  // ---- step 6: blow the budget by setting lengthYears to 20 ----
  await page.goto('/simulations');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="sim-length"]') !== null;
  });
  const len = page.getByTestId('sim-length').first();
  await len.fill('20');

  await page.locator('body').click();
  await page.waitForTimeout(500);

  // ---- step 7: return to /plan and assert the CPU meter went red ----
  await page.goto('/plan');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid="hpc-lane"]') !== null;
  });

  const lane2 = page.getByTestId('hpc-lane').first();
  const cpuMeter2 = lane2.getByTestId('budget-meter').first();
  // CPU: 20 × 12 × 10 = 2400 CPU h (way over 1000)
  await expect(cpuMeter2).toHaveAttribute('data-over-budget', 'true');
  await expect(cpuMeter2.getByTestId('over-budget-tag')).toBeVisible();
  await expect(cpuMeter2.getByTestId('over-budget-tag')).toContainText(
    'OVER BUDGET'
  );

  // ---- step 8: storage meter went red too (0.5 × 240 = 120 TB / 10 TB) ----
  const storage2 = lane2.getByTestId('storage-meter-wrapper');
  await expect(storage2.getByTestId('meter-numeric')).toContainText('120');
  await expect(storage2.getByTestId('meter-numeric')).toContainText('10');
  await expect(storage2.getByTestId('budget-meter')).toHaveAttribute(
    'data-over-budget',
    'true'
  );
});
