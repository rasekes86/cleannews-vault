import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const tag = searchParams.get("tag") || "";
    const source = searchParams.get("source") || "";
    const favorite = searchParams.get("favorite") === "true";
    const sortBy = searchParams.get("sortBy") || "extractedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { source: { contains: search } },
        { author: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          name: tag,
        },
      };
    }

    if (source) {
      where.source = { contains: source };
    }

    if (favorite) {
      where.isFavorite = true;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy === "title") {
      orderBy.title = sortOrder;
    } else if (sortBy === "source") {
      orderBy.source = sortOrder;
    } else if (sortBy === "publishedAt") {
      orderBy.publishedAt = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.extractedAt = sortOrder === "asc" ? "asc" : "desc";
    }

    const [articles, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { tags: true },
      }),
      db.article.count({ where }),
    ]);

    const sources = await db.article.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    });

    const allTags = await db.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { articles: true } } },
    });

    return NextResponse.json({
      articles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sources: sources.map((s) => s.source),
      tags: allTags,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al obtener artículos: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subtitle, author, source, sourceUrl, content, excerpt, publishedAt, notes, tagNames, isFavorite } = body;

    if (!title || !source || !sourceUrl || !content) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: title, source, sourceUrl, content" },
        { status: 400 }
      );
    }

    const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const connectOrCreateTags = (tagNames || []).map((name: string) => ({
      where: { name },
      create: { name, color: getRandomColor() },
    }));

    const article = await db.article.create({
      data: {
        title,
        subtitle: subtitle || null,
        author: author || null,
        source,
        sourceUrl,
        content,
        excerpt: excerpt || content.substring(0, 300),
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        notes: notes || null,
        isFavorite: isFavorite || false,
        readTime,
        tags: { connectOrCreate: connectOrCreateTags },
      },
      include: { tags: true },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al guardar el artículo: ${message}` },
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
