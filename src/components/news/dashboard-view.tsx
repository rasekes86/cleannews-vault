"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useArticles, useArticleDetail } from "@/hooks/use-articles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Globe,
  Tag,
  Star,
  PlusCircle,
  ArrowRight,
  Clock,
} from "lucide-react";

export function DashboardView() {
  const { articles, tags, sources, totalArticles, isLoading, setView } =
    useAppStore();
  const { fetchArticles } = useArticles();
  const { fetchArticle } = useArticleDetail();

  useEffect(() => {
    fetchArticles();
  }, []);

  const favoritesCount = articles.filter((a) => a.isFavorite).length;
  const recentArticles = articles.slice(0, 5);

  const stats = [
    {
      label: "Total Artículos",
      value: totalArticles,
      icon: <FileText className="h-5 w-5 text-emerald-600" />,
      bg: "bg-emerald-50",
    },
    {
      label: "Fuentes",
      value: sources.length,
      icon: <Globe className="h-5 w-5 text-amber-600" />,
      bg: "bg-amber-50",
    },
    {
      label: "Etiquetas",
      value: tags.length,
      icon: <Tag className="h-5 w-5 text-violet-600" />,
      bg: "bg-violet-50",
    },
    {
      label: "Favoritos",
      value: favoritesCount,
      icon: <Star className="h-5 w-5 text-rose-500" />,
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Bienvenido a CleanNews Vault
        </h1>
        <p className="mt-1 text-muted-foreground">
          Extrae, archiva y lee noticias de forma limpia y organizada.
        </p>
      </div>

      {/* Quick Extract */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between">
          <div>
            <h3 className="font-semibold text-emerald-900">
              Extraer una nueva noticia
            </h3>
            <p className="text-sm text-emerald-700/70">
              Pega una URL para extraer el contenido de cualquier artículo web.
            </p>
          </div>
          <Button
            onClick={() => setView("extract")}
            className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Extraer Noticia
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Articles */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Artículos Recientes</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("library")}
            className="text-emerald-600"
          >
            Ver todo
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentArticles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                No hay artículos todavía. Extrae tu primera noticia.
              </p>
              <Button
                variant="outline"
                onClick={() => setView("extract")}
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Extraer Noticia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentArticles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => fetchArticle(article.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{article.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{article.source}</span>
                      {article.readTime && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.readTime} min
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {article.tags.length > 0 && (
                    <div className="hidden gap-1 sm:flex">
                      {article.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
