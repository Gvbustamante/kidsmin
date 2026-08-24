import { useConfigIglesia } from '../lib/configIglesia'

export default function AppLogo({ emojiClassName = 'text-4xl', imgClassName = 'h-10 w-10 object-contain' }) {
  const config = useConfigIglesia()

  if (config?.logo_url) {
    return <img src={config.logo_url} alt="Logo de la escuelita" className={imgClassName} />
  }
  return <span className={emojiClassName}>📖</span>
}
