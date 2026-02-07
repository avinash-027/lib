export interface Character {
  Name: string;
  Image: string;
}

export interface ChapterRow {
  ChapterSE: string;
  Description: string;
  Tags: any[];
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
  dataType: 'json';
}

export type SortField = 'title' | 'editedAt' | 'createdAt' | 'openedAt';
export type SortOrder = 'asc' | 'desc';
