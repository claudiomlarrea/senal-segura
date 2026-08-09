import { createWorker, type Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null
let progressCb: ((progress: number) => void) | null = null

export class OcrQualityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OcrQualityError'
  }
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('spa', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          progressCb?.(m.progress)
        }
      },
    })
  }
  return workerPromise
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo abrir la imagen'))
    }
    img.src = url
  })
}

/** Mejora contraste y tamaño para chats/capturas. */
async function preprocessImage(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const maxSide = 1600
  const scale = Math.min(2.2, maxSide / Math.max(img.width, img.height, 1))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return file

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    // contraste suave + umbral liviano para texto oscuro sobre fondo claro
    const boosted = gray < 150 ? Math.max(0, gray * 0.75 - 12) : Math.min(255, gray * 1.15 + 20)
    data[i] = boosted
    data[i + 1] = boosted
    data[i + 2] = boosted
  }
  ctx.putImageData(imageData, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png', 1),
  )
  return blob ?? file
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .match(/[a-zñ]{3,}/g) ?? []
}

/** Detecta basura típica de OCR (foto de pantalla, reflejos, UI). */
export function assessOcrText(raw: string): { ok: boolean; reason?: string; cleaned: string } {
  const cleaned = raw
    .replace(/\u0000/g, '')
    .replace(/[|_[\]{}<>^=~`]+/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (cleaned.length < 12) {
    return {
      ok: false,
      cleaned,
      reason:
        'No se leyó texto suficiente. Usá una captura de pantalla del chat (desde Galería), no una foto a otra pantalla.',
    }
  }

  const letters = (cleaned.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length
  const digits = (cleaned.match(/\d/g) ?? []).length
  const symbols = (cleaned.match(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.,;:!?¿¡"'()\-_/]/g) ?? []).length
  const total = Math.max(1, cleaned.replace(/\s/g, '').length)
  const letterRatio = letters / total
  const symbolRatio = symbols / total
  const words = tokenizeWords(cleaned)
  const uniqueWords = new Set(words)

  // Español/chat suele tener palabras reales; basura OCR tiene pocas.
  const commonHints = [
    'hola',
    'que',
    'como',
    'foto',
    'mand',
    'whats',
    'padre',
    'mama',
    'papa',
    'secreto',
    'chat',
    'mensaje',
    'años',
    'anos',
    'amor',
    'bloque',
    'numero',
    'colegio',
    'juego',
  ]
  const hintHits = commonHints.filter((h) => cleaned.toLowerCase().includes(h)).length

  if (letterRatio < 0.45 || symbolRatio > 0.28 || words.length < 4 || uniqueWords.size < 3) {
    return {
      ok: false,
      cleaned,
      reason:
        'La imagen no se leyó bien (parece foto borrosa o de otra pantalla). Sacá captura del chat en WhatsApp/juego y subila con Galería, o pegá el texto.',
    }
  }

  // Si hay largo pero casi ninguna palabra “de chat”, también rechazar.
  if (cleaned.length > 40 && hintHits === 0 && words.length < 8) {
    return {
      ok: false,
      cleaned,
      reason:
        'No parece un chat legible. Probá una captura nítida del mensaje o copiá/pegá el texto.',
    }
  }

  // Evitar analizar solo ruido corto de dígitos/símbolos
  if (digits > letters && letterRatio < 0.55) {
    return {
      ok: false,
      cleaned,
      reason: 'La lectura quedó confusa. Mejor pegá el chat o usá una captura más clara.',
    }
  }

  return { ok: true, cleaned }
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  progressCb = onProgress ?? null
  try {
    onProgress?.(0.05)
    const prepared = await preprocessImage(file)
    onProgress?.(0.12)
    const worker = await getWorker()
    const {
      data: { text },
    } = await worker.recognize(prepared)
    const assessment = assessOcrText(text)
    if (!assessment.ok) {
      throw new OcrQualityError(assessment.reason ?? 'No se pudo leer la captura.')
    }
    return assessment.cleaned
  } finally {
    progressCb = null
  }
}
