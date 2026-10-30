# Changelog

User-facing changes to the Tesla Infotainment Simulator. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- Dependabot keeps dependencies and GitHub Actions current, with React and the 3D packages grouped so they move together.
- Prettier formatting, and CI fails on unformatted files.

### Changed

- Migrated the app to TypeScript in strict mode; the UI state lives in a reducer instead of `App.jsx`, and component styles are scoped with CSS Modules.
- Upgraded to React 19 with react-three-fiber 9, drei 10 and react-spring 10.
- The map now uses `@vis.gl/react-google-maps` instead of deprecated Google Maps APIs.
- The 3D car model is compressed from 22.7 MB to 4.6 MB (meshopt geometry, WebP textures), so it loads much faster.
- The bundle is split: the 3D car and the slide-up apps load only when they are needed.

### Removed

- Create React App leftovers: the gh-pages deploy scripts (GitHub Actions deploys on push instead), the CRA sample manifest, the unused NavIcon and ShelfModal components, and the duplicate viewport meta tag.
