export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico'

export type SignalCategory =
  | 'secretismo'
  | 'aislamiento'
  | 'contenido_sexual'
  | 'solicitud_imagenes'
  | 'cambio_plataforma'
  | 'regalos_promesas'
  | 'manipulacion'
  | 'datos_personales'
  | 'presion'
  | 'identidad_sospechosa'

export interface DetectedSignal {
  id: string
  category: SignalCategory
  label: string
  explanation: string
  severity: 1 | 2 | 3
  matches: string[]
}

export interface AnalysisResult {
  level: RiskLevel
  score: number
  signals: DetectedSignal[]
  summary: string
  nextSteps: string[]
}

interface PatternRule {
  id: string
  category: SignalCategory
  label: string
  explanation: string
  severity: 1 | 2 | 3
  patterns: RegExp[]
}

const RULES: PatternRule[] = [
  {
    id: 'secreto-padres',
    category: 'secretismo',
    label: 'Pide mantener el contacto en secreto',
    explanation:
      'Quien intenta acercarse de forma indebida suele pedir que no cuentes nada a tu familia o docentes.',
    severity: 3,
    patterns: [
      /no\s+le\s+(digas|cuentes)\s+a\s+(tus?\s+)?(pap[aá]s?|mam[aá]s?|padres|familia|nadie)/i,
      /que\s+sea\s+(nuestro\s+)?secreto/i,
      /no\s+cuentes\s+(nada|esto)/i,
      /entre\s+nosotros/i,
      /si\s+se\s+enteran\s+(te\s+)?(castigan|retan|pegan)/i,
    ],
  },
  {
    id: 'fotos-intimas',
    category: 'solicitud_imagenes',
    label: 'Solicita fotos o videos personales',
    explanation:
      'Pedir fotos del cuerpo, en ropa interior o de contenido íntimo es una señal grave de riesgo.',
    severity: 3,
    patterns: [
      /mand[aá]s?(me)?\s+(una\s+)?(foto|fotito|fotitos|video|videito)/i,
      /foto\s+(tuya|sin\s+ropa|desnud|en\s+ropa\s+interior|en\s+bombacha|en\s+calzon)/i,
      /mostr[aá]s?(me)?\s+(el\s+)?cuerpo/i,
      /sacate\s+(una\s+)?foto/i,
      /nudes?/i,
      /\bpack\b/i,
    ],
  },
  {
    id: 'contenido-sexual',
    category: 'contenido_sexual',
    label: 'Conversación con tono sexual',
    explanation:
      'Hablar de temas sexuales con un menor, o empujar hacia eso, es un indicio fuerte de grooming.',
    severity: 3,
    patterns: [
      /\b(sexo|sexual|coger|chupar|beso\s+franc[eé]s|excit|caliente|pito|pene|vagina|tetas?|culo)\b/i,
      /te\s+gustar[ií]a\s+(probar|hacer)/i,
      /sos\s+(muy\s+)?(sexy|hot|provocativ)/i,
    ],
  },
  {
    id: 'cambio-app',
    category: 'cambio_plataforma',
    label: 'Quiere pasar a otra app o chat privado',
    explanation:
      'Mover la charla a WhatsApp, Discord, Telegram u otro canal más privado dificulta que alguien más vea lo que pasa.',
    severity: 2,
    patterns: [
      /pasemos(nos)?\s+a\s+(whats?app|wsp|telegram|discord|signal|instagram|ig|snap)/i,
      /dame\s+(tu\s+)?(n[uú]mero|usuario|user|ig|snap)/i,
      /escribime\s+por\s+(privado|wsp|whats?app)/i,
      /hablemos\s+por\s+(videollamada|llamada|discord)/i,
    ],
  },
  {
    id: 'regalos',
    category: 'regalos_promesas',
    label: 'Ofrece regalos, plata o favores',
    explanation:
      'Regalos, plata o “ayudas” a cambio de atención o fotos suelen usarse para generar deuda emocional.',
    severity: 2,
    patterns: [
      /te\s+(compro|regalo|dono|doy)\s+/i,
      /(plata|dinero|gift\s*card|skin|robux|v-?bucks|recarga)/i,
      /si\s+hac[eé]s\s+esto\s+te\s+(doy|regalo)/i,
      /pago\s+(yo|todo)/i,
    ],
  },
  {
    id: 'aislamiento',
    category: 'aislamiento',
    label: 'Intenta aislarte de amigos o familia',
    explanation:
      'Desacreditar a quienes te cuidan o pedir que dejes de hablarles es una táctica de control.',
    severity: 2,
    patterns: [
      /tus?\s+(amigos|padres|familia)\s+(no\s+te\s+entienden|son\s+malos|te\s+odian)/i,
      /solo\s+yo\s+te\s+(entiendo|quiero|cuido)/i,
      /no\s+necesitas\s+a\s+(nadie|ellos)/i,
      /ellos\s+no\s+saben\s+nada/i,
    ],
  },
  {
    id: 'manipulacion',
    category: 'manipulacion',
    label: 'Usa culpa, amenaza o chantaje emocional',
    explanation:
      'Frases como “si no lo hacés no te quiero” o amenazas de publicar algo buscan doblar tu voluntad.',
    severity: 3,
    patterns: [
      /si\s+no\s+(lo\s+)?hac[eé]s\s+(no\s+te\s+(hablo|quiero)|te\s+(odio|bloqueo))/i,
      /voy\s+a\s+(publicar|subir|mostrar|contar)\s+(tus?\s+)?(fotos?|videos?|secretos?)/i,
      /te\s+vas\s+a\s+arrepentir/i,
      /me\s+vas\s+a\s+hacer\s+(sufrir|llorar|matar)/i,
      /despu[eé]s\s+de\s+todo\s+lo\s+que\s+hice\s+por\s+ti/i,
    ],
  },
  {
    id: 'datos',
    category: 'datos_personales',
    label: 'Pide datos personales o de ubicación',
    explanation:
      'Preguntar dónde vivís, a qué escuela vas o cuándo estás solo puede preparar un contacto riesgoso.',
    severity: 2,
    patterns: [
      /d[oó]nde\s+(viv[ií]s|qued[aá]s|est[aá]s)/i,
      /(a\s+qu[eé]|qu[eé])\s+(colegio|escuela|escuelita)\s+(vas|andas)/i,
      /est[aá]s\s+solo\/?a?/i,
      /a\s+qu[eé]\s+hora\s+(salen|vuelven)\s+(tus?\s+)?(pap[aá]s?|padres)/i,
      /mandame\s+(tu\s+)?(direcci[oó]n|ubicaci[oó]n|ubicacion)/i,
    ],
  },
  {
    id: 'presion',
    category: 'presion',
    label: 'Presiona para responder rápido o aceptar',
    explanation:
      'Apurar respuestas o insistir cuando dijiste que no es una forma de erosionar tus límites.',
    severity: 1,
    patterns: [
      /contestame\s+(ya|ahora|r[aá]pido)/i,
      /por\s+qu[eé]\s+no\s+(quer[eé]s|me\s+habl[aá]s)/i,
      /no\s+seas\s+(aburrid|antip[aá]tic|fr[ií]a|fr[ií]o)/i,
      /dale\s+una\s+sola\s+vez/i,
      /prometo\s+que\s+no\s+le\s+digo\s+a\s+nadie/i,
    ],
  },
  {
    id: 'edad-falsa',
    category: 'identidad_sospechosa',
    label: 'Identidad o edad poco creíble',
    explanation:
      'Decir que tiene tu misma edad en un juego, o evitar mostrar la cara, puede ocultar quién es realmente.',
    severity: 2,
    patterns: [
      /tengo\s+(1[0-5]|[89])\s+a[nñ]os/i,
      /soy\s+(de\s+tu\s+edad|igual\s+que\s+vos)/i,
      /no\s+puedo\s+(mostrar|mandar)\s+(mi\s+)?(cara|foto\s+real)/i,
      /mi\s+c[aá]mara\s+no\s+funciona/i,
      /despu[eé]s\s+te\s+muestro\s+(qui[eé]n\s+soy|mi\s+cara)/i,
    ],
  },
]

const CATEGORY_WEIGHT: Record<SignalCategory, number> = {
  secretismo: 3,
  aislamiento: 2,
  contenido_sexual: 4,
  solicitud_imagenes: 4,
  cambio_plataforma: 2,
  regalos_promesas: 2,
  manipulacion: 4,
  datos_personales: 2,
  presion: 1,
  identidad_sospechosa: 2,
}

/** Marcas típicas de la propia app / material educativo (no un chat). */
const APP_UI_MARKERS: RegExp[] = [
  /se[nñ]al\s+segura/i,
  /aprender\s+las\s+se[nñ]ales/i,
  /analiz[aá]\s+chats?\s+y\s+capturas/i,
  /elegir\s+de\s+la\s+galer[ií]a/i,
  /usar\s+c[aá]mara/i,
  /buscar\s+indicios/i,
  /instalar\s+(app|se[nñ]al)/i,
  /pedir\s+ayuda\s+ahora/i,
  /juego\s+online/i,
  /red\s+social/i,
  /\bchantaje\b/i,
  /nivel\s+de\s+riesgo/i,
  /este\s+resultado\s+identifica\s+se[nñ]ales/i,
  /l[ií]nea\s+137/i,
  /en\s+tu\s+dispositivo/i,
  /fragmentos?\s+cargados/i,
  /probar\s+con\s+un\s+ejemplo/i,
  /contenido\s+breve,?\s+seg[uú]n\s+qui[eé]n/i,
  /vos\s+eleg[ií]s\s+qu[eé]\s+revisar/i,
]

const EDUCATIONAL_CONTEXT =
  /se[nñ]al(es)?\s+de\s+alerta|si\s+alguien|por\s+ejemplo|aprend|prevenci[oó]n|indicad|suele\s+(pedir|usar)|t[aá]ctica|herramienta\s+digital|no\s+diagnostica|orienta\s+para|identifica\s+se[nñ]ales|adulto\s+de\s+confianza|material\s+educativ/i

function uniqueMatches(text: string, patterns: RegExp[]): string[] {
  const found = new Set<string>()
  for (const pattern of patterns) {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    )
    for (const match of text.matchAll(global)) {
      const snippet = match[0]?.trim()
      if (!snippet) continue
      const index = match.index ?? 0
      const window = text.slice(Math.max(0, index - 90), index + snippet.length + 90)
      // Evita disparar por frases de las lecciones / tips de la propia app
      if (EDUCATIONAL_CONTEXT.test(window)) continue
      found.add(snippet.slice(0, 80))
    }
  }
  return [...found]
}

function countAppUiMarkers(text: string): number {
  return APP_UI_MARKERS.filter((marker) => marker.test(text)).length
}

function looksLikeAppOrEducationalPage(text: string): boolean {
  const markers = countAppUiMarkers(text)
  if (markers >= 3) return true
  if (markers >= 2 && /se[nñ]al\s+segura/i.test(text)) return true
  return false
}

function stripAppUiNoise(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (/^\[fragmento/i.test(line)) return true
      if (/se[nñ]al\s+segura/i.test(line)) return false
      const hits = APP_UI_MARKERS.filter((marker) => marker.test(line)).length
      return hits === 0
    })
    .join('\n')
    .trim()
}

function looksLikeConversation(text: string): boolean {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\[fragmento/i.test(line))

  const shortDialogue = lines.filter((line) => line.length > 0 && line.length <= 140).length
  const chatHints =
    /\b(hola|ok+|dale|jaj+|basura|buenas|q\s*tal|qué\s*tal|nn+|bb+)\b/i.test(text) ||
    /\d{1,2}:\d{2}/.test(text) ||
    /(whats?app|wsp|telegram|discord)/i.test(text)

  return shortDialogue >= 4 || (shortDialogue >= 2 && chatHints)
}

function levelFromScore(score: number, hasCritical: boolean): RiskLevel {
  if (hasCritical || score >= 10) return 'critico'
  if (score >= 6) return 'alto'
  if (score >= 3) return 'medio'
  return 'bajo'
}

function buildSummary(level: RiskLevel, signals: DetectedSignal[]): string {
  if (signals.length === 0) {
    return 'No encontramos indicios claros en este texto. Igual, si algo te genera duda o miedo, hablá con un adulto de confianza.'
  }

  const top = signals
    .slice(0, 3)
    .map((s) => s.label.toLowerCase())
    .join('; ')

  switch (level) {
    case 'critico':
      return `Hay indicios graves (${top}). No estés sola/o con esto: pedí ayuda ahora a un adulto de confianza y considerá denunciar.`
    case 'alto':
      return `Detectamos varias señales preocupantes (${top}). Conviene cortar el contacto riesgoso y contárselo a alguien que te cuide.`
    case 'medio':
      return `Aparecen indicios que merecen atención (${top}). Guardá evidencia y hablalo con un adulto antes de seguir la conversación.`
    default:
      return `Hay señales leves. Prestá atención a cómo te hace sentir la charla y no compartas datos personales.`
  }
}

function buildNextSteps(level: RiskLevel): string[] {
  const base = [
    'No borres la conversación: capturas y mensajes sirven como evidencia.',
    'Contale a un adulto de confianza (familia, docente o referente).',
  ]

  if (level === 'bajo') {
    return [
      ...base,
      'Si algo te incomoda, podés bloquear y dejar de responder sin dar explicaciones.',
      'Repasá las señales de alerta para reconocerlas más rápido la próxima vez.',
    ]
  }

  if (level === 'medio') {
    return [
      ...base,
      'Evitá mandar fotos, datos de tu casa/escuela o pasar a otra app.',
      'Si la persona insiste o se enoja cuando decís que no, es una señal fuerte.',
    ]
  }

  return [
    ...base,
    'Bloqueá a la persona y no confrontes sola/o.',
    'En Argentina podés denunciar en la fiscalía de delitos informáticos, comisaría o líneas oficiales de ayuda.',
    'Si hay riesgo inmediato, pedí ayuda urgente a un adulto y a las autoridades.',
  ]
}

export function analyzeConversation(raw: string): AnalysisResult {
  const original = raw.trim()
  if (!original) {
    return {
      level: 'bajo',
      score: 0,
      signals: [],
      summary: 'Pegá una conversación para analizar posibles indicios.',
      nextSteps: ['Copiá el chat (sin datos sensibles de más) y volvé a analizar.'],
    }
  }

  let text = original

  // Si la captura incluye la web/app, quitamos ese ruido y analizamos lo que reste
  if (looksLikeAppOrEducationalPage(original)) {
    const cleaned = stripAppUiNoise(original)
    if (!cleaned || !looksLikeConversation(cleaned)) {
      return {
        level: 'bajo',
        score: 0,
        signals: [],
        summary:
          'Esto parece contenido de Señal Segura o material educativo, no un chat real. Por eso no marcamos riesgo. Cargá capturas de WhatsApp, un juego u otra conversación.',
        nextSteps: [
          'En el chat sospechoso, sacá capturas de pantalla.',
          'Volvé a Señal Segura y cargalas desde la galería.',
          'Si preferís, pegá los mensajes como texto y analizá.',
        ],
      }
    }
    text = cleaned
  }

  const signals: DetectedSignal[] = []

  for (const rule of RULES) {
    const matches = uniqueMatches(text, rule.patterns)
    if (matches.length > 0) {
      signals.push({
        id: rule.id,
        category: rule.category,
        label: rule.label,
        explanation: rule.explanation,
        severity: rule.severity,
        matches,
      })
    }
  }

  signals.sort((a, b) => b.severity - a.severity)

  let score = signals.reduce(
    (sum, signal) => sum + signal.severity * CATEGORY_WEIGHT[signal.category],
    0,
  )

  const conversational = looksLikeConversation(text)

  // Si no parece un diálogo (p. ej. un párrafo informativo), bajamos la severidad
  if (signals.length > 0 && !conversational) {
    score = Math.min(score, 2)
  }

  const hasCritical =
    conversational &&
    score >= 6 &&
    signals.some(
      (s) =>
        s.severity === 3 &&
        (s.category === 'solicitud_imagenes' ||
          s.category === 'contenido_sexual' ||
          s.category === 'manipulacion' ||
          s.category === 'secretismo'),
    )

  const level = levelFromScore(score, hasCritical)
  const visibleSignals = !conversational && level === 'bajo' ? [] : signals

  return {
    level,
    score,
    signals: visibleSignals,
    summary: buildSummary(level, visibleSignals),
    nextSteps: buildNextSteps(level),
  }
}

export const LEVEL_META: Record<
  RiskLevel,
  { title: string; tone: string; hint: string; actionNow: string }
> = {
  bajo: {
    title: 'Riesgo bajo',
    tone: 'Por ahora no hay indicios fuertes, pero la prevención siempre ayuda.',
    hint: 'Seguí atenta/o a cómo te hace sentir la conversación.',
    actionNow: 'Si te incomoda, bloqueá y contale a un adulto.',
  },
  medio: {
    title: 'Riesgo medio',
    tone: 'Hay señales que no conviene ignorar.',
    hint: 'Hablalo con un adulto y cuidá tus datos.',
    actionNow: 'No mandes fotos ni datos. Contale a un adulto hoy.',
  },
  alto: {
    title: 'Riesgo alto',
    tone: 'Los indicios son preocupantes.',
    hint: 'Cortá el contacto riesgoso y pedí acompañamiento.',
    actionNow: 'Bloqueá, guardá capturas y pedí ayuda a un adulto.',
  },
  critico: {
    title: 'Riesgo crítico',
    tone: 'Hay indicios graves de posible grooming.',
    hint: 'Pedí ayuda ahora. No estás sola/o.',
    actionNow: 'Pedí ayuda ahora. No confrontes sola/o.',
  },
}
