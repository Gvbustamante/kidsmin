export function whatsappLink(telefono) {
  if (!telefono) return null
  const digits = telefono.replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}`
}
