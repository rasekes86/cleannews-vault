export interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  source: string;
  sourceUrl: string;
  content: string;
  excerpt: string | null;
  publishedAt: string | null;
  extractedAt: string;
  notes: string | null;
  tags: Tag[];
  isFavorite: boolean;
  readTime: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}
