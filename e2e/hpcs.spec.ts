import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Clear persisted state so the test is idempotent — visit the app once so
  // we're on the right origin, then clear and reload.
  await page.goto('/hpcs');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('add an HPC + period, reload, see it persist', async ({ page }) => {
  await page.goto('/hpcs');

  // Empty state visible.
  await expect(page.getByText('No HPCs yet')).toBeVisible();

  // Make sure the SvelteKit client has hydrated before we start clicking —
  // otherwise the click can fire on a still-static DOM and be swallowed.
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="add-hpc"]') as HTMLButtonElement | null;
    return btn !== null && btn.offsetParent !== null;
  });
  await page.waitForLoadState('networkidle');

  // Add an HPC.
  await page.getByTestId('add-hpc').click();
  const hpcCard = page.getByTestId('hpc-editor').first();
  await expect(hpcCard).toBeVisible();

  // Set the HPC name and storage budget.
  await hpcCard.getByTestId('hpc-name').fill('Levante');
  await hpcCard.getByTestId('hpc-storage').fill('500');

  // Add a period.
  await hpcCard.getByTestId('add-period').click();
  const period = hpcCard.getByTestId('period-editor').first();
  await expect(period).toBeVisible();

  await period.getByTestId('period-label').fill('2026');
  await period.getByTestId('period-cpu').fill('1000000');
  await period.getByTestId('period-gpu').fill('50000');

  // Move focus off the input so the blur fires before reload (defensive).
  await page.locator('body').click();

  // Wait long enough for the 250ms autosave debounce to flush.
  await page.waitForTimeout(500);

  // Reload and assert state was rehydrated from localStorage.
  await page.reload();

  const restoredCard = page.getByTestId('hpc-editor').first();
  await expect(restoredCard).toBeVisible();
  await expect(restoredCard.getByTestId('hpc-name')).toHaveValue('Levante');
  await expect(restoredCard.getByTestId('hpc-storage')).toHaveValue('500');

  const restoredPeriod = restoredCard.getByTestId('period-editor').first();
  await expect(restoredPeriod.getByTestId('period-label')).toHaveValue('2026');
  await expect(restoredPeriod.getByTestId('period-cpu')).toHaveValue('1000000');
  await expect(restoredPeriod.getByTestId('period-gpu')).toHaveValue('50000');
});
