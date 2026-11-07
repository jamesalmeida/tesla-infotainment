import { arcadeReducer, type ArcadeView } from './arcadeView';

const browsing: ArcadeView = { kind: 'browse', selected: 'amp-juggler' };
const playing: ArcadeView = { kind: 'playing', game: 'amp-juggler' };

test('selecting a game browses it', () => {
  expect(arcadeReducer(browsing, { type: 'select', game: 'curb-whisperer' })).toEqual({
    kind: 'browse',
    selected: 'curb-whisperer',
  });
});

test('play starts the selected game', () => {
  expect(arcadeReducer(browsing, { type: 'play', canPlay: true })).toEqual(playing);
});

test('play does nothing when the game cannot be played', () => {
  expect(arcadeReducer(browsing, { type: 'play', canPlay: false })).toBe(browsing);
});

test('play does nothing while already playing', () => {
  expect(arcadeReducer(playing, { type: 'play', canPlay: true })).toBe(playing);
});

test('closing a game goes back to browsing it', () => {
  expect(arcadeReducer(playing, { type: 'close' })).toEqual(browsing);
});

test('closing while browsing changes nothing', () => {
  expect(arcadeReducer(browsing, { type: 'close' })).toBe(browsing);
});
