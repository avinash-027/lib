// src\lib\types\ldata.ts
export interface Character {
  name: string;
  image: string;
  role: string;
  alternativeNames: string[];
  tags: string[];
  description: string;
}

export interface ChapterRow {
  chapterSE: string;
  description: string;
  tags: string[];        // real stored data
  characters: string;
}

export interface LData {
  id?: number;
  title: string;
  alternativeTitles: string[];
  coverImageUrl: string | null;
  description: string;
  badges: string[];
  rating: number | null; // <-- optional
  createdAt: string | null;
  openedAt: string | null;
  editedAt: string | null;
  tags: string[] | any[];
  characters: Character[];
  rows: ChapterRow[];
  category: string;
  dataType: string;
}

export type SortField = 'title' | 'editedAt' | 'createdAt' | 'openedAt';
export type SortOrder = 'asc' | 'desc';
