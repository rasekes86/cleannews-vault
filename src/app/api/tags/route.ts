import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const tags = await db.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { articles: true } } },
    });

    return NextResponse.json({ tags });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al obtener etiquetas: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Se requiere el nombre de la etiqueta" },
        { status: 400 }
      );
    }

    await db.tag.delete({ where: { name } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al eliminar la etiqueta: ${message}` },
      { status: 500 }
    );
  }
}
