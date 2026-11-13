import { expect, type BrowserContext, type Page } from '@playwright/test';

// No key and no billing: Maps never reaches Google in these tests. Audio hosts are
// blocked too, so a test can't depend on someone else's server.
export async function blockThirdParties(context: BrowserContext) {
  await context.route(
    /googleapis\.com|gstatic\.com|blubrry\.com|megaphone\.fm|open-meteo\.com/,
    (route) => route.abort(),
  );
}

// Drawing the 3D car without a GPU takes most of a test's time on CI, so a test only gets
// it when it asks: otherwise WebGL is refused, and the display shows its plain stand-in car,
// as it does on a browser without WebGL. Canvases drawn in 2D, such as the games, still work.
export async function openApp(page: Page, url = '', { car = false }: { car?: boolean } = {}) {
  if (!car) {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return (getContext as (...args: unknown[]) => RenderingContext | null).call(
          this,
          type,
          ...rest,
        );
      } as typeof getContext;
    });
  }
  await page.goto(url);
  // A CI runner can take much longer than a laptop to parse the bundle and start the car.
  const isCI = Boolean(
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.CI,
  );
  await expect(page.locator('[class*="loading-overlay"]')).toHaveCount(0, {
    timeout: isCI ? 60_000 : 30_000,
  });
}

export const appPanel = (page: Page) => page.locator('[class*="vertical-slider-panel"]');

export const expectPanelOpen = (page: Page, isOpen: boolean) =>
  isOpen
    ? expect(appPanel(page)).toHaveClass(/open_/)
    : expect(appPanel(page)).not.toHaveClass(/open_/);

export const dockIcon = (page: Page, name: string) => page.getByAltText(`${name} icon`);
