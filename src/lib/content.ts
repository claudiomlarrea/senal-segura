export type Audience = 'chicos' | 'adolescentes' | 'adultos'

export interface Lesson {
  id: string
  audience: Audience
  title: string
  body: string
}

export const LESSONS: Lesson[] = [
  {
    id: 'c1',
    audience: 'chicos',
    title: 'Tu cuerpo y tus fotos son tuyos',
    body: 'Nadie tiene derecho a pedirte fotos de tu cuerpo. Si alguien lo hace, no es un juego: contáselo a un adulto que te cuide.',
  },
  {
    id: 'c2',
    audience: 'chicos',
    title: 'Los secretos buenos y los secretos raros',
    body: 'Un secreto de cumpleaños es divertido. Un secreto que te pide “no le digas a mamá/papá” sobre una persona de internet es una señal de alerta.',
  },
  {
    id: 'c3',
    audience: 'chicos',
    title: 'En los juegos también hay desconocidos',
    body: 'Aunque jueguen juntos, no conocés de verdad a quien está del otro lado. No compartas tu escuela, tu casa ni tu número.',
  },
  {
    id: 'a1',
    audience: 'adolescentes',
    title: 'La presión no es cariño',
    body: 'Si alguien se enoja porque no mandás fotos, no pasás a otra app o no contestás al instante, está cruzando un límite. Bloquear está bien.',
  },
  {
    id: 'a2',
    audience: 'adolescentes',
    title: 'El chantaje existe',
    body: 'Amenazar con publicar fotos o chats es un delito. No negocies sola/o: guardá evidencia y pedí ayuda.',
  },
  {
    id: 'a3',
    audience: 'adolescentes',
    title: 'Cualquiera puede fingir quién es',
    body: 'Una persona adulta puede hacerse pasar por alguien de tu edad. Pedir videollamada o datos privados no te hace “desconfiada/o”: te protege.',
  },
  {
    id: 'ad1',
    audience: 'adultos',
    title: 'Acompañar sin espionaje a ciegas',
    body: 'Conocer las apps, preguntar con respeto y acordar reglas claras suele proteger más que el control oculto. La confianza abre conversaciones.',
  },
  {
    id: 'ad2',
    audience: 'adultos',
    title: 'Franja 8–12: alta vulnerabilidad',
    body: 'En esa edad empiezan los juegos con chat y aún faltan herramientas para frenar. Estar cerca en ese momento cambia el riesgo.',
  },
  {
    id: 'ad3',
    audience: 'adultos',
    title: 'No hay un “perfil típico” del agresor',
    body: 'Puede ser cualquiera detrás de un dispositivo. Enseñá señales de conducta, no estereotipos de apariencia.',
  },
]

export interface HelpResource {
  name: string
  detail: string
  action?: string
}

export const HELP_RESOURCES: HelpResource[] = [
  {
    name: 'Adulto de confianza',
    detail: 'Familia, docente, preceptor/a o referente. Es el primer paso más importante.',
  },
  {
    name: 'Fiscalía / delitos informáticos',
    detail:
      'En San Juan, la UFI de Delitos Informáticos recibe denuncias de grooming. Conservá capturas y datos del perfil.',
  },
  {
    name: 'Línea 137 (Argentina)',
    detail: 'Atención ante violencia sexual y situaciones de abuso. Orientación y derivación.',
    action: 'tel:137',
  },
  {
    name: '911 / policía',
    detail: 'Si hay peligro inmediato o encuentros presenciales acordados, pedí ayuda urgente.',
    action: 'tel:911',
  },
]

export const SAMPLE_CHAT = `Hola, vi que jugás al mismo juego que yo
Qué bueno, ¿cuántos años tenés?
Yo también tengo 11, qué coincidencia
No le digas a tus papás que hablamos, que sea nuestro secreto
Pasemos a WhatsApp, dame tu número
Si me mandás una fotito te regalo una skin
Dale, no seas aburrida, es solo una foto`
