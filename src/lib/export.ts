import type { Article } from "@/lib/types";

export function exportAsTxt(article: Article): void {
  const lines: string[] = [];
  lines.push("=" .repeat(60));
  lines.push(article.title);
  lines.push("=".repeat(60));
  if (article.subtitle) lines.push(`Subtítulo: ${article.subtitle}`);
  if (article.author) lines.push(`Autor: ${article.author}`);
  lines.push(`Fuente: ${article.source}`);
  lines.push(`URL: ${article.sourceUrl}`);
  if (article.publishedAt) {
    lines.push(`Publicado: ${formatDate(article.publishedAt)}`);
  }
  lines.push(`Extraído: ${formatDate(article.extractedAt)}`);
  if (article.readTime) lines.push(`Tiempo de lectura: ${article.readTime} min`);
  if (article.tags.length > 0) {
    lines.push(`Etiquetas: ${article.tags.map((t) => t.name).join(", ")}`);
  }
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(article.content);
  if (article.notes) {
    lines.push("");
    lines.push("--- NOTAS ---");
    lines.push(article.notes);
  }

  downloadFile(`${slugify(article.title)}.txt`, lines.join("\n"), "text/plain");
}

export function exportAsMarkdown(article: Article): void {
  let md = "---\n";
  md += `title: "${escapeYaml(article.title)}"\n`;
  if (article.subtitle) md += `subtitle: "${escapeYaml(article.subtitle)}"\n`;
  if (article.author) md += `author: "${escapeYaml(article.author)}"\n`;
  md += `source: "${escapeYaml(article.source)}"\n`;
  md += `url: "${escapeYaml(article.sourceUrl)}"\n`;
  if (article.publishedAt) md += `published: "${article.publishedAt}"\n`;
  if (article.tags.length > 0) {
    md += `tags:\n`;
    article.tags.forEach((t) => {
      md += `  - "${escapeYaml(t.name)}"\n`;
    });
  }
  if (article.readTime) md += `readTime: ${article.readTime}\n`;
  md += "---\n\n";
  md += `# ${article.title}\n\n`;
  if (article.subtitle) md += `## ${article.subtitle}\n\n`;
  md += `> **${article.source}**`;
  if (article.author) md += ` | *${article.author}*`;
  md += "\n\n";
  md += article.content + "\n";
  if (article.notes) {
    md += "\n---\n\n## Notas\n\n";
    md += article.notes + "\n";
  }

  downloadFile(`${slugify(article.title)}.md`, md, "text/markdown");
}

export function exportAsJson(article: Article): void {
  const data = {
    id: article.id,
    title: article.title,
    subtitle: article.subtitle,
    author: article.author,
    source: article.source,
    sourceUrl: article.sourceUrl,
    content: article.content,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt,
    extractedAt: article.extractedAt,
    notes: article.notes,
    tags: article.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    isFavorite: article.isFavorite,
    readTime: article.readTime,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };

  downloadFile(
    `${slugify(article.title)}.json`,
    JSON.stringify(data, null, 2),
    "application/json"
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"');
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
