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
import { useInstallPrompt } from './hooks/useInstallPrompt'
import './App.css'

const AUDIENCE_LABEL: Record<Audience, string> = {
  chicos: 'Chicos (8–12)',
  adolescentes: 'Adolescentes',
  adultos: 'Adultos',
}

function levelClass(level: RiskLevel) {
  return `level level--${level}`
}

function readSharedPayload(): string {
  const params = new URLSearchParams(window.location.search)
  const parts = [params.get('text'), params.get('title'), params.get('url')].filter(Boolean)
  return parts.join('\n').trim()
}

export default function App() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [audience, setAudience] = useState<Audience>('chicos')
  const [analyzed, setAnalyzed] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [installDismissed, setInstallDismissed] = useState(false)
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const { canInstall, showIosHint, installed, install } = useInstallPrompt()

  useEffect(() => {
    const shared = readSharedPayload()
    if (!shared) return
    setText(shared)
    const next = analyzeConversation(shared)
    setResult(next)
    setAnalyzed(true)
    window.history.replaceState({}, '', import.meta.env.BASE_URL || '/')
  }, [])

  function showResult(next: AnalysisResult) {
    setResult(next)
    setAnalyzed(true)
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function runAnalysis(value = text) {
    showResult(analyzeConversation(value))
  }

  function loadSample(id: string) {
    const sample = SAMPLE_CHATS.find((item) => item.id === id) ?? SAMPLE_CHATS[0]
    setText(sample.text)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setOcrError(null)
    showResult(analyzeConversation(sample.text))
  }

  function clearAll() {
    setText('')
    setResult(null)
    setAnalyzed(false)
    setOcrError(null)
    setOcrProgress(0)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (galleryRef.current) galleryRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  async function onImageSelected(file: File | undefined) {
    if (!file) return
    setOcrError(null)
    setOcrBusy(true)
    setOcrProgress(0)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))

    try {
      const extracted = await extractTextFromImage(file, setOcrProgress)
      setText(extracted)
      showResult(analyzeConversation(extracted))
    } catch (error) {
      const message =
        error instanceof OcrQualityError
          ? error.message
          : 'Falló la lectura de la captura. Usá Galería con una captura del chat, o pegá el texto.'
      setOcrError(message)
      setText('')
      setResult(null)
      setAnalyzed(false)
    } finally {
      setOcrBusy(false)
    }
  }

  const lessons = LESSONS.filter((l) => l.audience === audience)
  const showInstallBanner = !installDismissed && (canInstall || showIosHint) && !installed
  const urgent = analyzed && result && (result.level === 'alto' || result.level === 'critico')

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
              Analizá una conversación o captura para identificar señales de alerta y saber cómo
              actuar.
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
              Vos elegís qué revisar. No lee WhatsApp ni otras apps por debajo. Todo se procesa en
              tu teléfono.
            </p>
          </div>

          <div className="analyze-grid">
            <div className="compose">
              <p className="compose-label">1. Traé el chat (desde la galería)</p>
              <p className="ocr-steps">
                Primero hacé la <strong>captura de pantalla</strong> en WhatsApp o el juego.
                Después tocá el botón verde y elegí esa imagen en <strong>Google Fotos / Galería</strong>.
                No uses la cámara apuntando a otra pantalla.
              </p>
              <div className="input-modes">
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.png,.jpg,.jpeg,.webp"
                  hidden
                  onChange={(e) => void onImageSelected(e.target.files?.[0])}
                />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => void onImageSelected(e.target.files?.[0])}
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
              <p className="app-build">Versión con galería · si no ves este texto, recargá la página</p>

              {previewUrl && (
                <div className="capture-preview">
                  <img src={previewUrl} alt="Captura seleccionada para analizar" />
                </div>
              )}

              {ocrBusy && (
                <div className="ocr-status" role="status">
                  <p>Leyendo texto de la captura… {Math.round(ocrProgress * 100)}%</p>
                  <div className="ocr-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(8, Math.round(ocrProgress * 100))}%` }} />
                  </div>
                </div>
              )}
              {ocrError && <p className="ocr-error">{ocrError}</p>}

              <label htmlFor="chat">O pegá el texto acá</label>
              <textarea
                id="chat"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Pegá mensajes sospechosos…"
                rows={10}
              />

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
                  onClick={() => runAnalysis()}
                  disabled={ocrBusy || !text.trim()}
                >
                  Buscar indicios
                </button>
                <button type="button" className="btn btn-text" onClick={clearAll}>
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
                    <p>Nivel de riesgo, señales detectadas y qué hacer en el momento.</p>
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
            Después: sacá captura del chat sospechoso o usá “Compartir” hacia Señal Segura
            (Android).
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
          grooming. Desarrollada por Claudio Larrea.
        </p>
        <p className="footer-note">
          Identifica señales de alerta; no diagnostica delitos ni sustituye acompañamiento
          profesional o judicial. El análisis corre en tu dispositivo y no monitorea otras apps.
        </p>
      </footer>
    </div>
  )
}
