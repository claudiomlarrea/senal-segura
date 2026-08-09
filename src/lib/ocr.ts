import { createWorker, type Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null
let progressCb: ((progress: number) => void) | null = null

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

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  progressCb = onProgress ?? null
  try {
    const worker = await getWorker()
    const {
      data: { text },
    } = await worker.recognize(file)
    return text.replace(/\u0000/g, '').trim()
  } finally {
    progressCb = null
  }
}
