import { appConfig } from '../config/appConfig';
import { ANSWERS } from '../data/answers';
import type { Puzzle } from './types';

function toLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseLocalCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid local calendar date: ${value}`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(year, monthIndex, day);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    throw new Error(`Invalid local calendar date: ${value}`);
  }

  return date;
}

export function formatPuzzleId(date: Date): string {
  const localDate = toLocalMidnight(date);
  const year = localDate.getFullYear();
  const month = `${localDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${localDate.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPuzzleNumber(date: Date): number {
  const epoch = toLocalMidnight(parseLocalCalendarDate(appConfig.puzzleEpoch));
  const target = toLocalMidnight(date);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((target.getTime() - epoch.getTime()) / millisecondsPerDay);
}

export function getDailyPuzzle(date: Date = new Date()): Puzzle {
  const puzzleNumber = getPuzzleNumber(date);
  const index = ((puzzleNumber % ANSWERS.length) + ANSWERS.length) % ANSWERS.length;
  return {
    id: formatPuzzleId(date),
    number: puzzleNumber,
    index,
    answer: ANSWERS[index].toUpperCase(),
  };
}
