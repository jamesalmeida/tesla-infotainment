import type { MediaCollection, MediaItem, MediaShelf } from './mediaLibrary';

// The real episodes the media card has always played, now a shelf in the Podcasts app so they
// can be started from there too. Audio and art are the shows' own published files (#90).
const LEX_ART =
  'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/3e/e3/9c/3ee39c89-de08-47a6-7f3d-3849cef6d255/mza_16657851278549137484.png/600x600bb.webp';
const NO_PRIORS_ART =
  'https://is1-ssl.mzstatic.com/image/thumb/Podcasts122/v4/a6/4d/9c/a64d9c5a-2ca4-6a1b-3ceb-424efe00d022/mza_1247466525586262525.jpg/600x600bb.webp';

const episode = (
  show: { id: string; title: string; artworkUrl: string },
  index: number,
  title: string,
  streamUrl: string,
): MediaItem => ({
  id: `${show.id}-${index}`,
  title,
  subtitle: show.title,
  collectionId: show.id,
  // Learned from the audio once it loads.
  durationSeconds: null,
  streamUrl,
  artworkUrl: show.artworkUrl,
  resumable: true,
  sourceId: 'podcasts',
});

const show = (
  id: string,
  title: string,
  subtitle: string,
  artworkUrl: string,
  episodes: [string, string][],
): MediaCollection => ({
  id,
  title,
  subtitle,
  artworkUrl,
  items: episodes.map(([episodeTitle, url], index) =>
    episode({ id, title, artworkUrl }, index + 1, episodeTitle, url),
  ),
});

export const FEATURED_PODCASTS: MediaShelf = {
  id: 'featured',
  title: 'Featured',
  collections: [
    show(
      'lex-fridman',
      'Lex Fridman Podcast',
      'Conversations about AI, science and more',
      LEX_ART,
      [
        [
          '#440 - Pieter Levels: Programming, Viral Al Startups, and Digital Nomad Life',
          'https://content.blubrry.com/takeituneasy/lex_ai_pieter_levels.mp3',
        ],
        [
          '#438 – Elon Musk: Neuralink and the Future of Humanity',
          'https://content.blubrry.com/takeituneasy/lex_ai_elon_musk_and_neuralink_team.mp3',
        ],
      ],
    ),
    show('no-priors', 'No Priors Podcast', 'AI, machine learning and startups', NO_PRIORS_ART, [
      [
        'SEP 5 - S01E77 - The Road to Autonomous Intelligence with Andrej Karpathy',
        'https://dcs-spotify.megaphone.fm/PDP5840775995.mp3?key=ddb7f40d09aa7f54678599bee8fe8735&request_event_id=db0b2f9d-9700-4f1d-9a84-163472e7824c&timetoken=1726938704_F98B8D0954A9F5A6E4C44CD6BC70A492',
      ],
    ]),
  ],
};
