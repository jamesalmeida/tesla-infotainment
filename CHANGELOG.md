# Changelog

User-facing changes to the Tesla Infotainment Simulator. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- The README lists each `public/` folder with its known source and licence, or says it is unknown.
- Dependabot keeps dependencies and GitHub Actions current, with React and the 3D packages grouped so they move together.
- Prettier formatting, and CI fails on unformatted files.

### Changed

- CI permissions are per job, so PR builds are read-only. Deploys run one at a time, and PR builds no longer upload a Pages artifact.
- The loading screen has a new original animation, replacing the third-party CodePen circles, and it holds still for people who prefer reduced motion.
- Migrated the app to TypeScript in strict mode; the UI state lives in a reducer instead of `App.jsx`, and component styles are scoped with CSS Modules.
- Upgraded to React 19 with react-three-fiber 9, drei 10 and react-spring 10.
- The map now uses `@vis.gl/react-google-maps` instead of deprecated Google Maps APIs.
- The 3D car model is compressed from 22.7 MB to 4.6 MB (meshopt geometry, WebP textures), so it loads much faster.
- The bundle is split: the 3D car and the slide-up apps load only when they are needed.

### Removed

- Assets nothing used: the commercial Universal Sans font, `public/touchscreen/` (third-party logos of unknown origin), `logo512.svg` and an old car-settings icon. This cuts about 5 MB from the deployed site.
- Create React App leftovers: the gh-pages deploy scripts (GitHub Actions deploys on push instead), the CRA sample manifest, the unused NavIcon and ShelfModal components, and the duplicate viewport meta tag.
