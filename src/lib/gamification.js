// Insignias/niveles de estrella ahora son configurables por el admin —
// ver src/lib/nivelesEstrella.js (badgeActual, siguienteBadge, etc.)

export const MENSAJES_MOTIVACION = [
  '¡Lo hiciste increíble!',
  'Jesús está feliz de que estés aprendiendo.',
  '¡Eres un gran explorador de la Biblia!',
  'Has ganado una nueva estrella.',
  '¡Sigue brillando!',
  'Dios está muy orgulloso de ti hoy.',
]

export function mensajeAleatorio() {
  return MENSAJES_MOTIVACION[Math.floor(Math.random() * MENSAJES_MOTIVACION.length)]
}

// Estructura preparada para audio futuro (narración y efectos de sonido).
// Hoy no reproduce nada: solo deja el punto de enganche listo para cuando
// haya archivos de audio. Ej. futuro: new Audio(`/sounds/${name}.mp3`).play()
export function playSound(_name) {}
