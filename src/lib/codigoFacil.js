// Genera un "código fácil" para usar como cédula/usuario cuando no se
// sabe la cédula real de alguien (ej. un padre/madre, o quien recoge al
// niño). Se usa igual que una cédula: sirve de usuario y como base de la
// contraseña por defecto.
export function generarCodigoFacil(nombreBase) {
  const base = (nombreBase || 'familia')
    .trim()
    .split(' ')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z]/g, '')
  const numero = Math.floor(100 + Math.random() * 900)
  return `${base || 'familia'}${numero}`
}
