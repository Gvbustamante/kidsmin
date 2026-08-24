import DOMPurify from 'dompurify'

const CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
}

/**
 * Muestra HTML guardado por <RichTextEditor> de forma segura: lo sanitiza con
 * DOMPurify (solo negrita/cursiva/listas/links) antes de inyectarlo, porque
 * cualquier docente o admin puede haber guardado ese contenido y no hay que
 * confiar en él a ciegas.
 */
export default function RichTextView({ html, className = '' }) {
  if (!html) return null
  const limpio = DOMPurify.sanitize(html, CONFIG)
  if (!limpio.trim()) return null
  return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: limpio }} />
}
