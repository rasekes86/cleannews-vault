import { create } from "zustand";
import type { Article, Tag } from "@/lib/types";

export type ViewMode =
  | "dashboard"
  | "extract"
  | "library"
  | "reader"
  | "edit";

interface ExtractedData {
  title: string;
  author: string | null;
  source: string;
  sourceUrl: string;
  content: string;
  excerpt: string;
  publishedAt: string | null;
  readTime: number;
  wordCount: number;
}

interface AppState {
  // Navigation
  currentView: ViewMode;
  previousView: ViewMode | null;
  setView: (view: ViewMode) => void;
  goBack: () => void;

  // Library
  articles: Article[];
  totalArticles: number;
  totalPages: number;
  currentPage: number;
  tags: Tag[];
  sources: string[];
  searchQuery: string;
  selectedTag: string;
  selectedSource: string;
  favoriteFilter: boolean;
  sortBy: string;
  sortOrder: string;
  isLoading: boolean;

  // Extract
  isExtracting: boolean;
  extractedData: ExtractedData | null;
  extractUrl: string;

  // Reader
  currentArticle: Article | null;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Actions
  setArticles: (articles: Article[], total: number, totalPages: number, page: number) => void;
  setTags: (tags: Tag[]) => void;
  setSources: (sources: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tag: string) => void;
  setSelectedSource: (source: string) => void;
  setFavoriteFilter: (value: boolean) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: string) => void;
  setCurrentPage: (page: number) => void;
  setIsLoading: (loading: boolean) => void;
  setIsExtracting: (extracting: boolean) => void;
  setExtractedData: (data: ExtractedData | null) => void;
  setExtractUrl: (url: string) => void;
  setCurrentArticle: (article: Article | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: "dashboard",
  previousView: null,
  setView: (view) =>
    set((state) => ({
      currentView: view,
      previousView: state.currentView,
    })),
  goBack: () =>
    set((state) => ({
      currentView: state.previousView || "dashboard",
      previousView: null,
    })),

  // Library
  articles: [],
  totalArticles: 0,
  totalPages: 1,
  currentPage: 1,
  tags: [],
  sources: [],
  searchQuery: "",
  selectedTag: "",
  selectedSource: "",
  favoriteFilter: false,
  sortBy: "extractedAt",
  sortOrder: "desc",
  isLoading: false,

  // Extract
  isExtracting: false,
  extractedData: null,
  extractUrl: "",

  // Reader
  currentArticle: null,

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Actions
  setArticles: (articles, total, totalPages, page) =>
    set({ articles, totalArticles: total, totalPages, currentPage: page }),
  setTags: (tags) => set({ tags }),
  setSources: (sources) => set({ sources }),
  setSearchQuery: (searchQuery) => set({ searchQuery, currentPage: 1 }),
  setSelectedTag: (selectedTag) => set({ selectedTag, currentPage: 1 }),
  setSelectedSource: (selectedSource) => set({ selectedSource, currentPage: 1 }),
  setFavoriteFilter: (favoriteFilter) => set({ favoriteFilter, currentPage: 1 }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsExtracting: (isExtracting) => set({ isExtracting }),
  setExtractedData: (extractedData) => set({ extractedData }),
  setExtractUrl: (extractUrl) => set({ extractUrl }),
  setCurrentArticle: (currentArticle) => set({ currentArticle }),
}));
