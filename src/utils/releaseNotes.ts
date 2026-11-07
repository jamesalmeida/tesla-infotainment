export interface ReleaseGroup {
  title: string;
  items: string[];
}

export interface Release {
  title: string;
  groups: ReleaseGroup[];
}

// Inline Markdown would show as punctuation, so only its text is kept.
const plainText = (line: string) =>
  line
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*]/g, '')
    .trim();

// Reads the headings and bullets of a Keep a Changelog file. Anything else is skipped.
export function parseReleaseNotes(markdown: string): Release[] {
  const releases: Release[] = [];

  for (const line of markdown.split('\n')) {
    const release = releases.at(-1);
    const group = release?.groups.at(-1);

    if (line.startsWith('## ')) {
      releases.push({ title: plainText(line.slice(3)), groups: [] });
    } else if (line.startsWith('### ')) {
      release?.groups.push({ title: plainText(line.slice(4)), items: [] });
    } else if (line.startsWith('- ')) {
      group?.items.push(plainText(line.slice(2)));
    }
  }

  return releases;
}
