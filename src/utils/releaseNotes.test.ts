import changelog from '../../CHANGELOG.md?raw';
import { parseReleaseNotes } from './releaseNotes';

test('reads releases, groups and bullets, as plain text', () => {
  const notes = parseReleaseNotes(
    [
      '# Changelog',
      'Intro text.',
      '## 1.0',
      '### Added',
      '- A `code` thing with a [link](https://example.com).',
      '### Fixed',
      '- **Bold** bug',
      'Stray line.',
    ].join('\n'),
  );

  expect(notes).toEqual([
    {
      title: '1.0',
      groups: [
        { title: 'Added', items: ['A code thing with a link.'] },
        { title: 'Fixed', items: ['Bold bug'] },
      ],
    },
  ]);
});

test('finds something to show in the real changelog', () => {
  const [latest] = parseReleaseNotes(changelog);
  expect(latest.groups[0].items.length).toBeGreaterThan(0);
});
