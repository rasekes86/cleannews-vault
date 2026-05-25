"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { toast } from "@/hooks/use-toast";
import type { Article } from "@/lib/types";

interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sources: string[];
  tags: Array<{ id: string; name: string; color: string; _count: { articles: number } }>;
}

export function useArticles() {
  const store = useAppStore();
  const isFirstLoad = useRef(true);

  const fetchArticles = useCallback(async () => {
    store.setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (store.searchQuery) params.set("search", store.searchQuery);
      if (store.selectedTag) params.set("tag", store.selectedTag);
      if (store.selectedSource) params.set("source", store.selectedSource);
      if (store.favoriteFilter) params.set("favorite", "true");
      params.set("sortBy", store.sortBy);
      params.set("sortOrder", store.sortOrder);
      params.set("page", store.currentPage.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar artículos");

      const data: ArticlesResponse = await res.json();
      store.setArticles(data.articles, data.total, data.totalPages, data.page);
      store.setSources(data.sources);
      store.setTags(
        data.tags.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          createdAt: "",
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      store.setIsLoading(false);
    }
  }, [
    store.searchQuery,
    store.selectedTag,
    store.selectedSource,
    store.favoriteFilter,
    store.sortBy,
    store.sortOrder,
    store.currentPage,
  ]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Reset page to 1 on first load
  useEffect(() => {
    if (isFirstLoad.current) {
      store.setCurrentPage(1);
      isFirstLoad.current = false;
    }
  }, []);

  return { fetchArticles, isLoading: store.isLoading };
}

export function useArticleDetail() {
  const store = useAppStore();

  const fetchArticle = useCallback(
    async (id: string) => {
      store.setIsLoading(true);
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) throw new Error("Artículo no encontrado");

        const data = await res.json();
        store.setCurrentArticle(data.article);
        store.setView("reader");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        store.setIsLoading(false);
      }
    },
    [store]
  );

  return { fetchArticle, isLoading: store.isLoading };
}

export function useSaveArticle() {
  const store = useAppStore();

  const saveArticle = useCallback(
    async (data: {
      title: string;
      subtitle?: string;
      author?: string;
      source: string;
      sourceUrl: string;
      content: string;
      excerpt?: string;
      publishedAt?: string;
      notes?: string;
      tagNames?: string[];
      isFavorite?: boolean;
    }) => {
      try {
        const res = await fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al guardar");
        }

        const result = await res.json();
        toast({
          title: "Artículo guardado",
          description: "El artículo se ha guardado correctamente.",
        });

        store.setExtractedData(null);
        store.setExtractUrl("");
        store.setView("library");
        return result.article as Article;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [store]
  );

  return { saveArticle };
}

export function useExtractArticle() {
  const store = useAppStore();

  const extractArticle = useCallback(
    async (url: string) => {
      store.setIsExtracting(true);
      try {
        const res = await fetch("/api/articles/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al extraer");
        }

        const data = await res.json();
        store.setExtractedData(data);
        toast({
          title: "Artículo extraído",
          description: "Contenido extraído correctamente. Puedes editarlo antes de guardar.",
        });
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast({
          title: "Error al extraer",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        store.setIsExtracting(false);
      }
    },
    [store]
  );

  return { extractArticle, isExtracting: store.isExtracting };
}

export function useDeleteArticle() {
  const store = useAppStore();

  const deleteArticle = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar");

        toast({
          title: "Artículo eliminado",
          description: "El artículo se ha eliminado correctamente.",
        });

        store.setCurrentArticle(null);
        store.setView("library");
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [store]
  );

  return { deleteArticle };
}

export function useUpdateArticle() {
  const store = useAppStore();

  const updateArticle = useCallback(
    async (
      id: string,
      data: {
        title?: string;
        subtitle?: string;
        author?: string;
        content?: string;
        notes?: string;
        tagNames?: string[];
        isFavorite?: boolean;
      }
    ) => {
      try {
        const res = await fetch(`/api/articles/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al actualizar");
        }

        const result = await res.json();
        store.setCurrentArticle(result.article);
        store.setView("reader");

        toast({
          title: "Artículo actualizado",
          description: "Los cambios se han guardado correctamente.",
        });
        return result.article as Article;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      }
    },
    [store]
  );

  return { updateArticle };
}
