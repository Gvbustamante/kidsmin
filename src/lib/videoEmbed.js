/**
 * Detecta si una URL es de YouTube o Vimeo y devuelve la URL de embed.
 * Retorna null si no es un enlace de video reconocido.
 */
export function getVideoEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)

    // YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = null
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1)
      } else if (u.pathname.startsWith('/watch')) {
        videoId = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1]
      } else if (u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1]
      }
      if (videoId) {
        // Limpiar cualquier path extra
        videoId = videoId.split('/')[0].split('?')[0]
        return `https://www.youtube.com/embed/${videoId}`
      }
    }

    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const match = u.pathname.match(/\/(\d+)/)
      if (match) return `https://player.vimeo.com/video/${match[1]}`
    }
  } catch {
    // URL inválida
  }
  return null
}

/**
 * Revisa si un enlace es un video embebible (YouTube/Vimeo).
 */
export function isVideoLink(url) {
  return !!getVideoEmbedUrl(url)
}
