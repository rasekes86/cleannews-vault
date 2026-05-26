"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useUpdateArticle } from "@/hooks/use-articles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, X } from "lucide-react";

export function EditView() {
  const { currentArticle, goBack } = useAppStore();
  const { updateArticle } = useUpdateArticle();

  const [title, setTitle] = useState(currentArticle?.title || "");
  const [subtitle, setSubtitle] = useState(currentArticle?.subtitle || "");
  const [author, setAuthor] = useState(currentArticle?.author || "");
  const [content, setContent] = useState(currentArticle?.content || "");
  const [notes, setNotes] = useState(currentArticle?.notes || "");
  const [tagsInput, setTagsInput] = useState(
    currentArticle?.tags.map((t) => t.name).join(", ") || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentArticle || !title.trim()) return;
    setIsSaving(true);

    await updateArticle(currentArticle.id, {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      author: author.trim() || undefined,
      content: content.trim(),
      notes: notes.trim() || undefined,
      tagNames: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setIsSaving(false);
  };

  if (!currentArticle) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">No hay artículo para editar</p>
        <Button variant="outline" onClick={goBack}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goBack}>
            <X className="mr-1.5 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editar Artículo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del artículo"
              className="text-lg"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="edit-subtitle">Subtítulo</Label>
            <Input
              id="edit-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtítulo opcional"
            />
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="edit-author">Autor</Label>
            <Input
              id="edit-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Nombre del autor"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="edit-content">Contenido *</Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenido del artículo..."
              rows={16}
              className="resize-y leading-relaxed"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notas personales</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas, resúmenes o comentarios..."
              rows={4}
              className="resize-y"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Etiquetas</Label>
            <Input
              id="edit-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separadas por comas: tecnología, política..."
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1.5 pt-1">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
