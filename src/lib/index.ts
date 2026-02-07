// place files you want to import through the `$lib` alias in this folder.
// src\lib\index.ts

export const RatingLevel: Record<number, string> = {
  10: "Peak",
  9: "Great",
  8: "Very Good",
  7: "Good",
  6: "Fine",
  5: "Average",
  4: "Time Waste",
  3: "Bad",
  2: "Horrible",
  1: "Trash",
  0: ""
} as const;

export type Rating = keyof typeof RatingLevel;
