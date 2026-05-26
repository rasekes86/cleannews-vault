import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await db.article.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Artículo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ article });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al obtener el artículo: ${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, subtitle, author, content, notes, tagNames, isFavorite, publishedAt } = body;

    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Artículo no encontrado" },
        { status: 404 }
      );
    }

    const updatedContent = content !== undefined ? content : existing.content;
    const wordCount = updatedContent.split(/\s+/).filter((w: string) => w.length > 0).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      readTime,
    };

    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (author !== undefined) updateData.author = author;
    if (content !== undefined) updateData.content = content;
    if (notes !== undefined) updateData.notes = notes;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;

    if (tagNames !== undefined) {
      updateData.tags = {
        set: [],
        connectOrCreate: tagNames.map((name: string) => ({
          where: { name },
          create: { name, color: getRandomColor() },
        })),
      };
    }

    const article = await db.article.update({
      where: { id },
      data: updateData,
      include: { tags: true },
    });

    return NextResponse.json({ article });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al actualizar el artículo: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Artículo no encontrado" },
        { status: 404 }
      );
    }

    await db.article.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al eliminar el artículo: ${message}` },
      { status: 500 }
    );
  }
}

function getRandomColor(): string {
  const colors = [
    "#6b7280", "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
