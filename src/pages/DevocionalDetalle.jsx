import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Spinner from '../components/Spinner'
import RichTextView from '../components/RichTextView'
import ReaccionesBar from '../components/ReaccionesBar'
import FilePreview, { getFileIcon } from '../components/FilePreview'
import { getVideoEmbedUrl } from '../lib/videoEmbed'

function fileUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export default function DevocionalDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [devocional, setDevocional] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [sugeridos, setSugeridos] = useState(null)
  const [preview, setPreview] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('devocionales_ninos')
      .select('*, nivel:niveles(nombre), devocional_archivos(*), devocional_reacciones(*)')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) {
      setNotFound(true)
      return
    }
    setDevocional(data)
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setSugeridos(null)
    supabase
      .from('devocionales_ninos')
      .select('*, devocional_reacciones(*)')
      .neq('id', id)
      .order('fecha', { ascending: false })
      .limit(4)
      .then(({ data }) => setSugeridos(data || []))
  }, [id])

  function compartir() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb navigate={navigate} />
        <p className="card text-ink/50">No se encontró este devocional.</p>
      </div>
    )
  }
  if (!devocional) return <Spinner />

  const archivos = devocional.devocional_archivos || []
  const esFotoDevocional = (f) =>
    f.tipo?.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|avif)$/i.test(f.nombre_archivo || '')
  const fotos = archivos.filter(esFotoDevocional)
  const otrosArchivos = archivos.filter((f) => !esFotoDevocional(f))

  return (
    <div className="flex flex-col gap-6">
      {/* ═══ Breadcrumb + Compartir ═══ */}
      <div className="flex items-center justify-between">
        <Breadcrumb navigate={navigate} titulo={devocional.titulo} />
        <button
          onClick={compartir}
          className="flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink/50 transition-colors hover:bg-sky-50 hover:text-sky-600"
        >
          {copiado ? '✅ Copiado' : '🔗 Compartir'}
        </button>
      </div>

      {/* ═══ Hero con imagen ═══ */}
      {devocional.imagen_url && (
        <div className="relative overflow-hidden rounded-2xl shadow-soft">
          <img
            src={devocional.imagen_url}
            alt={devocional.titulo}
            className="w-full max-h-[380px] object-cover cursor-pointer"
            onClick={() => setPreview({ url: devocional.imagen_url, nombre: devocional.titulo, mime: 'image/*' })}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {devocional.activo && <span className="badge bg-sunshine-200/90 text-sunshine-800">🟢 Activo</span>}
              {devocional.nivel?.nombre && (
                <span className="badge bg-white/20 text-white backdrop-blur-sm">{devocional.nivel.nombre}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-4xl drop-shadow-lg">{devocional.titulo}</h1>
            <p className="mt-1 text-sm font-bold text-white/70">{devocional.fecha}</p>
          </div>
        </div>
      )}

      {/* ═══ Sin imagen: encabezado normal ═══ */}
      {!devocional.imagen_url && (
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{devocional.titulo}</h1>
                {devocional.activo && <span className="badge bg-sunshine-200 text-sunshine-800">🟢 Activo</span>}
              </div>
              {devocional.nivel?.nombre && (
                <p className="mt-1 text-sm font-bold uppercase text-sky-500">{devocional.nivel.nombre}</p>
              )}
            </div>
            <span className="rounded-xl bg-ink/5 px-3 py-1 text-sm font-bold text-ink/50">{devocional.fecha}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Columna principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Versículo */}
          {devocional.versiculo && (
            <div className="rounded-2xl border-l-4 border-sunshine-300 bg-sunshine-50 p-5">
              <p className="text-lg italic text-ink/80 leading-relaxed">📖 &ldquo;{devocional.versiculo}&rdquo;</p>
            </div>
          )}

          {/* Video embebido (YouTube/Vimeo) */}
          {devocional.enlace_externo && getVideoEmbedUrl(devocional.enlace_externo) && (
            <div className="overflow-hidden rounded-2xl bg-ink shadow-soft">
              <iframe
                src={getVideoEmbedUrl(devocional.enlace_externo)}
                title="Video"
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Enlace externo (no video) */}
          {devocional.enlace_externo && !getVideoEmbedUrl(devocional.enlace_externo) && (
            <a
              href={devocional.enlace_externo}
              target="_blank"
              rel="noreferrer"
              className="inline-block w-fit rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-600 transition-colors hover:bg-sky-100"
            >
              🔗 Abrir enlace externo
            </a>
          )}

          {/* Contenido */}
          <div className="card">
            <RichTextView html={devocional.contenido} />
          </div>

          {/* Galería de fotos */}
          {fotos.length > 0 && (
            <div className="card">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">📸 Galería de fotos</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {fotos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreview({
                      url: fileUrl(f.bucket || 'actividades', f.storage_path),
                      nombre: f.nombre_archivo,
                      mime: f.tipo,
                    })}
                    className="group aspect-square overflow-hidden rounded-2xl bg-ink/5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    <img
                      src={fileUrl(f.bucket || 'actividades', f.storage_path)}
                      alt={f.nombre_archivo || ''}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Otros materiales con preview */}
          {otrosArchivos.length > 0 && (
            <div className="card">
              <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">📎 Materiales</p>
              <div className="flex flex-col gap-2">
                {otrosArchivos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreview({
                      url: fileUrl(f.bucket || 'actividades', f.storage_path),
                      nombre: f.nombre_archivo,
                      mime: f.tipo,
                    })}
                    className="flex items-center gap-3 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="text-2xl">{getFileIcon(f.nombre_archivo, f.tipo)}</span>
                    <span className="min-w-0 flex-1 truncate font-bold text-ink">{f.nombre_archivo || 'Archivo'}</span>
                    <span className="shrink-0 text-sm font-bold text-sky-600">👁️ Ver</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reacciones */}
          <div className="card">
            <ReaccionesBar
              tabla="devocional_reacciones"
              columnaId="devocional_id"
              columnaUsuario="usuario_id"
              targetId={devocional.id}
              reacciones={devocional.devocional_reacciones}
              onChanged={load}
            />
          </div>
        </div>

        {/* ═══ Sidebar: otros devocionales ═══ */}
        <aside className="w-full shrink-0 lg:w-72 xl:w-80">
          <div className="card sticky top-4">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink/40">🙏 Otros devocionales</p>
            {sugeridos === null ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/5" />
                ))}
              </div>
            ) : sugeridos.length === 0 ? (
              <p className="text-sm text-ink/40">No hay otros devocionales aún.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {sugeridos.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/devocionales/${d.id}`)}
                    className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-sky-50"
                  >
                    {d.imagen_url ? (
                      <img src={d.imagen_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sunshine-100 text-xl">🙏</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{d.titulo}</p>
                      {d.versiculo && <p className="truncate text-xs italic text-ink/50">&ldquo;{d.versiculo}&rdquo;</p>}
                      <p className="mt-0.5 text-xs font-bold text-coral-500">{d.devocional_reacciones?.length || 0} ❤️</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Preview modal */}
      <FilePreview
        open={!!preview}
        onClose={() => setPreview(null)}
        url={preview?.url}
        nombre={preview?.nombre}
        mime={preview?.mime}
      />
    </div>
  )
}

function Breadcrumb({ navigate, titulo }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <button onClick={() => navigate('/devocionales')} className="font-bold text-sky-500 hover:underline">
        Devocionales
      </button>
      {titulo && (
        <>
          <span className="text-ink/30">›</span>
          <span className="truncate text-ink/50">{titulo}</span>
        </>
      )}
    </nav>
  )
}
