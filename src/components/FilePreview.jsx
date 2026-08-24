import { useState } from 'react'

/**
 * Modal de previsualización de archivos. Soporta:
 * - Imágenes: se muestran en grande
 * - PDF: se embebe con <iframe>
 * - Video: reproductor nativo
 * - Audio: reproductor nativo
 * - Otros: icono grande + botón de descarga
 */

function tipoArchivo(nombre, mime) {
  const n = (nombre || '').toLowerCase()
  const m = (mime || '').toLowerCase()
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif|svg)$/i.test(n)) return 'imagen'
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (m.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(n)) return 'video'
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(n)) return 'audio'
  if (/\.(docx?|xlsx?|pptx?|csv|txt|rtf)$/i.test(n)) return 'documento'
  return 'otro'
}

function iconoGrande(tipo) {
  switch (tipo) {
    case 'imagen': return '🖼️'
    case 'pdf': return '📄'
    case 'video': return '🎬'
    case 'audio': return '🎵'
    case 'documento': return '📝'
    default: return '📎'
  }
}

export function getFileType(nombre, mime) {
  return tipoArchivo(nombre, mime)
}

export function getFileIcon(nombre, mime) {
  return iconoGrande(tipoArchivo(nombre, mime))
}

function imprimir(url, tipo) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  function limpiar() {
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }

  function disparar() {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    limpiar()
  }

  if (tipo === 'pdf') {
    iframe.onload = disparar
    iframe.src = url
  } else {
    iframe.onload = () => {
      const img = iframe.contentDocument.querySelector('img')
      if (img.complete) disparar()
      else img.onload = disparar
    }
    iframe.srcdoc = `<html><body style="margin:0"><img src="${url}" style="width:100%" /></body></html>`
  }
}

export default function FilePreview({ url, nombre, mime, open, onClose }) {
  if (!open || !url) return null

  const tipo = tipoArchivo(nombre, mime)
  const puedeImprimir = tipo === 'imagen' || tipo === 'pdf'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] max-w-[95vw] flex-col items-center gap-3 sm:max-w-[85vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior */}
        <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-2 shadow-soft backdrop-blur">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
            <span className="mr-2">{iconoGrande(tipo)}</span>
            {nombre || 'Archivo'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {puedeImprimir && (
              <button
                type="button"
                onClick={() => imprimir(url, tipo)}
                className="rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-600 transition-colors hover:bg-sky-100"
              >
                🖨️ Imprimir
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-600 transition-colors hover:bg-sky-100"
            >
              ⬇️ Descargar
            </a>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-xl leading-none text-ink/60 transition-colors hover:bg-ink/10"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="w-full overflow-hidden rounded-2xl bg-white shadow-soft">
          {tipo === 'imagen' && (
            <img
              src={url}
              alt={nombre || 'Imagen'}
              className="max-h-[78vh] w-auto max-w-full object-contain mx-auto"
            />
          )}

          {tipo === 'pdf' && (
            <iframe
              src={url}
              title={nombre || 'PDF'}
              className="h-[78vh] w-full min-w-[320px] sm:min-w-[600px]"
            />
          )}

          {tipo === 'video' && (
            <video
              src={url}
              controls
              className="max-h-[78vh] w-full"
              controlsList="nodownload"
            >
              Tu navegador no soporta la reproducción de video.
            </video>
          )}

          {tipo === 'audio' && (
            <div className="flex flex-col items-center gap-6 p-8 sm:p-12">
              <span className="text-7xl">{iconoGrande(tipo)}</span>
              <p className="text-center text-lg font-bold text-ink/70">{nombre || 'Audio'}</p>
              <audio src={url} controls className="w-full max-w-md">
                Tu navegador no soporta la reproducción de audio.
              </audio>
            </div>
          )}

          {(tipo === 'documento' || tipo === 'otro') && (
            <div className="flex flex-col items-center gap-4 p-8 sm:p-12">
              <span className="text-7xl">{iconoGrande(tipo)}</span>
              <p className="text-center text-lg font-bold text-ink/70">{nombre || 'Archivo'}</p>
              <p className="text-center text-sm text-ink/40">
                Este tipo de archivo no se puede previsualizar en el navegador.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary !text-base"
              >
                ⬇️ Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
