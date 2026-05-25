// CleanNews Vault - Utilidades de exportación
// Exporta artículos en diferentes formatos

const CleanNewsExport = {
  /**
   * Exporta un artículo como TXT
   */
  exportAsTxt(article) {
    let text = '';
    text += '═'.repeat(60) + '\n';
    text += article.title + '\n';
    text += '═'.repeat(60) + '\n\n';

    if (article.author) text += 'Autor: ' + article.author + '\n';
    if (article.source) text += 'Fuente: ' + article.source + '\n';
    if (article.sourceUrl) text += 'URL: ' + article.sourceUrl + '\n';
    if (article.publishedAt) text += 'Publicado: ' + article.publishedAt + '\n';
    if (article.readTime) text += 'Tiempo de lectura: ~' + article.readTime + ' min\n';
    if (article.wordCount) text += 'Palabras: ' + article.wordCount + '\n';
    if (article.tags && article.tags.length > 0) text += 'Etiquetas: ' + article.tags.join(', ') + '\n';
    if (article.notes) text += '\nNotas: ' + article.notes + '\n';

    text += '\n' + '─'.repeat(60) + '\n\n';
    text += article.content || article.excerpt || 'Sin contenido';
    text += '\n';

    this._download(text, this._sanitizeFilename(article.title) + '.txt', 'text/plain');
  },

  /**
   * Exporta un artículo como Markdown
   */
  exportAsMarkdown(article) {
    let md = '---\n';
    md += 'title: "' + this._escapeYaml(article.title) + '"\n';
    if (article.author) md += 'author: "' + this._escapeYaml(article.author) + '"\n';
    if (article.source) md += 'source: "' + this._escapeYaml(article.source) + '"\n';
    if (article.sourceUrl) md += 'url: "' + this._escapeYaml(article.sourceUrl) + '"\n';
    if (article.publishedAt) md += 'published: "' + this._escapeYaml(article.publishedAt) + '"\n';
    if (article.readTime) md += 'read_time: ' + article.readTime + '\n';
    if (article.wordCount) md += 'word_count: ' + article.wordCount + '\n';
    if (article.tags && article.tags.length > 0) {
      md += 'tags:\n';
      article.tags.forEach(tag => {
        md += '  - "' + this._escapeYaml(tag) + '"\n';
      });
    }
    if (article.notes) md += 'notes: "' + this._escapeYaml(article.notes) + '"\n';
    md += 'saved: "' + (article.createdAt || new Date().toISOString()) + '"\n';
    md += '---\n\n';

    md += '# ' + (article.title || 'Sin título') + '\n\n';

    if (article.author || article.source) {
      md += '> ';
      const metaParts = [];
      if (article.author) metaParts.push('Por ' + article.author);
      if (article.source) metaParts.push(article.source);
      if (article.publishedAt) metaParts.push(article.publishedAt);
      md += metaParts.join(' | ');
      md += '\n\n';
    }

    md += (article.content || article.excerpt || 'Sin contenido') + '\n';

    if (article.sourceUrl) {
      md += '\n---\n\n';
      md += '**Fuente original:** [' + article.source + '](' + article.sourceUrl + ')\n';
    }

    this._download(md, this._sanitizeFilename(article.title) + '.md', 'text/markdown');
  },

  /**
   * Exporta un artículo como JSON
   */
  exportAsJson(article) {
    const json = JSON.stringify(article, null, 2);
    this._download(json, this._sanitizeFilename(article.title) + '.json', 'application/json');
  },

  /**
   * Exporta múltiples artículos
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
      case 'txt':
        let txt = 'CleanNews Vault - Exportación de ' + articles.length + ' artículos\n';
        txt += 'Fecha: ' + new Date().toLocaleDateString('es-ES') + '\n';
        txt += '═'.repeat(60) + '\n\n';

        articles.forEach((article, i) => {
          txt += '════════════════════════════════════════════════════════\n';
          txt += `Artículo ${i + 1} de ${articles.length}\n`;
          txt += '════════════════════════════════════════════════════════\n\n';
          txt += 'Título: ' + article.title + '\n';
          if (article.author) txt += 'Autor: ' + article.author + '\n';
          if (article.source) txt += 'Fuente: ' + article.source + '\n';
          if (article.sourceUrl) txt += 'URL: ' + article.sourceUrl + '\n';
          txt += '\n' + (article.content || article.excerpt || 'Sin contenido') + '\n\n';
        });

        this._download(txt, `cleannews_export_${timestamp}.txt`, 'text/plain');
        break;

      case 'json':
        const json = JSON.stringify({ exportDate: new Date().toISOString(), count: articles.length, articles }, null, 2);
        this._download(json, `cleannews_export_${timestamp}.json`, 'application/json');
        break;

      case 'md':
        let md = `# CleanNews Vault - Exportación\n\n`;
        md += `**Fecha:** ${new Date().toLocaleDateString('es-ES')}\n`;
        md += `**Total:** ${articles.length} artículos\n\n---\n\n`;

        articles.forEach(article => {
          md += '## ' + (article.title || 'Sin título') + '\n\n';
          if (article.author) md += '**Autor:** ' + article.author + '\n\n';
          if (article.source) md += '**Fuente:** ' + article.source + '\n\n';
          if (article.publishedAt) md += '**Publicado:** ' + article.publishedAt + '\n\n';
          if (article.tags && article.tags.length > 0) {
            md += '**Etiquetas:** ' + article.tags.map(t => '`' + t + '`').join(' ') + '\n\n';
          }
          md += (article.content || article.excerpt || 'Sin contenido') + '\n\n---\n\n';
        });

        this._download(md, `cleannews_export_${timestamp}.md`, 'text/markdown');
        break;
    }
  },

  // Utilidades internas

  _download(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  _sanitizeFilename(name) {
    if (!name) return 'articulo';
    return name
      .toLowerCase()
      .substring(0, 80)
      .replace(/[^a-z0-9áéíóúñü\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  _escapeYaml(str) {
    if (!str) return '';
    return str.replace(/"/g, '\\"');
  }
};

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.CleanNewsExport = CleanNewsExport;
}
