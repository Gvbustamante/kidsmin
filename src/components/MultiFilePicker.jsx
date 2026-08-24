import { useRef } from 'react'

function esFoto(file) {
  return file.type?.startsWith('image/')
}

/**
 * Selector de archivos que se pueden ir agregando de a uno o varios a la
 * vez, sin perder los que ya se habían elegido (a diferencia de un
 * <input type="file multiple"> normal, que reemplaza toda la selección
 * cada vez que se abre de nuevo el diálogo). Cada archivo agregado se
 * puede quitar individualmente antes de subir.
 */
export default function MultiFilePicker({ archivos, onChange, label = '📎 Agregar archivo(s)', accept }) {
  const inputRef = useRef(null)

  function agregar(fileList) {
    if (!fileList?.length) return
    onChange([...archivos, ...Array.from(fileList)])
  }

  function quitar(index) {
    onChange(archivos.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !py-2 !text-sm">
          {label}
        </button>
        {archivos.length > 0 && (
          <span className="text-sm text-ink/50">
            {archivos.length} archivo{archivos.length === 1 ? '' : 's'} listo{archivos.length === 1 ? '' : 's'} para subir
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          agregar(e.target.files)
          e.target.value = ''
        }}
      />
      {archivos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {archivos.map((f, i) => (
            <div key={`${f.name}-${f.lastModified}-${i}`} className="group relative">
              {esFoto(f) ? (
                <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl bg-ink/5 p-1 text-center">
                  <span className="text-lg leading-none">📄</span>
                  <span className="w-full truncate text-[9px] font-bold text-ink/50">{f.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => quitar(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 text-xs font-bold leading-none text-white shadow-sm"
                aria-label={`Quitar ${f.name}`}
                title="Quitar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
