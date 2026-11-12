import { expect, test } from '@playwright/test';
import { blockThirdParties, openApp } from './support';

type Mode = 'stage' | 'compact' | 'stacked';

// The sizes measured for issue #39. iOS's screen values can't be reproduced here, which is
// why layout never reads them: a window size is all that matters.
const VIEWPORTS: { name: string; width: number; height: number; mode: Mode; touch?: boolean }[] = [
  { name: '4K desktop', width: 3840, height: 2160, mode: 'stage' },
  { name: 'QHD desktop', width: 2560, height: 1440, mode: 'stage' },
  { name: 'FHD desktop', width: 1920, height: 1080, mode: 'stage' },
  { name: 'laptop', width: 1440, height: 900, mode: 'stage' },
  { name: 'small laptop', width: 1366, height: 768, mode: 'stage' },
  { name: 'short laptop', width: 1280, height: 720, mode: 'stage' },
  { name: 'short window', width: 1280, height: 600, mode: 'stage' },
  { name: 'iPad portrait', width: 834, height: 1124, mode: 'stacked', touch: true },
  { name: 'iPad landscape', width: 1210, height: 748, mode: 'stage', touch: true },
  { name: 'iPhone Duo folded', width: 382, height: 580, mode: 'stacked', touch: true },
  { name: 'iPhone Duo unfolded', width: 951, height: 589, mode: 'stage', touch: true },
  { name: 'iPhone portrait', width: 402, height: 714, mode: 'stacked', touch: true },
  { name: 'iPhone landscape', width: 874, height: 292, mode: 'compact', touch: true },
];

const MIN_TEXT_PX = 11;
const MIN_TAP_PX = 44;

for (const { name, width, height, mode, touch } of VIEWPORTS) {
  test.describe(`${name} (${width}x${height})`, () => {
    test.use({ viewport: { width, height }, hasTouch: Boolean(touch) });

    test('fits the window in the right mode', async ({ page, context }) => {
      await blockThirdParties(context);
      await openApp(page);

      expect(await page.evaluate(() => document.documentElement.dataset.layout)).toBe(mode);

      const overflow = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth - window.innerWidth,
        y: document.documentElement.scrollHeight - window.innerHeight,
      }));
      expect(overflow).toEqual({ x: 0, y: 0 });

      const dock = await page.locator('[class*="btmNavBar"]').boundingBox();
      expect(dock).not.toBeNull();
      expect(dock!.y + dock!.height).toBeLessThanOrEqual(height);
    });

    test('keeps text readable', async ({ page, context }) => {
      await blockThirdParties(context);
      await openApp(page);

      const tooSmall = await page.evaluate((minimum) => {
        const hasOwnText = (element: Element) =>
          [...element.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          );
        return [...document.querySelectorAll('#displayBezel *')]
          .filter((element) => hasOwnText(element) && element.getClientRects().length > 0)
          .filter((element) => parseFloat(getComputedStyle(element).fontSize) < minimum)
          .map((element) => element.textContent?.trim().slice(0, 30));
      }, MIN_TEXT_PX);

      expect(tooSmall).toEqual([]);
    });

    if (touch) {
      test('has full-size tap targets', async ({ page, context }) => {
        await blockThirdParties(context);
        await openApp(page);

        const tooSmall = await page.evaluate((minimum) => {
          // The card dots are full width but shorter: a swipe on the card is the main way to
          // change it, and full-height dots left a tall gap above the dock.
          const cardDots = '[aria-label="Cards under the car"] [role="tab"]';
          // HomeLink's Activate is drawn small to fit the status bar, with a full-height
          // target laid around it: a tap that far above or below it still lands on it.
          const extended = (element: HTMLElement) => {
            if (element.dataset.hitArea !== 'extended') return false;
            const box = element.getBoundingClientRect();
            const reach = (minimum - box.height) / 2 - 1;
            const x = box.left + box.width / 2;
            return [box.top - reach, box.bottom + reach].every((y) =>
              element.contains(document.elementFromPoint(x, y)),
            );
          };
          return [...document.querySelectorAll<HTMLElement>('button, [role="button"]')]
            .filter((element) => element.offsetWidth > 0)
            .filter((element) => !element.matches(cardDots))
            .filter((element) => !extended(element))
            .filter((element) => element.offsetWidth < minimum || element.offsetHeight < minimum)
            .map(
              (element) =>
                `${element.getAttribute('aria-label') ?? element.className} ` +
                `${element.offsetWidth}x${element.offsetHeight}`,
            );
        }, MIN_TAP_PX);

        expect(tooSmall).toEqual([]);
      });
    }
  });
}

test('the display grows with the monitor', async ({ page, context }) => {
  await blockThirdParties(context);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const laptop = await page.locator('#displayBezel').boundingBox();

  await page.setViewportSize({ width: 3840, height: 2160 });
  const monitor = await page.locator('#displayBezel').boundingBox();

  expect(monitor!.width).toBeGreaterThan(laptop!.width * 2);
});
