import { ANSWERS } from './answers';

const extras = [
  'banal', 'annal', 'close', 'leech', 'robot', 'ozone', 'other', 'couch', 'riper', 'vivid',
  'canny', 'array', 'rarer', 'eerie', 'stare', 'arise', 'raise', 'tears', 'rates', 'irate',
  'adieu', 'canoe', 'slate', 'crane', 'roate', 'shine', 'smile', 'grace', 'stone', 'store',
  'stern', 'learn', 'sound', 'wound', 'caper', 'cater', 'cabin', 'rider', 'rigor', 'rigor',
  'tares', 'later', 'alter', 'alert', 'stale', 'steal', 'least', 'bleat', 'caste', 'yeast',
  'beast', 'toast', 'coast', 'roast', 'boast', 'adorn', 'radar', 'easel', 'eaten', 'hello',
  'world', 'piano', 'zonal', 'cacao', 'sheer', 'rerun', 'foyer', 'deter', 'tenor', 'stern',
  'smirk', 'grind', 'queen', 'tally', 'madam', 'cello', 'golly', 'allee', 'eclat', 'cider'
];

export const ALLOWED_GUESSES = Array.from(new Set([...ANSWERS, ...extras]));

export const ALLOWED_GUESS_SET = new Set(ALLOWED_GUESSES);
