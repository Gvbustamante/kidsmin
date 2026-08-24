/**
 * Helper de búsqueda de texto libre, usado por las barras de búsqueda de
 * Nuestra comunidad, Devocionales y Actividades. Ignora mayúsculas, acentos
 * y etiquetas HTML (para poder buscar dentro de campos que vienen del
 * editor de texto enriquecido, como `descripcion` o `contenido`).
 */
export function normalizar(texto) {
  return (texto || '')
    .toString()
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** ¿Alguno de los `campos` contiene la palabra buscada? Si `query` está vacío, siempre coincide. */
export function coincide(query, ...campos) {
  const q = normalizar(query).trim()
  if (!q) return true
  return normalizar(campos.filter(Boolean).join(' ')).includes(q)
}
