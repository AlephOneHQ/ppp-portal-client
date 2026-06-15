import DOMPurify from 'dompurify'

export const sanitizeHTML = (html: string): string => {
  const config = {
    ALLOWED_TAGS: [
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Text formatting
      'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del', 'ins',
      'sub', 'sup', 'mark', 'small',
      // Lists
      'ul', 'ol', 'li',
      // Blocks
      'div', 'span', 'blockquote', 'pre', 'code',
      // Links & media
      'a', 'img',
      // Tables
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col',
      // Misc
      'hr',
    ],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'align', 'data-gutter'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORCE_BODY: false,
  }

  return DOMPurify.sanitize(html, config)
}

export const isPlainText = (content: string): boolean => {
  // Any HTML tag means it's not plain text
  return !/<[^>]+>/.test(content)
}

export const convertToPlainText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
