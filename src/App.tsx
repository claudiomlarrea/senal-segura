import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  analyzeConversation,
  LEVEL_META,
  type AnalysisResult,
  type RiskLevel,
} from './lib/detect'
import {
  HELP_RESOURCES,
  LESSONS,
  OCR_TIPS,
  RESULT_DISCLAIMER,
  SAMPLE_CHATS,
  type Audience,
} from './lib/content'
import { extractTextFromImage, OcrQualityError } from './lib/ocr'
import { fetchInstallCount, formatInstallCount } from './lib/installStats'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import './App.css'

const AUDIENCE_LABEL: Record<Audience, string> = {
  chicos: 'Chicos (8–12)',
  adolescentes: 'Adolescentes',
  adultos: 'Adultos',
}

const MAX_CAPTURES = 12

interface EvidenceItem {
  id: string
  kind: 'image' | 'text'
  label: string
  text: string
  previewUrl?: string
}

function levelClass(level: RiskLevel) {
  return `level level--${level}`
}

function readSharedPayload(): string {
  const params = new URLSearchParams(window.location.search)
  const parts = [params.get('text'), params.get('title'), params.get('url')].filter(Boolean)
  return parts.join('\n').trim()
}

function combineEvidence(items: EvidenceItem[], draftText: string) {
  const chunks = [
    ...items.map((item, index) => `[Fragmento ${index + 1} — ${item.label}]\n${item.text}`),
  ]
  if (draftText.trim()) {
    chunks.push(`[Texto adicional]\n${draftText.trim()}`)
  }
  return chunks.join('\n\n').trim()
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [draftText, setDraftText] = useState('')
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [audience, setAudience] = useState<Audience>('chicos')
  const [analyzed, setAnalyzed] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [installCount, setInstallCount] = useState<number | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const evidenceRef = useRef<EvidenceItem[]>([])
  const { canInstall, showIosHint, installed, install } = useInstallPrompt((total) => {
    setInstallCount(total)
  })

  useEffect(() => {
    void fetchInstallCount().then((n) => {
      if (n != null) setInstallCount(n)
    })
  }, [])

  useEffect(() => {
    evidenceRef.current = evidence
  }, [evidence])

  useEffect(() => {
    const shared = readSharedPayload()
    if (!shared) return
    setEvidence([
      {
        id: newId(),
        kind: 'text',
        label: 'Texto compartido',
        text: shared,
      },
    ])
    setDraftText('')
    window.history.replaceState({}, '', import.meta.env.BASE_URL || '/')
  }, [])

  useEffect(() => {
    return () => {
      evidenceRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])

  function showResult(next: AnalysisResult) {
    setResult(next)
    setAnalyzed(true)
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function runAnalysis() {
    const combined = combineEvidence(evidence, draftText)
    if (!combined) return
    showResult(analyzeConversation(combined))
  }

  function loadSample(id: string) {
    const sample = SAMPLE_CHATS.find((item) => item.id === id) ?? SAMPLE_CHATS[0]
    evidence.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    setEvidence([
      {
        id: newId(),
        kind: 'text',
        label: `Ejemplo · ${sample.label}`,
        text: sample.text,
      },
    ])
    setDraftText('')
    setOcrError(null)
    setAnalyzed(false)
    setResult(null)
  }

  function clearAll() {
    evidence.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    setEvidence([])
    setDraftText('')
    setResult(null)
    setAnalyzed(false)
    setOcrError(null)
    setOcrProgress(0)
    setOcrStatus('')
    if (galleryRef.current) galleryRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  function removeEvidence(id: string) {
    setEvidence((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
    setAnalyzed(false)
    setResult(null)
  }

  function addTextFragment() {
    const value = draftText.trim()
    if (!value) return
    setEvidence((prev) => [
      ...prev,
      {
        id: newId(),
        kind: 'text',
        label: `Texto ${prev.filter((item) => item.kind === 'text').length + 1}`,
        text: value,
      },
    ])
    setDraftText('')
    setAnalyzed(false)
    setResult(null)
    setOcrError(null)
  }

  async function onImagesSelected(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = [...fileList].filter((file) => file.type.startsWith('image/'))
    if (!files.length) return

    const remaining = MAX_CAPTURES - evidence.filter((item) => item.kind === 'image').length
    if (remaining <= 0) {
      setOcrError(`Podés cargar hasta ${MAX_CAPTURES} capturas. Eliminá alguna para agregar más.`)
      return
    }

    const selected = files.slice(0, remaining)
    setOcrError(null)
    setOcrBusy(true)
    setOcrProgress(0)
    setAnalyzed(false)
    setResult(null)

    const added: EvidenceItem[] = []
    const failures: string[] = []

    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i]
        setOcrStatus(`Leyendo captura ${i + 1} de ${selected.length}…`)
        setOcrProgress(i / selected.length)
        const previewUrl = URL.createObjectURL(file)
        try {
          const extracted = await extractTextFromImage(file, (p) => {
            setOcrProgress((i + p) / selected.length)
          })
          added.push({
            id: newId(),
            kind: 'image',
            label: `Captura ${evidence.filter((item) => item.kind === 'image').length + added.length + 1}`,
            text: extracted,
            previewUrl,
          })
        } catch (error) {
          URL.revokeObjectURL(previewUrl)
          failures.push(
            error instanceof OcrQualityError
              ? error.message
              : `No se pudo leer “${file.name || 'la imagen'}”.`,
          )
        }
      }

      if (added.length) {
        setEvidence((prev) => {
          const imageCount = prev.filter((item) => item.kind === 'image').length
          return [
            ...prev,
            ...added.map((item, index) => ({
              ...item,
              label: `Captura ${imageCount + index + 1}`,
            })),
          ]
        })
      }

      if (failures.length) {
        setOcrError(
          added.length
            ? `Se agregaron ${added.length} captura(s). Algunas no se leyeron bien: pegá ese tramo como texto.`
            : failures[0],
        )
      }
    } finally {
      setOcrBusy(false)
      setOcrProgress(0)
      setOcrStatus('')
      if (galleryRef.current) galleryRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  const lessons = LESSONS.filter((l) => l.audience === audience)
  const showInstallBanner = !installDismissed && (canInstall || showIosHint) && !installed
  const urgent = analyzed && result && (result.level === 'alto' || result.level === 'critico')
  const canAnalyze = evidence.length > 0 || Boolean(draftText.trim())
  const fragmentCount = evidence.length + (draftText.trim() ? 1 : 0)

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#inicio">
          <span className="brand-mark" aria-hidden="true" />
          Señal Segura
        </a>
        <nav className="nav" aria-label="Principal">
          <a href="#analizar">Analizar</a>
          <a href="#instalar">Instalar</a>
          <a href="#aprender">Aprender</a>
          <a href="#ayuda">Ayuda</a>
        </nav>
      </header>

      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            className="install-banner"
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
          >
            <div>
              <strong>Instalá Señal Segura en tu teléfono</strong>
              <p>
                {showIosHint
                  ? 'En iPhone (Safari): Compartir → “Añadir a pantalla de inicio”.'
                  : 'Queda como app, con acceso rápido para analizar chats y capturas.'}
              </p>
            </div>
            <div className="install-banner-actions">
              {canInstall && (
                <button type="button" className="btn btn-primary btn-small" onClick={() => void install()}>
                  Instalar
                </button>
              )}
              <button
                type="button"
                className="btn btn-text btn-small"
                onClick={() => setInstallDismissed(true)}
              >
                Ahora no
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        <section className="hero" id="inicio">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="brand-lockup">Señal Segura</p>
            <h1>Una herramienta de prevención frente al grooming</h1>
            <p className="lede">
              Cargá varias capturas o mensajes de un chat para identificar señales de alerta y saber
              cómo actuar.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#analizar">
                Analizar ahora
              </a>
              <a className="btn btn-ghost" href="#instalar">
                Instalar app
              </a>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            <div className="pulse-ring" />
            <div className="pulse-ring pulse-ring--delay" />
            <div className="signal-core">
              <span>en tu dispositivo</span>
            </div>
          </motion.div>
        </section>

        <section className="section analyze" id="analizar">
          <div className="section-head">
            <h2>Analizá chats y capturas</h2>
            <p>
              Podés sumar varias capturas y textos antes de analizar: muchas veces los mensajes
              riesgosos llegan repartidos. Todo se procesa en tu dispositivo.
            </p>
          </div>

          <div className="analyze-grid">
            <div className="compose">
              <p className="compose-label">1. Sumá capturas del chat</p>
              <p className="ocr-steps">
                En WhatsApp o el juego, hacé varias <strong>capturas de pantalla</strong>. Después
                tocá el botón verde y elegí <strong>una o más</strong> en Google Fotos / Galería.
                Cuando estén todas, tocá <strong>Buscar indicios</strong>.
              </p>
              <div className="input-modes">
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.png,.jpg,.jpeg,.webp"
                  multiple
                  hidden
                  onChange={(e) => void onImagesSelected(e.target.files)}
                />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => void onImagesSelected(e.target.files)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => galleryRef.current?.click()}
                  disabled={ocrBusy}
                >
                  Elegir de la galería
                </button>
                <button
                  type="button"
                  className="btn btn-sky"
                  onClick={() => cameraRef.current?.click()}
                  disabled={ocrBusy}
                >
                  Usar cámara
                </button>
              </div>

              <p className="ocr-tips">Tips: {OCR_TIPS.join(' · ')}</p>

              {ocrBusy && (
                <div className="ocr-status" role="status">
                  <p>
                    {ocrStatus || 'Leyendo capturas…'} {Math.round(ocrProgress * 100)}%
                  </p>
                  <div className="ocr-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(8, Math.round(ocrProgress * 100))}%` }} />
                  </div>
                </div>
              )}
              {ocrError && <p className="ocr-error">{ocrError}</p>}

              {evidence.length > 0 && (
                <div className="evidence-list">
                  <p className="compose-label">
                    Fragmentos cargados ({evidence.length}
                    {draftText.trim() ? ' + texto en edición' : ''})
                  </p>
                  <ul>
                    {evidence.map((item) => (
                      <li key={item.id} className="evidence-item">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="" />
                        ) : (
                          <div className="evidence-text-thumb" aria-hidden="true">
                            Aa
                          </div>
                        )}
                        <div className="evidence-meta">
                          <strong>{item.label}</strong>
                          <p>{item.text.slice(0, 110)}{item.text.length > 110 ? '…' : ''}</p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-text btn-small"
                          onClick={() => removeEvidence(item.id)}
                          disabled={ocrBusy}
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <label htmlFor="chat">2. Agregá más texto si hace falta</label>
              <textarea
                id="chat"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Pegá otro tramo del chat y tocá “Agregar texto”, o dejalo acá y se incluye al analizar…"
                rows={8}
              />
              <div className="compose-actions compose-actions--secondary">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={addTextFragment}
                  disabled={ocrBusy || !draftText.trim()}
                >
                  Agregar texto
                </button>
              </div>

              <p className="compose-label">Probar con un ejemplo</p>
              <div className="sample-chips">
                {SAMPLE_CHATS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className="chip"
                    onClick={() => loadSample(sample.id)}
                    disabled={ocrBusy}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              <div className="compose-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={runAnalysis}
                  disabled={ocrBusy || !canAnalyze}
                >
                  Buscar indicios
                  {fragmentCount > 1 ? ` (${fragmentCount} fragmentos)` : ''}
                </button>
                <button type="button" className="btn btn-text" onClick={clearAll} disabled={ocrBusy}>
                  Limpiar
                </button>
              </div>
            </div>

            <div className="result-panel" aria-live="polite" ref={resultRef} id="resultado">
              <AnimatePresence mode="wait">
                {!analyzed || !result ? (
                  <motion.div
                    key="empty"
                    className="result-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="result-empty-title">Acá aparece el resultado</p>
                    <p>
                      Cargá varias capturas o textos y después tocá “Buscar indicios”. Vas a ver el
                      nivel de riesgo, las señales y qué hacer.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className={levelClass(result.level)}>
                      <p className="level-kicker">{LEVEL_META[result.level].title}</p>
                      <p className="level-action">{LEVEL_META[result.level].actionNow}</p>
                      <p className="level-tone">{LEVEL_META[result.level].tone}</p>
                    </div>

                    {urgent && (
                      <div className="urgent-actions">
                        <a className="btn btn-primary" href="#ayuda">
                          Pedir ayuda ahora
                        </a>
                        <a className="btn btn-sky" href="tel:137">
                          Llamar 137
                        </a>
                        <a className="btn btn-ghost" href="tel:911">
                          911
                        </a>
                      </div>
                    )}

                    <p className="result-disclaimer">{RESULT_DISCLAIMER}</p>

                    <p className="summary">{result.summary}</p>

                    {result.signals.length > 0 ? (
                      <ul className="signals">
                        {result.signals.map((signal) => (
                          <li key={signal.id}>
                            <div className="signal-top">
                              <strong>{signal.label}</strong>
                              <span className={`sev sev-${signal.severity}`}>
                                {signal.severity === 3
                                  ? 'grave'
                                  : signal.severity === 2
                                    ? 'medio'
                                    : 'leve'}
                              </span>
                            </div>
                            <p>{signal.explanation}</p>
                            {signal.matches.length > 0 && (
                              <p className="match">Fragmento: “{signal.matches[0]}”</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">Sin patrones coincidentes en este texto.</p>
                    )}

                    <div className="next">
                      <h3>Qué podés hacer</h3>
                      <ol>
                        {result.nextSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      <div className="next-actions">
                        <a className="btn btn-primary btn-small" href="#ayuda">
                          Cómo pedir ayuda
                        </a>
                        <a className="btn btn-ghost btn-small" href="#aprender">
                          Ver señales
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="section install" id="instalar">
          <div className="section-head">
            <h2>Instalála en el teléfono</h2>
            <p>Queda en la pantalla de inicio, como una app.</p>
            {installCount != null && (
              <p className="install-count" aria-live="polite">
                Instalaciones: <strong>{formatInstallCount(installCount)}</strong>
              </p>
            )}
          </div>

          <div className="install-grid">
            <article className="install-card">
              <h3>Android</h3>
              <ol>
                <li>Abrí esta web en Chrome.</li>
                <li>Menú ⋮ → “Instalar app”.</li>
                <li>Confirmá. Listo.</li>
              </ol>
            </article>
            <article className="install-card">
              <h3>iPhone</h3>
              <ol>
                <li>Abrí esta web en Safari.</li>
                <li>Compartir → “Añadir a pantalla de inicio”.</li>
                <li>Confirmá. Listo.</li>
              </ol>
            </article>
          </div>

          <p className="install-note">
            Después: sacá varias capturas del chat sospechoso y cargalas juntas desde la galería.
          </p>

          {canInstall && (
            <button type="button" className="btn btn-primary" onClick={() => void install()}>
              Instalar Señal Segura
            </button>
          )}
          {installed && <p className="muted">Ya está instalada en este dispositivo.</p>}
        </section>

        <section className="section learn" id="aprender">
          <div className="section-head">
            <h2>Aprender las señales</h2>
            <p>Contenido breve, según quién lo lea.</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Audiencia">
            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={audience === key}
                className={audience === key ? 'tab tab-active' : 'tab'}
                onClick={() => setAudience(key)}
              >
                {AUDIENCE_LABEL[key]}
              </button>
            ))}
          </div>

          <div className="lessons">
            <AnimatePresence mode="wait">
              <motion.div
                key={audience}
                className="lessons-grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {lessons.map((lesson) => (
                  <article key={lesson.id} className="lesson">
                    <h3>{lesson.title}</h3>
                    <p>{lesson.body}</p>
                  </article>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section className="section help" id="ayuda">
          <div className="section-head">
            <h2>Pedir ayuda</h2>
            <p>
              Esta app orienta; no reemplaza a un adulto, un profesional ni una denuncia. Elegí el
              canal según la urgencia.
            </p>
          </div>

          <ul className="help-list">
            {HELP_RESOURCES.map((resource) => (
              <li key={resource.name}>
                <p className={`help-kind help-kind--${resource.kind}`}>{resource.kindLabel}</p>
                <h3>{resource.name}</h3>
                <p>{resource.detail}</p>
                {resource.action && (
                  <a className="btn btn-ghost btn-small" href={resource.action}>
                    {resource.actionLabel ?? 'Contactar'}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Accesos rápidos">
        <a href="#analizar">Analizar</a>
        <a href="#resultado">Resultado</a>
        <a href="#ayuda">Ayuda</a>
        <a href="#instalar">Instalar</a>
      </nav>

      <footer className="footer">
        <p>
          <strong>Señal Segura</strong> — herramienta digital de prevención y educación frente al
          grooming.
        </p>
        <p className="footer-note">
          Identifica señales de alerta; no diagnostica delitos ni sustituye acompañamiento
          profesional o judicial. El análisis corre en tu dispositivo y no monitorea otras apps.
        </p>
      </footer>
    </div>
  )
}
