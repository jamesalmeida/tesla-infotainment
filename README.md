# Tesla Infotainment Simulator (WIP)

Experience a simulated Tesla infotainment system in your browser!

> Unofficial fan project, not affiliated with or endorsed by Tesla, Inc. Tesla and all related names, logos and trademarks belong to their respective owners.

[Live Demo](https://tesla-infotainment-display.vercel.app/)

![App Preview](public/app-preview.png)

## Features to try out

- Realistic 3D models of a Tesla Model 3 and a 2026 Model Y (switch in Toybox > Paint Shop). Try opening the trunk, frunk and doors!
- Interactive infotainment system simulation. Play a podcast, adjust the volume, etc.
- Put the car in reverse (Click the R) and see what's behind you!
- Try searching on the map. Turn on traffic or different map styles.
- Check out the keyboard shortcuts below for more controls.
- Adapts to desktop, laptop, iPad, foldable and phone sizes, including a full-width Park View and a rear-display window.
- Try the voice control, live weather, Paint Shop and the animated car lamps.
- The app can be installed to a home screen and starts offline after the first visit.
- Adding features periodically. Leave a feature request in the issues section ^_^

## Keyboard Shortcuts

- Shift + Left Arrow: Toggle left turn signal
- Shift + Right Arrow: Toggle right turn signal
- Shift + H: Toggle hazard lights
- Shift + F: Toggle frunk (front trunk)
- Shift + T: Toggle trunk
- Shift + M: Focus on Navigate Input
- Shift + C: Backup Camera

### Gear Selection

- P or 1: Park
- R or 2: Reverse
- N or 3: Neutral
- D or 4: Drive

### Music Controls

- Shift + Space: Play/Pause
- Shift + <: Previous track
- Shift + >: Next track

## Project layout

```
src/components/   screen chrome, apps, panels and the 3D vehicle
src/state/        reducer and context for the car and UI state
src/hooks/        shared hooks (keyboard shortcuts, loading screen)
src/styles/       shared CSS; per-component styles are CSS Modules
```

The app is TypeScript (strict), and component styles are CSS Modules. `src/utils/assetPaths.ts` resolves asset URLs against the app's base path.

## Dependency updates

Dependabot opens weekly PRs for npm packages and GitHub Actions. React, react-three-fiber, drei, react-spring and three are grouped into one PR because they must move together.

## Quick Start

To run the project locally:

1. Clone the repository:

   ```
   git clone https://github.com/jamesalmeida/tesla-infotainment.git
   cd tesla-infotainment
   ```

2. Use Node.js 24 or newer (the version is pinned in `.node-version`), then install dependencies with [pnpm](https://pnpm.io/). The pnpm version is pinned in `package.json`; `npm install -g corepack && corepack enable` picks it up automatically (Node.js 25+ no longer bundles corepack):

   ```
   pnpm install
   ```

3. Use the `.env.template` to create your own `.env` file. Add your API key for [Google Maps](https://cloud.google.com/maps-platform) and also a mapID for the maps styles to match Tesla's car maps. You can use mine (it's in the template) or create your own.

4. Start the development server:

   ```
   pnpm dev
   ```

5. Open [http://localhost:3000/tesla-infotainment/](http://localhost:3000/tesla-infotainment/) in your browser.

## Build for Production

To create a production-ready build:

```
pnpm build
```

This command builds the app for production to the `dist` folder, optimizing the build for the best performance.

## Linting

To check the code for problems:

```
pnpm lint
```

Use `pnpm lint:fix` to apply the automatically fixable ones.

## Type checking

The app is written in TypeScript (strict mode). To type-check it without building:

```
pnpm typecheck
```

## Formatting

Code is formatted with [Prettier](https://prettier.io/), and CI fails on unformatted files:

```
pnpm format
```

Use `pnpm format:check` to check without writing.

## Tests

The UI-flow tests run with Vitest in a jsdom environment:

```
pnpm test
```

Use `pnpm test:watch` while developing.

## Deployment

The app is hosted on Vercel at https://tesla-infotainment-display.vercel.app/. The Vercel project is connected to this repository, so pushes and pull requests get preview deployments and `main` is the production deployment.

Vercel settings:

- Build command: `pnpm build`
- Output directory: `dist`
- Environment variables: `VITE_GOOGLE_MAPS_API_KEY` and `VITE_GOOGLE_MAPS_MAP_ID`

Vercel builds with the root base path (`/`); local development and preview serve the app under `/tesla-infotainment/`.

The GitHub workflow in `.github/workflows/main.yml` runs formatting, linting, type checking, unit tests and the build on every push and pull request, plus the browser suite on pull requests. It does not deploy; Vercel handles hosting.

This project is built with [Vite](https://vite.dev/).

## 3D model

The car model in `public/car-models/` is compressed with [glTF Transform](https://gltf-transform.dev/) (meshopt geometry, WebP textures), which drei's `useGLTF` decodes out of the box. To compress a new or updated model:

```
npx @gltf-transform/cli optimize input.glb output.glb \
  --compress meshopt --texture-compress webp \
  --flatten false --join false --instance false \
  --simplify false --palette false --prune-solid-textures false
```

The `false` flags keep the node names and hierarchy that `VehicleModel.tsx` looks up (`bonnet_dummy`, `boot_dummy`, `door_*_dummy`) and keep the glass textures intact.

Each model's lamp nodes, paint materials and charge-port node are listed in `src/components/VehicleModel/carModels.ts`, and `wheelNodes.test.ts` checks every listed name against the shipped files. The Model Y download came as one mesh per material, so its panels were cut apart by position and re-hinged to the same rig (Z-up, +Y front, +X right, under a node scaled by 100) before compressing.

## Public assets

Everything in `public/` is deployed with the site. The [MIT License](LICENSE) covers only the rows marked MIT below. Where a source or licence is not known, the table says so rather than guessing.

| Path                                                    | What it is                                                                                     | Source                                                                                                                     | Licence                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `public/` (`favicon.ico`, `logo192.png`, `logo512.png`) | Site and PWA icons                                                                             | Unknown                                                                                                                    | Unknown; they show the Tesla logo, a trademark of Tesla, Inc. |
| `public/` (`app-preview.png`, `app-preview-02.png`)     | Screenshots of this app. The README uses the first; the second is unused                       | This project                                                                                                               | Screenshots of this project; they show the Tesla-style UI     |
| `public/` (`manifest.json`, `robots.txt`)               | PWA manifest and crawler rules                                                                 | This project                                                                                                               | MIT                                                           |
| `public/audio/`                                         | Five car sound effects (hazards, door, horn, two seatbelt alarms). Not used yet; kept for #118 | Unknown. The file names look like stock sound-library IDs plus a build hash, but nothing confirms that                     | Unknown; confirm before wiring them in                        |
| `public/car-models/tesla-model-3-2018.glb`              | Tesla Model 3 3D model                                                                         | [Ameer Studio on Sketchfab](https://sketchfab.com/3d-models/tesla-2018-model-3-5ef9b845aaf44203b6d04e2c677e444f)           | CC-BY (#4)                                                    |
| `public/car-models/tesla-model-y-2026.glb`              | 2026 Tesla Model Y Performance 3D model, cut into doors, lids and wheels and compressed        | [BloxBloger on Sketchfab](https://sketchfab.com/3d-models/2026-tesla-model-y-performance-8a0bc252f9da4015a02a7bd99efd4847) | CC-BY-NC-4.0 (non-commercial use only)                        |
| `public/img/` (`app-*`, `icon-*`, `profile*`, `logo-*`) | UI icons, mostly SVGs exported from Affinity Designer                                          | Unknown. Several reproduce third-party logos (Spotify, Apple Music, Tidal, Audible, Amazon Music, YouTube Music, Tesla)    | Unknown; those logos are trademarks of their owners           |
| `public/img/games/`                                     | Arcade box art                                                                                 | Third-party titles (#170)                                                                                                  | Unknown                                                       |

### Thanks

- Want to thank Ameer Studio for sharing the [3D model of the Tesla Model 3](https://sketchfab.com/3d-models/tesla-2018-model-3-5ef9b845aaf44203b6d04e2c677e444f) I'm using in the simulator.
- Thanks to BloxBloger for sharing the [3D model of the 2026 Tesla Model Y Performance](https://sketchfab.com/3d-models/2026-tesla-model-y-performance-8a0bc252f9da4015a02a7bd99efd4847) ([CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)). This project split its panels into doors, bonnet, tailgate and wheels and compressed it.
- Thanks to Patrick Stillhart for sharing the [OutRun video game on Codepen](https://codepen.io/arcs/pen/aGzNKY) that I refactored to work inside of the Arcade in this project.

## License

This repository's code is licensed under the [MIT License](LICENSE). Anyone may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, provided the copyright notice and permission notice are retained.

Third-party assets credited above still have their own terms until replaced (issues #4, #6). MIT covers James's code only — not these assets:

- Sketchfab Tesla 2018 Model 3 by Ameer Studio (CC-BY) — `public/car-models/tesla-model-3-2018.glb`
- Sketchfab 2026 Tesla Model Y Performance by BloxBloger (CC-BY-NC-4.0, non-commercial) — `public/car-models/tesla-model-y-2026.glb`
- OutRun arcade from CodePen (arcs/aGzNKY) plus hotlinked S3 assets
