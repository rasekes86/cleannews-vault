import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Se requiere una URL válida" },
        { status: 400 }
      );
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { error: "La URL debe comenzar con http:// o https://" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const result = await zai.functions.invoke("page_reader", { url });

    if (!result || result.code !== 200 || !result.data) {
      return NextResponse.json(
        { error: "No se pudo extraer el contenido de la página. La web podría no ser accesible o tener bloqueos." },
        { status: 422 }
      );
    }

    const data = result.data;
    const plainText = htmlToPlainText(data.html || "");
    const wordCount = plainText.split(/\s+/).filter((w: string) => w.length > 0).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    let source = "Desconocido";
    try {
      const hostname = new URL(url).hostname;
      source = hostname.replace(/^www\./, "");
    } catch {
      // keep default
    }

    const excerpt = plainText.length > 300
      ? plainText.substring(0, 300).trim() + "..."
      : plainText;

    return NextResponse.json({
      title: data.title || "Sin título",
      author: data.metadata?.author || null,
      source,
      sourceUrl: url,
      content: plainText,
      excerpt,
      publishedAt: data.publishedTime || null,
      readTime,
      wordCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al extraer el artículo: ${message}` },
      { status: 500 }
    );
  }
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "  • ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
