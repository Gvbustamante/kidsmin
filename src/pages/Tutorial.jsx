import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import GobeLogo from '../components/GobeLogo'

function Step({ number, icon, title, children, color = 'sky' }) {
  const bg = {
    sky: 'bg-sky-400',
    grass: 'bg-grass-400',
    sunshine: 'bg-sunshine-400',
    coral: 'bg-coral-400',
    grape: 'bg-grape-400',
  }[color]

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${bg} text-xl font-bold text-white shadow-pop`}>
          {number}
        </div>
        <div className="mt-2 w-0.5 flex-1 bg-ink/10 last:hidden" />
      </div>
      <div className="card mb-6 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="text-ink/60">{children}</div>
      </div>
    </div>
  )
}

function AdminGuide() {
  return (
    <>
      <Step number="1" icon="🎒" title="Crea tus clases" color="grass">
        Ve a <strong>Clases</strong> → <em>+ Nueva clase</em>. Ponle nombre y el rango de edad (ej. "Exploradores", 3 a 5 años).
        Puedes crear todas las que necesite tu escuelita.
      </Step>
      <Step number="2" icon="📆" title="Configura tus días de clase y horarios" color="sky">
        En <strong>Ajustes</strong>, activa qué días de la semana hay escuelita (por defecto solo domingo). Si tienes más de
        un servicio el mismo día (ej. 9:00 am y 11:00 am), agrégalos ahí mismo en <em>Horarios</em> — con uno solo no hace
        falta tocar nada.
      </Step>
      <Step number="3" icon="🍎" title="Agrega a tu equipo (o a un padre/madre)" color="sunshine">
        Ve a <strong>Equipo</strong> → <em>+ Nueva cuenta</em>. Reúne cualquier tipo de cuenta (admin, coordinador,
        docente, padre) en un solo lugar, con búsqueda, edición de datos y restablecer contraseña. Al crear una,
        escribe su nombre y un usuario (su cédula, o un código fácil si no la tienes a mano) — te va a mostrar la
        contraseña que le toca, para que se la des tú directamente (por WhatsApp, en persona, como prefieras). En{' '}
        <strong>Ajustes</strong> → <em>Roles y permisos</em>, puedes prender o apagar cosas como que un docente
        edite/registre niños o vincule padres — vienen algunas activadas por defecto y otras no.
      </Step>
      <Step number="4" icon="🔗" title="Asigna cada docente a su clase" color="sky">
        En <strong>Clases</strong>, edita una clase y marca qué docente(s) la llevan. Si configuraste más de un horario,
        también puedes fijar qué docente cubre cada uno — queda vinculado a la clase automáticamente, sin pasos extra.
      </Step>
      <Step number="5" icon="🧒" title="Registra a los niños" color="coral">
        Ve a <strong>Niños</strong> → <em>+ Nuevo niño/a</em>. Escribe su nombre, fecha de nacimiento, clase y alergias si
        tiene. Desde aquí también puedes desactivar a un niño si ya no asiste, sin borrar su historial.
      </Step>
      <Step number="6" icon="👪" title="Vincula a los padres" color="grape">
        En la tarjeta de cada niño, botón <em>+ Padre</em>. Si es alguien nuevo, crea su cuenta con su cédula. Si ya tiene
        cuenta (por ejemplo, es docente y también es su papá/mamá), usa "Ya tiene cuenta" para vincularlo sin duplicar. Si
        alguna vez necesitas quitarle el acceso a un niño en particular, entra a <em>Ver detalle</em> del niño y toca
        "✕ Desvincular" — su cuenta sigue existiendo, solo pierde ese vínculo.
      </Step>
      <Step number="7" icon="✅" title="Supervisa la asistencia" color="grass">
        En <strong>Asistencia</strong> puedes ver, por fecha y por clase, quién vino cada domingo. En el inicio, la tarjeta
        "Cobertura de hoy" te avisa si falta un docente o si aún no se ha tomado asistencia — solo los días que de verdad
        hay clase.
      </Step>
      <Step number="8" icon="📋" title="Planea cada clase con anticipación" color="sunshine">
        En <strong>Planeación</strong> ves el mes marcado con tus días de clase. Elige un día y, por cada clase (y cada
        horario, si tienes varios), puedes ver quién la cubre, asignar un suplente puntual, y planear ahí mismo la
        actividad de ese día.
      </Step>
      <Step number="9" icon="🎨" title="Revisa las actividades y tareas" color="coral">
        En <strong>Actividades</strong> ves lo que publica cada docente. Una actividad puede marcarse como <em>tarea</em>
        (con un enlace externo opcional) — ahí mismo puedes abrir "Ver entregas" para revisar qué niño ya entregó, cuál
        está pendiente y cuál el docente puso en pausa.
      </Step>
      <Step number="10" icon="⭐" title="Configura las estrellas e insignias" color="sunshine">
        En <strong>Estrellas</strong> puedes editar los motivos rápidos que usan los docentes al reconocer a un niño (ej.
        "🙌 Buen compañerismo"), y las insignias que se van desbloqueando según cuántas estrellas junta cada niño.
      </Step>
      <Step number="11" icon="🙏" title="Publica devocionales para niños" color="grass">
        En <strong>Devocionales</strong> puedes escribir reflexiones cortas pensadas para niños, con su versículo. Marca uno
        como "⭐ Activo" para que aparezca destacado en los 3 dashboards.
      </Step>
      <Step number="12" icon="🧰" title="Lleva el control de materiales y bitácora" color="grape">
        En <strong>Materiales</strong> llevas el inventario (con aviso cuando queda poco), y en <strong>Bitácora</strong>
        ves, por clase y fecha, cómo quedó el salón y qué refrigerio se dio.
      </Step>
      <Step number="13" icon="🔍" title="Revisa la inactividad de vez en cuando" color="sky">
        En <strong>Ajustes</strong>, el botón "Revisar inactividad" pausa (de forma reversible) a los niños sin asistencia
        hace más de 3 meses y a los padres que no han entrado hace más de 2. Tócalo cuando quieras, por ejemplo cada
        domingo.
      </Step>
      <Step number="14" icon="📊" title="Exporta tus listas a Excel" color="coral">
        Niños, Materiales, Bitácora y el resumen mensual de Asistencia tienen un botón "Exportar" que descarga un archivo
        .xlsx listo para abrir.
      </Step>
    </>
  )
}

function DocenteGuide() {
  return (
    <>
      <Step number="1" icon="🏠" title="Revisa tus clases" color="sky">
        En el inicio ves las clases que el admin te asignó, con cuántos niños activos tiene cada una, y el widget
        "Agenda y tareas" con lo próximo que te toca.
      </Step>
      <Step number="2" icon="✅" title="Toma la asistencia" color="grass">
        Ve a <strong>Asistencia</strong>, elige la clase y la fecha. Toca a cada niño para marcarlo presente — se pone
        verde. Al final, toca <em>Guardar asistencia</em>. Si tu clase tiene más de un horario y otro docente ya tomó
        parte, sus marcas ya van a estar cargadas — solo agrega las tuyas.
      </Step>
      <Step number="3" icon="🎨" title="Publica una actividad (o pide una tarea)" color="sunshine">
        Ve a <strong>Actividades</strong> → <em>+ Nueva actividad</em>. Puedes subir varias fotos a la vez. Si además
        quieres que los niños hagan algo en casa, márcala como <em>tarea</em> (puedes agregar un enlace externo, ej. un
        video). Desde ahí mismo, "Ver entregas" te muestra quién ya entregó, quién falta, y te deja poner una tarea en
        pausa si hace falta.
      </Step>
      <Step number="4" icon="📅" title="Agenda un evento" color="grape">
        Ve a <strong>Agenda</strong> → <em>+ Nuevo evento</em> para avisar de un paseo o actividad especial próxima.
      </Step>
      <Step number="5" icon="📋" title="Planea tu clase con anticipación" color="coral">
        En <strong>Planeación</strong> ves el calendario del mes con tus días de clase. Elige un día para ver quién cubre
        tu clase (o planear tú la actividad de ese día) — solo ves tus propias clases, no las de todo el equipo.
      </Step>
      <Step number="6" icon="🌱" title="Registra el progreso de cada niño" color="grass">
        Ve a <strong>Progreso</strong>, elige un niño y anota cómo se comportó, cómo se sintió y qué logró ese día. Ahí
        mismo puedes darle una <strong>estrella ⭐</strong> (elige un motivo rápido o escribe el tuyo) como reconocimiento
        por algo que hizo bien. Cada niño va desbloqueando insignias a medida que junta estrellas, y tanto tú como sus
        padres pueden ver su insignia actual y cuánto le falta para la siguiente.
      </Step>
      <Step number="7" icon="📋" title="Lleva la bitácora de tu clase" color="sunshine">
        En <strong>Bitácora</strong> deja constancia, por fecha, de cómo quedó el salón (con foto) y qué refrigerio se
        dio (con foto).
      </Step>
      <Step number="8" icon="🙏" title="Publica un devocional" color="sky">
        Ve a <strong>Devocionales</strong> → <em>+ Nuevo devocional</em>.
      </Step>
      <Step number="9" icon="👪" title="¿Tienes un hijo/a en la escuelita?" color="grape">
        Pídele al admin que te vincule también como padre/madre de tu hijo/a (opción "Ya tiene cuenta") — así, con la misma
        cuenta, puedes cambiar entre tu vista de docente y ver el progreso de tu hijo/a.
      </Step>
    </>
  )
}

function PadreGuide() {
  return (
    <>
      <Step number="1" icon="🔑" title="Recibe tus datos de acceso" color="sky">
        El admin te da tu usuario y una contraseña (tu usuario seguido de una @). Puedes cambiarla luego desde el
        botón "Contraseña" del menú.
      </Step>
      <Step number="2" icon="🏠" title="Mira la información de tu hijo/a" color="grass">
        En el inicio ves su nombre, edad, clase y alergias registradas. Si tienes varios hijos, puedes cambiar entre ellos.
      </Step>
      <Step number="3" icon="🎨" title="Reacciona a sus actividades y entrega sus tareas" color="coral">
        En <strong>Actividades</strong> ves fotos y lo que hicieron en clase. Toca un emoji (❤️ 👏 🙌 😍) para reaccionar.
        Si una actividad viene marcada como <em>tarea</em>, ahí mismo puedes subir la evidencia (una foto, por ejemplo) y
        dejar un comentario — la docente puede responderte con una nota corta.
      </Step>
      <Step number="4" icon="📅" title="Entérate de los próximos eventos y tareas pendientes" color="grape">
        En el inicio y en <strong>Agenda</strong> ves el widget "Agenda y tareas": los próximos eventos de la clase de tu
        hijo/a, y las tareas que todavía le faltan entregar.
      </Step>
      <Step number="5" icon="🌱" title="Mira su progreso" color="coral">
        En <strong>Progreso</strong> ves cómo se comportó, cómo se sintió y qué logró tu hijo/a en cada clase. También
        aparece su <strong>insignia actual</strong> y sus <strong>estrellas ⭐</strong>: la docente se las va dando como
        reconocimiento, y ahí puedes ver cuántas lleva y qué le falta para la siguiente insignia.
      </Step>
      <Step number="6" icon="🙏" title="Lean juntos un devocional" color="sunshine">
        En <strong>Devocionales</strong> hay reflexiones cortas pensadas para niños que pueden leer juntos en casa.
      </Step>
      <Step number="7" icon="📖" title="No te pierdas el versículo del día" color="sky">
        En el inicio, arriba, aparece un versículo distinto cada día.
      </Step>
    </>
  )
}

const GUIDES = {
  admin: { title: 'Guía para Administrador', Guide: AdminGuide },
  coordinador: { title: 'Guía para Coordinador', Guide: AdminGuide },
  docente: { title: 'Guía para Docente', Guide: DocenteGuide },
  padre: { title: 'Guía para Padres', Guide: PadreGuide },
}

const ROLES = [
  {
    icon: '👑',
    nombre: 'Admin',
    color: 'grape',
    texto:
      'Es quien dirige toda la escuelita. Ve y gestiona absolutamente todo: crea clases, agrega docentes y coordinadores, registra niños, vincula padres, supervisa la asistencia de todas las clases y publica devocionales. Es el único rol que puede activar o desactivar cuentas del equipo.',
  },
  {
    icon: '🗂️',
    nombre: 'Coordinador',
    color: 'sunshine',
    texto:
      'Ayuda al admin en el día a día: puede crear/editar clases, registrar niños, agregar docentes y padres, y ver la asistencia general — igual que el admin, pero no puede agregar otros administradores ni coordinadores.',
  },
  {
    icon: '🍎',
    nombre: 'Docente',
    color: 'sky',
    texto:
      'Es la "miss" o "profe" de una o varias clases. Solo ve y trabaja con sus propias clases asignadas: toma asistencia, publica actividades con fotos, registra el progreso de cada niño/a, y agenda eventos. Si además es mamá/papá de un niño de la escuelita, puede vincularse también como padre/madre y cambiar entre ambas vistas.',
  },
  {
    icon: '👪',
    nombre: 'Padre / Madre',
    color: 'coral',
    texto:
      'Ve únicamente la información de su(s) propio(s) hijo/a(s): su ficha, asistencia, actividades (con opción de reaccionar), progreso y agenda de su clase. Si tiene más de un hijo/a en la escuelita, puede cambiar de vista entre cada uno.',
  },
  {
    icon: '🧒',
    nombre: 'Niño / Niña',
    color: 'grass',
    texto:
      'Los niños no tienen cuenta propia ni inician sesión — son quienes reciben todo el cuidado del sistema. Su información (asistencia, actividades, progreso) la ven y gestionan su docente y sus padres/encargados vinculados, siempre de forma privada y segura.',
  },
]

function RolesTab({ role }) {
  const badge = {
    sky: 'bg-sky-100 text-sky-700',
    grass: 'bg-grass-100 text-grass-700',
    sunshine: 'bg-sunshine-100 text-sunshine-700',
    coral: 'bg-coral-100 text-coral-700',
    grape: 'bg-grape-100 text-grape-700',
  }

  const roles = role === 'padre' ? ROLES.filter((r) => !['Admin', 'Coordinador'].includes(r.nombre)) : ROLES

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {roles.map((r) => (
        <div key={r.nombre} className="card">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl ${badge[r.color]}`}>{r.icon}</span>
            <h3 className="text-lg font-bold">{r.nombre}</h3>
          </div>
          <p className="mt-2 text-ink/60">{r.texto}</p>
        </div>
      ))}
    </div>
  )
}

/**
 * Todo el contenido de Ayuda, sin el encabezado — para poder embeberlo
 * dentro de otra pantalla (Ajustes → pestaña Ayuda, para admin/coordinador)
 * además de su propia ruta /ayuda (para docente y padre, que no tienen
 * Ajustes).
 */
export function AyudaContenido() {
  const { profile } = useAuth()
  const { Guide } = GUIDES[profile.role] || GUIDES.padre
  const [tab, setTab] = useState('guia')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('guia')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'guia' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          Guía paso a paso
        </button>
        <button
          onClick={() => setTab('roles')}
          className={`rounded-full px-5 py-2 text-sm font-bold ${tab === 'roles' ? 'bg-sky-400 text-white' : 'bg-white text-ink/50'}`}
        >
          ¿Qué hace cada rol?
        </button>
      </div>

      {tab === 'guia' ? (
        <>
          <div className="max-w-2xl">
            <Guide />
          </div>
          <div className="card max-w-2xl bg-sky-50">
            <p className="font-bold">¿Tienes dudas?</p>
            <p className="text-ink/60">Pídele ayuda al administrador de tu escuelita, o vuelve a esta página cuando la necesites.</p>
          </div>
        </>
      ) : (
        <RolesTab role={profile.role} />
      )}

      <div className="card max-w-2xl">
        <p className="label mb-3">Acerca de KidsMin</p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="https://gobeapp.com" target="_blank" rel="noreferrer" className="shrink-0">
            <GobeLogo className="h-8 w-auto" />
          </a>
          <div>
            <a
              href="https://gobeapp.com"
              target="_blank"
              rel="noreferrer"
              className="font-extrabold text-sky-600 hover:underline"
            >
              Gobe App Technology
            </a>
            <p className="text-sm text-ink/60">
              Creado por{' '}
              <a href="https://gobeapp.com/gise/" target="_blank" rel="noreferrer" className="font-bold text-coral-500 hover:underline">
                Gisella Bustamante
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Tutorial() {
  const { profile } = useAuth()
  const { title } = GUIDES[profile.role] || GUIDES.padre

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Ayuda 🎓</h1>
        <p className="text-ink/50">{title}</p>
      </div>
      <AyudaContenido />
    </div>
  )
}
