"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useExtractArticle, useSaveArticle } from "@/hooks/use-articles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Link,
  Loader2,
  Save,
  Globe,
  User,
  Calendar,
  Clock,
  FileText,
  X,
  Check,
} from "lucide-react";

export function ExtractView() {
  const { extractedData, extractUrl, setExtractUrl, setExtractedData, setView } =
    useAppStore();
  const { extractArticle, isExtracting } = useExtractArticle();
  const { saveArticle } = useSaveArticle();

  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleExtract = async () => {
    if (!extractUrl.trim()) return;
    await extractArticle(extractUrl.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleExtract();
  };

  const handleSave = async () => {
    if (!extractedData) return;
    setIsSaving(true);
    await saveArticle({
      title: extractedData.title,
      author: extractedData.author || undefined,
      source: extractedData.source,
      sourceUrl: extractedData.sourceUrl,
      content: extractedData.content,
      excerpt: extractedData.excerpt,
      publishedAt: extractedData.publishedAt || undefined,
      tagNames: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setIsSaving(false);
  };

  const handleReset = () => {
    setExtractUrl("");
    setExtractedData(null);
    setTagsInput("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Extraer Noticia</h1>
        <p className="mt-1 text-muted-foreground">
          Pega la URL de un artículo web para extraer su contenido limpio.
        </p>
      </div>

      {/* URL Input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="https://ejemplo.com/articulo-de-noticias"
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                disabled={isExtracting}
              />
            </div>
            <Button
              onClick={handleExtract}
              disabled={!extractUrl.trim() || isExtracting}
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extrayendo...
                </>
              ) : (
                "Extraer"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {isExtracting && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Preview */}
      {extractedData && !isExtracting && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600" />
              Vista Previa
            </h2>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="mr-1 h-4 w-4" />
              Limpiar
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl leading-tight">
                {extractedData.title}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {extractedData.author && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {extractedData.author}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {extractedData.source}
                </span>
                {extractedData.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(extractedData.publishedAt).toLocaleDateString("es-ES")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {extractedData.readTime} min de lectura
                </span>
                <Badge variant="secondary" className="text-xs">
                  <FileText className="mr-1 h-3 w-3" />
                  {extractedData.wordCount} palabras
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
                {extractedData.excerpt}
              </p>
            </CardContent>
          </Card>

          {/* Editable fields before saving */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etiquetas</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="tags-input" className="text-sm text-muted-foreground mb-2 block">
                Separa las etiquetas con comas
              </Label>
              <Input
                id="tags-input"
                placeholder="tecnología, política, ciencia..."
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              {tagsInput && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tagsInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Artículo
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!extractedData && !isExtracting && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Sin contenido extraído</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pega una URL arriba para comenzar a extraer contenido.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
