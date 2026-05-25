"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDeleteArticle, useUpdateArticle } from "@/hooks/use-articles";
import { exportAsTxt, exportAsMarkdown, exportAsJson } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Star,
  Pencil,
  Trash2,
  Download,
  FileText,
  FileJson,
  FileDown,
  Calendar,
  Clock,
  User,
  Globe,
  ExternalLink,
} from "lucide-react";

export function ReaderView() {
  const { currentArticle, isLoading, setView, goBack } = useAppStore();
  const { deleteArticle } = useDeleteArticle();
  const { updateArticle } = useUpdateArticle();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentArticle) return;
    await updateArticle(currentArticle.id, {
      isFavorite: !currentArticle.isFavorite,
    });
  }, [currentArticle, updateArticle]);

  const handleDelete = useCallback(async () => {
    if (!currentArticle) return;
    await deleteArticle(currentArticle.id);
    setShowDeleteDialog(false);
  }, [currentArticle, deleteArticle]);

  const handleExport = useCallback(
    (format: "txt" | "md" | "json") => {
      if (!currentArticle) return;
      switch (format) {
        case "txt":
          exportAsTxt(currentArticle);
          break;
        case "md":
          exportAsMarkdown(currentArticle);
          break;
        case "json":
          exportAsJson(currentArticle);
          break;
      }
    },
    [currentArticle]
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Separator />
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentArticle) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground">No hay artículo seleccionado</p>
        <Button variant="outline" onClick={() => setView("library")}>
          Ir a Biblioteca
        </Button>
      </div>
    );
  }

  const article = currentArticle;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              title={article.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Star
                className={`h-5 w-5 ${
                  article.isFavorite
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView("edit")}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              title="Eliminar"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Exportar">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("txt")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar como TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("md")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar como Markdown
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Exportar como JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title & Meta */}
        <header>
          <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl lg:text-4xl">
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="mt-2 text-lg text-muted-foreground">{article.subtitle}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {article.author && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              {article.source}
            </span>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Ver original
            </a>
            {(article.publishedAt || article.extractedAt) && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(
                  article.publishedAt || article.extractedAt
                ).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            {article.readTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {article.readTime} min de lectura
              </span>
            )}
          </div>

          {article.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  style={{
                    backgroundColor: tag.color + "18",
                    color: tag.color,
                    borderColor: tag.color + "30",
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <Separator />

        {/* Content */}
        <article className="prose prose-neutral max-w-none">
          {article.content.split("\n\n").map((paragraph, i) => (
            <p
              key={i}
              className="mb-4 text-base leading-7 text-foreground/90 first:text-lg"
            >
              {paragraph}
            </p>
          ))}
        </article>

        {/* Notes */}
        {article.notes && (
          <>
            <Separator />
            <section>
              <h2 className="text-lg font-semibold mb-3">Notas</h2>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {article.notes}
                </p>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este artículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El artículo &quot;{article.title}&quot; se
              eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


