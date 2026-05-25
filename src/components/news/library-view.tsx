"use client";

import { useAppStore } from "@/store/app-store";
import { useArticles, useArticleDetail } from "@/hooks/use-articles";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Star,
  Clock,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";

export function LibraryView() {
  const {
    articles,
    totalPages,
    currentPage,
    searchQuery,
    selectedTag,
    selectedSource,
    favoriteFilter,
    sortBy,
    sortOrder,
    isLoading,
    tags,
    sources,
    setSearchQuery,
    setSelectedTag,
    setSelectedSource,
    setFavoriteFilter,
    setSortBy,
    setSortOrder,
    setCurrentPage,
  } = useAppStore();

  const { fetchArticles } = useArticles();
  const { fetchArticle } = useArticleDetail();

  const activeFilters = [
    selectedTag && { label: selectedTag, onClear: () => setSelectedTag("") },
    selectedSource && { label: selectedSource, onClear: () => setSelectedSource("") },
    favoriteFilter && { label: "Favoritos", onClear: () => setFavoriteFilter(false) },
  ].filter(Boolean) as Array<{ label: string; onClear: () => void }>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca</h1>
        <p className="mt-1 text-muted-foreground">
          Explora y gestiona tus artículos guardados.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar artículos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedTag} onValueChange={(v) => setSelectedTag(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-3.5 w-3.5" />
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.name}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSource} onValueChange={(v) => setSelectedSource(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={favoriteFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setFavoriteFilter(!favoriteFilter)}
          className={favoriteFilter ? "bg-amber-500 hover:bg-amber-600" : ""}
        >
          <Star className={`mr-1.5 h-3.5 w-3.5 ${favoriteFilter ? "fill-current" : ""}`} />
          Favoritos
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              {sortBy === "extractedAt"
                ? "Fecha"
                : sortBy === "title"
                  ? "Título"
                  : "Fuente"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy("extractedAt")}>
              Fecha de extracción
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("publishedAt")}>
              Fecha de publicación
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("title")}>
              Título
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("source")}>
              Fuente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="text-xs"
        >
          {sortOrder === "desc" ? "↓ Recientes" : "↑ Antiguos"}
        </Button>

        {/* Active filter pills */}
        {activeFilters.map((filter, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {filter.label}
            <button
              onClick={filter.onClear}
              className="ml-1 rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">No se encontraron artículos</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || selectedTag || selectedSource || favoriteFilter
                ? "Intenta cambiar los filtros de búsqueda."
                : "Extrae tu primera noticia para comenzar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onClick={() => fetchArticle(article.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ArticleCard({
  article,
  onClick,
}: {
  article: {
    id: string;
    title: string;
    source: string;
    publishedAt: string | null;
    extractedAt: string;
    tags: Array<{ id: string; name: string; color: string }>;
    isFavorite: boolean;
    readTime: number | null;
    excerpt: string | null;
  };
  onClick: () => void;
}) {
  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-emerald-200"
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-emerald-700 transition-colors">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-2 py-0"
                style={{
                  backgroundColor: tag.color + "18",
                  color: tag.color,
                  borderColor: tag.color + "30",
                }}
              >
                {tag.name}
              </Badge>
            ))}
            {article.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                +{article.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span className="font-medium">{article.source}</span>
          <div className="flex items-center gap-2">
            <span>
              {new Date(article.publishedAt || article.extractedAt).toLocaleDateString(
                "es-ES",
                { day: "numeric", month: "short" }
              )}
            </span>
            {article.readTime && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {article.readTime}m
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
