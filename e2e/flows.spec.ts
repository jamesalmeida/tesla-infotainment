import { expect, test } from '@playwright/test';
import { appPanel, blockThirdParties, dockIcon, expectPanelOpen, openApp } from './support';

test.beforeEach(async ({ context }) => {
  await blockThirdParties(context);
});

test.describe('the open app survives', () => {
  test('a window resize', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    await expectPanelOpen(page, true);

    await page.setViewportSize({ width: 1300, height: 800 });

    await page.waitForTimeout(300);
    await expectPanelOpen(page, true);
  });

  test('changing layout mode, as a rotation or fold does', async ({ page }) => {
    await page.setViewportSize({ width: 951, height: 589 });
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    await expectPanelOpen(page, true);

    await page.setViewportSize({ width: 382, height: 580 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.layout))
      .toBe('stacked');
    await expectPanelOpen(page, true);

    await page.setViewportSize({ width: 951, height: 589 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.layout))
      .toBe('stage');
    await expectPanelOpen(page, true);
  });

  test('scrolling and using a slider inside it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await page.getByAltText('car settings icon').click();

    const slider = page.getByLabel('Brightness');
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    await page.mouse.move(box!.x + box!.width * 0.9, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + 120, { steps: 6 });

    expect(await appPanel(page).evaluate((panel) => panel.style.transform)).toBe('');

    await page.mouse.up();
    await expectPanelOpen(page, true);
  });
});

test('an app opens on the first click from a widened panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.keyboard.press('d');
  // Let the drive layout settle before measuring the separator.
  await page.waitForTimeout(250);

  const handle = page.locator('.panelResizeHandle');
  await expect(handle).toBeVisible();
  const separator = await handle.boundingBox();
  await page.mouse.move(separator!.x + 1, separator!.y + separator!.height / 2);
  await page.mouse.down();
  await page.mouse.move(separator!.x + 300, separator!.y + separator!.height / 2, { steps: 4 });
  await page.mouse.up();

  await dockIcon(page, 'bluetooth').click();

  await page.waitForTimeout(400);
  await expectPanelOpen(page, true);
});

test('Reverse holds the camera, and leaving it restores what was open', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await dockIcon(page, 'bluetooth').click();

  await page.keyboard.press('r');
  await page.keyboard.press('Shift+C');
  await expectPanelOpen(page, true);
  await expect(page.getByText('No camera found')).toBeVisible();

  await page.keyboard.press('d');
  await expect(page.getByRole('heading', { name: 'Bluetooth' })).toBeVisible();
});

test('a running game keeps the keyboard, and pauses on leaving Park', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await dockIcon(page, 'arcade').click();
  await page.getByRole('button', { name: 'Play Game' }).click();
  // The 3D car has a canvas too, so the second one is the game.
  await expect(page.locator('canvas')).toHaveCount(2);

  const gear = (name: string) => page.getByRole('button', { name, exact: true });

  await page.keyboard.press('d');
  await expect(gear('P')).toHaveAttribute('aria-pressed', 'true');

  await gear('D').click();
  await expect(page.getByText('Shift to Park to keep playing.')).toBeVisible();

  await page.keyboard.press('p');
  await expect(gear('P')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Shift to Park to keep playing.')).toHaveCount(0);
});

test('the handle dismisses an app with a drag', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await dockIcon(page, 'bluetooth').click();
  await expectPanelOpen(page, true);

  // The panel slides up, and the handle has to be pressed where it ends up.
  await expect.poll(() => appPanel(page).evaluate((panel) => panel.getAnimations().length)).toBe(0);
  const handle = await page.locator('[class*="slider-handle-area"]').boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + 5);
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + 150, { steps: 6 });
  await page.mouse.up();

  await expectPanelOpen(page, false);
});

test('browser shortcuts never reach the car', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);

  await page.keyboard.press('Meta+d');

  await expect(page.getByRole('button', { name: 'P', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('only one Audio element ever exists, and unrelated clicks request nothing', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const counter = window as unknown as { audioCount: number };
    counter.audioCount = 0;
    window.Audio = function (...args: ConstructorParameters<typeof Audio>) {
      counter.audioCount += 1;
      return new NativeAudio(...args);
    } as unknown as typeof Audio;
  });
  const audioRequests: string[] = [];
  page.on('request', (request) => {
    if (/blubrry|megaphone/.test(request.url())) audioRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);

  for (let click = 0; click < 10; click += 1) {
    await page.getByAltText('Increase temperature').click();
  }

  const count = await page.evaluate(() => (window as unknown as { audioCount: number }).audioCount);
  expect(count).toBe(1);
  expect(audioRequests).toEqual([]);
});

test.describe('failures stay contained', () => {
  test('a missing 3D model leaves the rest of the display working', async ({ page, context }) => {
    await context.route(/\.glb$/, (route) => route.abort());
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);

    await expect(page.getByText('3D view unavailable')).toBeVisible();
    await dockIcon(page, 'bluetooth').click();
    await expectPanelOpen(page, true);
  });

  test('a failed app chunk offers a retry and keeps the shell alive', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await context.route(/assets\/Bluetooth-.*\.js$/, (route) => route.abort());

    await dockIcon(page, 'bluetooth').click();

    await expect(page.getByText("Couldn't load this app.")).toBeVisible();
    await expect(page.getByAltText('car settings icon')).toBeVisible();
  });

  test('no WebGL shows a plain car instead of a blank screen', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = () => null;
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);

    await expect(page.getByText('3D view unavailable')).toBeVisible();
  });

  test('the app makes no requests to third-party CDNs', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);

    expect(requests.filter((url) => url.includes('githack'))).toEqual([]);
  });
});

test('touch: signals and hazards are reachable without a keyboard', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 402, height: 714 },
    hasTouch: true,
  });
  await blockThirdParties(context);
  const page = await context.newPage();
  await openApp(page);

  await page.getByRole('button', { name: 'Hazard lights' }).tap();

  await expect(page.locator('.turnSignal.active')).toHaveCount(2);
  await context.close();
});

test.describe('the URL follows the display', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a deep link opens the app, and Back closes it', async ({ page }) => {
    await openApp(page, '#/settings/wifi');
    await expectPanelOpen(page, true);
    await expect(page.locator('[class*="left-scroll-panel-item"][class*="active"]')).toHaveText(
      /wi-?fi/i,
    );

    await page.goBack();

    await expectPanelOpen(page, false);
    expect(new URL(page.url()).hash).toBe('#/');
  });

  test('opening an app changes the URL, and Back and Forward follow it', async ({ page }) => {
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    await expect(page).toHaveURL(/#\/bluetooth$/);

    await page.goBack();
    await expectPanelOpen(page, false);

    await page.goForward();
    await expectPanelOpen(page, true);
  });

  test('switching apps stays one Back away from the map', async ({ page }) => {
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    await dockIcon(page, 'podcasts').click();
    await expect(page).toHaveURL(/#\/podcasts$/);

    await page.goBack();

    await expectPanelOpen(page, false);
  });

  test('closing an app on screen steps back off its entry', async ({ page }) => {
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    await dockIcon(page, 'bluetooth').click();
    await expectPanelOpen(page, false);
    await expect(page).not.toHaveURL(/bluetooth/);

    // Forward still has the app, which only happens if closing went back rather than adding.
    await page.goForward();
    await expectPanelOpen(page, true);
  });

  test('Back closes a modal before anything else', async ({ page }) => {
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    await page.keyboard.press('Shift+?');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.goBack();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expectPanelOpen(page, true);
  });

  test('a link to a Park-only app is refused while in Drive', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('d');
    await page.evaluate(() => {
      location.hash = '#/theater';
    });

    await expect(
      page.getByRole('status').filter({ hasText: 'only available in Park' }),
    ).toBeVisible();
    await expectPanelOpen(page, false);
    await expect(page).not.toHaveURL(/theater/);
  });

  test('a shared demo in Drive refuses a Park-only link too', async ({ page }) => {
    await openApp(page, '?demo=driving#/theater');
    await expectPanelOpen(page, false);
    await expect(page).not.toHaveURL(/theater/);
    await expect(page).toHaveURL(/demo=driving/);
  });

  test('a mistyped link lands on the map', async ({ page }) => {
    await openApp(page, '#/not-an-app');
    await expectPanelOpen(page, false);
    await expect(page).not.toHaveURL(/not-an-app/);
  });

  test('Reverse adds no history, and the URL catches up afterwards', async ({ page }) => {
    await openApp(page);
    await dockIcon(page, 'bluetooth').click();
    const before = await page.evaluate(() => history.length);

    await page.keyboard.press('r');
    await expect(page).toHaveURL(/#\/bluetooth$/);
    await page.goBack();
    await expectPanelOpen(page, true);
    expect(await page.evaluate(() => history.length)).toBe(before);

    await page.keyboard.press('p');
    await expect(page).toHaveURL(/#\/bluetooth$/);
    await expectPanelOpen(page, true);
  });
});

test('Park view: drag the car across, see the map in the corner, and bring it back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const group = page.locator('.horizontalPanelGroup');

  const separator = page.locator('.panelResizeHandle');
  await expect(separator).toBeVisible();
  const box = await separator.boundingBox();
  await page.mouse.move(box!.x + 1, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 600, box!.y + box!.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(group).toHaveClass(/parkView/);

  // The map stays full width underneath, and its status bar is still in reach.
  const rightWidth = await page.locator('.rightPanel').evaluate((panel) => panel.clientWidth);
  const groupWidth = await group.evaluate((element) => element.clientWidth);
  expect(rightWidth).toBeGreaterThan(groupWidth * 0.95);
  await expect(
    page.getByRole('region', { name: 'Navigation' }).getByRole('button', { name: 'Navigate' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Open the map' }).click();
  await expect(group).not.toHaveClass(/parkView/);
});

test('pressing the brake brings up the drive strip, which shifts the car', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const strip = page.getByRole('slider', { name: 'Drive strip' });
  await expect(strip).toHaveCount(0);

  const brake = page.getByRole('button', { name: /^Brake/ }).last();
  await brake.dispatchEvent('pointerdown');
  await brake.dispatchEvent('pointerup');
  await expect(strip).toBeVisible();

  await strip.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: 'D', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
