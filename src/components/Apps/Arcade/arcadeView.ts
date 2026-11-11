export type GameId = 'kilowatt-commute' | 'amp-juggler' | 'curb-whisperer';

export type ArcadeView = { kind: 'browse'; selected: GameId } | { kind: 'playing'; game: GameId };

export type ArcadeAction =
  { type: 'select'; game: GameId } | { type: 'play'; canPlay: boolean } | { type: 'close' };

export const arcadeReducer = (view: ArcadeView, action: ArcadeAction): ArcadeView => {
  switch (action.type) {
    case 'select':
      return { kind: 'browse', selected: action.game };
    case 'play':
      return view.kind === 'browse' && action.canPlay
        ? { kind: 'playing', game: view.selected }
        : view;
    case 'close':
      return view.kind === 'playing' ? { kind: 'browse', selected: view.game } : view;
  }
};
