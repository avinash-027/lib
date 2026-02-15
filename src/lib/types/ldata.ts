// src\lib\types\ldata.ts
export interface Character {
  Name: string;
  Image: string;
  role: string;
  alternativeNames: string[];
  tags: string[];
  description: string;
}

export interface ChapterRow {
  ChapterSE: string;
  Description: string;
  Tags: string[];        // real stored data
  Characters: string;
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
