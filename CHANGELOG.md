# Changelog

User-facing changes to the Tesla Infotainment Simulator. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- Media, tire-pressure and trip cards under the car, a swipe-to-shift drive strip, and a full-width Park View with a park scene.
- A full-screen media player with source tabs, queue, favourites and search, opened from the media card.
- A stylised driving scene with lanes, traffic and a route line, animated car lamps and wheels, and a Paint Shop for paint, wheels and a plate.
- Live weather and air quality from Open-Meteo, with a clearly-labelled sample fallback.
- Voice control through the browser's speech recognition, plus a typed fallback, mapped onto real car actions.
- An SOS screen that says it is a simulation, a rear-display window for climate and media, and optional on-screen keyboard for desktop kiosks.
- Sleep and wake screens with a welcome animation and a hold-to-restart gesture.
- Local car sounds for locks, doors, indicators and the seat-belt reminder, with a mute control and a mute/unmute button in the volume popup.
- The Camera app now has rear, front and side views.
- Turn-by-turn directions with ETA, arrival, voice guidance and a directions list, saved Home/Work/Favorites/Recents, car tracking on the map, follow-camera and map options, and arrival battery with a charge-stop hint.
- Door state lives in the car store, and the first visit shows a one-time shortcut tip. Reduced-motion preferences are respected across the app.
- The app can be installed to a home screen and starts offline, with an update prompt and an iOS install hint.
- A notice in the README and Software panel says this is an unofficial fan project, not affiliated with or endorsed by Tesla, Inc. The page title is now "Tesla Infotainment Simulator".
- The README lists each `public/` folder with its known source and licence, or says it is unknown.
- Dependabot keeps dependencies and GitHub Actions current, with React and the 3D packages grouped so they move together.
- Prettier formatting, and CI fails on unformatted files.

### Changed

- The 3D model starts downloading straight after the HTML, and Open Sans loads through a stylesheet link with preconnect instead of an inline `@import`.
- CI permissions are per job, so PR builds are read-only. Deploys run one at a time, and PR builds no longer upload a Pages artifact.
- The loading screen has a new original animation, replacing the third-party CodePen circles, and it holds still for people who prefer reduced motion.
- Migrated the app to TypeScript in strict mode; the UI state lives in a reducer instead of `App.jsx`, and component styles are scoped with CSS Modules.
- Upgraded to React 19 with react-three-fiber 9, drei 10 and react-spring 10.
- The map now uses `@vis.gl/react-google-maps` instead of deprecated Google Maps APIs.
- The 3D car model is compressed from 22.7 MB to 4.6 MB (meshopt geometry, WebP textures), so it loads much faster.
- The bundle is split: the 3D car and the slide-up apps load only when they are needed.

### Fixed

- Calendar styles are scoped so they can't recentre headings elsewhere, and the outside temperature no longer shifts sideways once it loads.
- The README and Software panel now match the app: Shift + Space plays and pauses, keys 1 to 4 select gears, and the 3D car is a Model 3. Typos in the Dynamics panel are corrected.

### Removed

- Assets nothing used: the commercial Universal Sans font, `public/touchscreen/` (third-party logos of unknown origin), `logo512.svg` and an old car-settings icon. This cuts about 5 MB from the deployed site.
- Create React App leftovers: the gh-pages deploy scripts (GitHub Actions deploys on push instead), the CRA sample manifest, the unused NavIcon and ShelfModal components, and the duplicate viewport meta tag.
