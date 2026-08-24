import { useConfigIglesia } from '../lib/configIglesia'

export default function AppName({ acentoClassName = 'text-coral-500' }) {
  const config = useConfigIglesia()
  const nombre = config?.nombre_iglesia?.trim()

  if (!nombre) {
    return (
      <>
        Kids<span className={acentoClassName}>Min</span>
      </>
    )
  }

  const palabras = nombre.split(/\s+/)
  if (palabras.length === 1) {
    return <>{nombre}</>
  }

  const ultima = palabras.pop()
  const resto = palabras.join(' ')
  return (
    <>
      {resto} <span className={acentoClassName}>{ultima}</span>
    </>
  )
}
