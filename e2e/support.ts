import { expect, type BrowserContext, type Page } from '@playwright/test';

// No key and no billing: Maps never reaches Google in these tests. Audio hosts are
// blocked too, so a test can't depend on someone else's server.
export async function blockThirdParties(context: BrowserContext) {
  await context.route(/googleapis\.com|gstatic\.com|blubrry\.com|megaphone\.fm/, (route) =>
    route.abort(),
  );
}

export async function openApp(page: Page) {
  await page.goto('');
  await expect(page.locator('[class*="loading-overlay"]')).toHaveCount(0, { timeout: 30_000 });
}

export const appPanel = (page: Page) => page.locator('[class*="vertical-slider-panel"]');

export const expectPanelOpen = (page: Page, isOpen: boolean) =>
  isOpen
    ? expect(appPanel(page)).toHaveClass(/open_/)
    : expect(appPanel(page)).not.toHaveClass(/open_/);

export const dockIcon = (page: Page, name: string) => page.getByAltText(`${name} icon`);
