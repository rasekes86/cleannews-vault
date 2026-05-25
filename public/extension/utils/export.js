// CleanNews Vault v2.0 - Enhanced Export Utilities
// Export articles as TXT, Markdown, JSON, or print-optimized PDF.
// Exports: window.CleanNewsExport

const CleanNewsExport = (() => {
  'use strict';

  // ── HTML → Text helpers ────────────────────────────────────────

  /**
   * Strip HTML tags and convert to readable plain text.
   * Preserves paragraph structure and list formatting.
   *
   * @param {string} html
   * @returns {string}
   */
  function _stripHtml(html) {
    if (!html) return '';

    // Replace block-level elements with newlines
    let text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/blockquote>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<hr\s*\/?>/gi, '\n────────────────\n');

    // Remove all remaining tags
    text = text.replace(/<[^>]*>/g, '');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"');

    // Clean up whitespace
    text = text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  // ── HTML → Markdown converter ──────────────────────────────────

  /**
   * Basic but functional HTML to Markdown converter.
   * Handles the most common content elements.
   *
   * @param {string} html
   * @returns {string}
   */
  function _htmlToMarkdown(html) {
    if (!html) return '';

    let md = html;

    // Headings (must be done before other inline elements)
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

    // Bold and italic (nested cases)
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

    // Horizontal rule
    md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n');

    // Blockquotes
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_match, content) => {
      const inner = content
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return inner + '\n\n';
    });

    // Unordered lists
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, content) => {
      const items = content
        .replace(/<\/li>/gi, '')
        .split(/<li[^>]*>/)
        .filter((item) => item.trim())
        .map((item) => `- ${item.replace(/<[^>]*>/g, '').trim()}`)
        .join('\n');
      return items + '\n\n';
    });

    // Ordered lists
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, content) => {
      const items = content
        .replace(/<\/li>/gi, '')
        .split(/<li[^>]*>/)
        .filter((item) => item.trim())
        .map((item, idx) => `${idx + 1}. ${item.replace(/<[^>]*>/g, '').trim()}`)
        .join('\n');
      return items + '\n\n';
    });

    // Paragraphs
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Remove any remaining tags
    md = md.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    md = md
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…');

    // Clean up whitespace
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    return md;
  }

  // ── Filename and YAML helpers ──────────────────────────────────

  /**
   * Sanitize a string for use as a filename.
   * @param {string} name
   * @returns {string}
   */
  function _sanitizeFilename(name) {
    if (!name) return 'articulo';
    return name
      .toLowerCase()
      .substring(0, 80)
      .replace(/[^a-z0-9áéíóúñü\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Escape a string for safe inclusion in YAML double-quoted values.
   * @param {string} str
   * @returns {string}
   */
  function _escapeYaml(str) {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // ── Download helper ────────────────────────────────────────────

  /**
   * Trigger a browser download of content as a file.
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function _download(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Meta block builder ─────────────────────────────────────────

  function _metaBlock(article) {
    const lines = [];
    if (article.author) lines.push(`Autor: ${article.author}`);
    if (article.source) lines.push(`Fuente: ${article.source}`);
    if (article.sourceUrl) lines.push(`URL: ${article.sourceUrl}`);
    if (article.publishedAt) lines.push(`Publicado: ${article.publishedAt}`);
    if (article.readTime) lines.push(`Tiempo de lectura: ~${article.readTime} min`);
    if (article.wordCount) lines.push(`Palabras: ${article.wordCount.toLocaleString()}`);
    if (article.tags && article.tags.length > 0) lines.push(`Etiquetas: ${article.tags.join(', ')}`);
    if (article.notes) lines.push(`\nNotas: ${article.notes}`);
    return lines;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  return {

    // ─────────────────────────────────────────────────────────────
    // SINGLE ARTICLE EXPORTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Export a single article as TXT (plain text with structure).
     *
     * @param {object} article
     */
    exportAsTxt(article) {
      const sep = '═'.repeat(60);
      const subsep = '─'.repeat(60);

      let text = '';
      text += sep + '\n';
      text += article.title + '\n';
      text += sep + '\n\n';

      const meta = _metaBlock(article);
      text += meta.join('\n') + '\n';
      text += '\n' + subsep + '\n\n';

      // Use contentText first, then fall back to stripped HTML, then excerpt
      const body = article.contentText || _stripHtml(article.contentHtml || article.content) || article.excerpt || 'Sin contenido';
      text += body + '\n';

      _download(text, _sanitizeFilename(article.title) + '.txt', 'text/plain');
    },

    /**
     * Export a single article as Markdown with YAML frontmatter.
     *
     * @param {object} article
     */
    exportAsMarkdown(article) {
      // Frontmatter
      let md = '---\n';
      md += `title: "${_escapeYaml(article.title)}"\n`;
      if (article.author) md += `author: "${_escapeYaml(article.author)}"\n`;
      if (article.source) md += `source: "${_escapeYaml(article.source)}"\n`;
      if (article.sourceUrl) md += `url: "${_escapeYaml(article.sourceUrl)}"\n`;
      if (article.publishedAt) md += `published: "${_escapeYaml(article.publishedAt)}"\n`;
      if (article.readTime) md += `read_time: ${article.readTime}\n`;
      if (article.wordCount) md += `word_count: ${article.wordCount}\n`;
      if (article.tags && article.tags.length > 0) {
        md += 'tags:\n';
        article.tags.forEach((tag) => {
          md += `  - "${_escapeYaml(tag)}"\n`;
        });
      }
      if (article.notes) md += `notes: "${_escapeYaml(article.notes)}"\n`;
      md += `saved: "${article.createdAt || new Date().toISOString()}"\n`;
      md += '---\n\n';

      // Title
      md += `# ${article.title || 'Sin título'}\n\n`;

      // Meta line
      if (article.author || article.source) {
        const metaParts = [];
        if (article.author) metaParts.push('Por ' + article.author);
        if (article.source) metaParts.push(article.source);
        if (article.publishedAt) metaParts.push(article.publishedAt);
        md += `> ${metaParts.join(' | ')}\n\n`;
      }

      // Body: convert contentHtml to Markdown, fall back to contentText
      const body = article.contentHtml
        ? _htmlToMarkdown(article.contentHtml)
        : (article.contentText || article.excerpt || 'Sin contenido');
      md += body + '\n';

      // Source link
      if (article.sourceUrl) {
        md += '\n---\n\n';
        md += `**Fuente original:** [${article.source}](${article.sourceUrl})\n`;
      }

      _download(md, _sanitizeFilename(article.title) + '.md', 'text/markdown');
    },

    /**
     * Export a single article as JSON.
     *
     * @param {object} article
     */
    exportAsJson(article) {
      const json = JSON.stringify(article, null, 2);
      _download(json, _sanitizeFilename(article.title) + '.json', 'application/json');
    },

    /**
     * Export a single article as a print-optimized page for PDF output.
     * Opens a new tab with clean HTML and auto-triggers window.print().
     *
     * @param {object} article
     */
    exportAsPdf(article) {
      const contentHtml = article.contentHtml || article.content || '';
      const plainText = article.contentText || _stripHtml(contentHtml) || article.excerpt || '';

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${_escHtml(article.title || 'Artículo')}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm 2.5cm;
    }
    @media print {
      body {
        font-size: 11pt;
        line-height: 1.6;
        color: #000;
        background: #fff;
      }
      .no-print {
        display: none !important;
      }
      a {
        color: #000;
        text-decoration: underline;
      }
      a[href]::after {
        content: " (" attr(href) ")";
        font-size: 0.85em;
        color: #555;
      }
      .article-image {
        max-width: 100%;
        height: auto;
        page-break-inside: avoid;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      blockquote {
        border-left: 3px solid #ccc;
        margin: 1em 0;
        padding: 0.5em 1em;
        color: #444;
        page-break-inside: avoid;
      }
      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        page-break-inside: avoid;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    }
    @media screen {
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1.5rem;
        color: #1a1a1a;
        background: #fafafa;
        line-height: 1.7;
      }
      .article-container {
        background: #fff;
        padding: 2.5rem 3rem;
        border-radius: 8px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
      .print-actions {
        text-align: center;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
      }
      .print-actions button {
        background: #059669;
        color: #fff;
        border: none;
        padding: 0.6rem 1.5rem;
        border-radius: 6px;
        font-size: 0.95rem;
        cursor: pointer;
        font-weight: 500;
      }
      .print-actions button:hover {
        background: #047857;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
    }
    .article-header {
      margin-bottom: 1.5em;
      padding-bottom: 1em;
      border-bottom: 2px solid #e5e7eb;
    }
    .article-header h1 {
      font-size: 1.6em;
      margin: 0 0 0.5em 0;
      line-height: 1.3;
    }
    .article-meta {
      font-size: 0.9em;
      color: #6b7280;
    }
    .article-meta span {
      margin-right: 1em;
    }
    .article-tags {
      margin-top: 0.5em;
    }
    .article-tags span {
      display: inline-block;
      background: #f3f4f6;
      color: #4b5563;
      padding: 0.15em 0.5em;
      border-radius: 3px;
      font-size: 0.8em;
      margin-right: 0.3em;
    }
    .article-content {
      font-size: 1em;
      line-height: 1.7;
    }
    .article-content p {
      margin: 0.8em 0;
    }
    .article-content img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }
    .article-content h1,
    .article-content h2,
    .article-content h3,
    .article-content h4,
    .article-content h5,
    .article-content h6 {
      margin: 1.2em 0 0.5em;
      line-height: 1.3;
    }
    .article-content h1 { font-size: 1.4em; }
    .article-content h2 { font-size: 1.25em; }
    .article-content h3 { font-size: 1.1em; }
    .article-content blockquote {
      border-left: 3px solid #d1d5db;
      margin: 1em 0;
      padding: 0.5em 1em;
      color: #4b5563;
    }
    .article-content ul, .article-content ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }
    .article-content li { margin: 0.25em 0; }
    .article-content pre {
      background: #f9fafb;
      padding: 1em;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.9em;
    }
    .article-footer {
      margin-top: 2em;
      padding-top: 1em;
      border-top: 1px solid #e5e7eb;
      font-size: 0.8em;
      color: #9ca3af;
      text-align: center;
    }
    .article-notes {
      margin-top: 1.5em;
      padding: 1em;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 0 4px 4px 0;
      font-size: 0.95em;
    }
    .article-notes strong {
      display: block;
      margin-bottom: 0.3em;
    }
  </style>
</head>
<body>
  <div class="print-actions no-print">
    <button onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="article-container">
    <header class="article-header">
      <h1>${_escHtml(article.title || 'Sin título')}</h1>
      <div class="article-meta">
        ${article.author ? `<span>Por ${_escHtml(article.author)}</span>` : ''}
        ${article.source ? `<span>${_escHtml(article.source)}</span>` : ''}
        ${article.publishedAt ? `<span>${_escHtml(article.publishedAt)}</span>` : ''}
        ${article.wordCount ? `<span>${article.wordCount.toLocaleString()} palabras</span>` : ''}
        ${article.readTime ? `<span>~${article.readTime} min lectura</span>` : ''}
      </div>
      ${article.tags && article.tags.length > 0 ? `
        <div class="article-tags">
          ${article.tags.map((t) => `<span>${_escHtml(t)}</span>`).join('')}
        </div>
      ` : ''}
      ${article.sourceUrl ? `<div class="article-meta" style="margin-top:0.3em;"><span>🔗 ${_escHtml(article.sourceUrl)}</span></div>` : ''}
    </header>

    ${article.featuredImage ? `<img class="article-image" src="${_escAttr(article.featuredImage)}" alt="" style="max-width:100%; margin-bottom:1.5em; border-radius:6px;">` : ''}

    <div class="article-content">
      ${contentHtml || `<p>${_escHtml(plainText).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`}
    </div>

    ${article.notes ? `
      <div class="article-notes">
        <strong>📝 Notas</strong>
        ${_escHtml(article.notes).replace(/\n/g, '<br>')}
      </div>
    ` : ''}

    <footer class="article-footer">
      Exported by CleanNews Vault &middot; ${new Date().toLocaleDateString('es-ES')}
      ${article.sourceUrl ? ` &middot; <a href="${_escAttr(article.sourceUrl)}">Fuente original</a>` : ''}
    </footer>
  </div>

  <script>
    // Auto-trigger print after a brief delay for rendering
    setTimeout(function() {
      window.print();
    }, 800);
  </script>
</body>
</html>`;

      // Use chrome.tabs.create to open in a new tab
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: dataUrl });
        } else {
          // Fallback: open in new window
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(html);
            win.document.close();
          }
        }
      };
      reader.readAsDataURL(blob);
    },

    // ─────────────────────────────────────────────────────────────
    // MULTIPLE / BULK EXPORTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Export multiple articles in a single file.
     *
     * @param {object[]} articles
     * @param {string} format - 'txt', 'md', or 'json'
     */
    exportMultiple(articles, format) {
      if (!articles || articles.length === 0) return;

      if (articles.length === 1) {
        switch (format) {
          case 'txt': this.exportAsTxt(articles[0]); break;
          case 'md': this.exportAsMarkdown(articles[0]); break;
          case 'json': this.exportAsJson(articles[0]); break;
        }
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'txt': {
          let txt = `CleanNews Vault — Exportación de ${articles.length} artículos\n`;
          txt += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n`;
          txt += '═'.repeat(60) + '\n\n';

          articles.forEach((article, i) => {
            txt += '════════════════════════════════════════════════════════\n';
            txt += `Artículo ${i + 1} de ${articles.length}\n`;
            txt += '════════════════════════════════════════════════════════\n\n';
            txt += `Título: ${article.title}\n`;
            const meta = _metaBlock(article);
            txt += meta.join('\n') + '\n';
            txt += '\n' + '─'.repeat(60) + '\n\n';
            const body = article.contentText || _stripHtml(article.contentHtml || article.content) || article.excerpt || 'Sin contenido';
            txt += body + '\n\n';
          });

          _download(txt, `cleannews_export_${timestamp}.txt`, 'text/plain');
          break;
        }

        case 'md': {
          let md = `# CleanNews Vault — Exportación\n\n`;
          md += `**Fecha:** ${new Date().toLocaleDateString('es-ES')}\n`;
          md += `**Total:** ${articles.length} artículos\n\n---\n\n`;

          articles.forEach((article) => {
            md += `## ${article.title || 'Sin título'}\n\n`;
            if (article.author) md += `**Autor:** ${article.author}\n\n`;
            if (article.source) md += `**Fuente:** ${article.source}\n\n`;
            if (article.publishedAt) md += `**Publicado:** ${article.publishedAt}\n\n`;
            if (article.tags && article.tags.length > 0) {
              md += `**Etiquetas:** ${article.tags.map((t) => '`' + t + '`').join(' ')}\n\n`;
            }
            const body = article.contentHtml
              ? _htmlToMarkdown(article.contentHtml)
              : (article.contentText || article.excerpt || 'Sin contenido');
            md += body + '\n\n---\n\n';
          });

          _download(md, `cleannews_export_${timestamp}.md`, 'text/markdown');
          break;
        }

        case 'json': {
          const json = JSON.stringify({
            exportDate: new Date().toISOString(),
            version: 2,
            app: 'CleanNews Vault',
            count: articles.length,
            articles
          }, null, 2);
          _download(json, `cleannews_export_${timestamp}.json`, 'application/json');
          break;
        }
      }
    },

    // ─────────────────────────────────────────────────────────────
    // BACKUP & RESTORE
    // ─────────────────────────────────────────────────────────────

    /**
     * Export a full backup (articles + collections) as JSON and trigger download.
     */
    async exportBackup() {
      try {
        const jsonString = await CleanNewsStorage.exportBackup();
        const timestamp = new Date().toISOString().split('T')[0];
        _download(jsonString, `cleannews_backup_${timestamp}.json`, 'application/json');
      } catch (err) {
        console.error('[CleanNewsExport] exportBackup error:', err);
      }
    },

    /**
     * Open a file picker, read the selected JSON file, and import via CleanNewsStorage.
     *
     * @returns {Promise<{success: boolean, count: number}>}
     */
    async importBackup() {
      return new Promise((resolve) => {
        try {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';

          input.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) {
              resolve({ success: false, count: 0 });
              return;
            }

            try {
              const text = await file.text();
              const result = await CleanNewsStorage.importBackup(text);
              resolve(result);
            } catch (err) {
              console.error('[CleanNewsExport] importBackup read error:', err);
              resolve({ success: false, count: 0 });
            }
          };

          input.oncancel = () => {
            resolve({ success: false, count: 0 });
          };

          input.click();
        } catch (err) {
          console.error('[CleanNewsExport] importBackup error:', err);
          resolve({ success: false, count: 0 });
        }
      });
    },

    // ─────────────────────────────────────────────────────────────
    // INTERNAL HELPERS (exposed for testing / advanced use)
    // ─────────────────────────────────────────────────────────────

    _download,
    _sanitizeFilename,
    _escapeYaml,
    _stripHtml,
    _htmlToMarkdown
  };
})();

// ── HTML escape helpers ──────────────────────────────────────────

function _escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function _escAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Export globally
if (typeof window !== 'undefined') {
  window.CleanNewsExport = CleanNewsExport;
}
