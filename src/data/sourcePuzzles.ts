export const publicDomainSources = {
  dudeneyAmusements: {
    title: 'Amusements in Mathematics',
    author: 'Henry Ernest Dudeney',
    url: 'https://www.gutenberg.org/ebooks/16713',
    note: 'Public domain puzzle collection. App puzzles use adapted formats rather than verbatim text.'
  },
  dudeneyCanterbury: {
    title: 'The Canterbury Puzzles',
    author: 'Henry Ernest Dudeney',
    url: 'https://www.gutenberg.org/ebooks/27635',
    note: 'Public domain puzzle collection. App puzzles use adapted formats rather than verbatim text.'
  },
  classicRecreations: {
    title: 'Classic recreational mathematics formats',
    author: 'Public-domain tradition',
    url: 'https://www.gutenberg.org/ebooks/16713',
    note: 'Work-rate, mixture, weighing, route, arrangement, and constraint formats are common public-domain puzzle forms.'
  }
} as const;

export const sourcedHardPuzzleNotes = [
  'Dudeney books are used as public-domain source material for puzzle formats.',
  'Questions are parameterized/adapted so the app can validate answers and avoid copying modern copyrighted exam items.',
  'Generated hard puzzles should be backed by deterministic answer checks in scripts/validate-hard-puzzles.mjs.'
];
