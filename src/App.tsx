import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  analyzeConversation,
  LEVEL_META,
  type AnalysisResult,
  type RiskLevel,
} from './lib/detect'
import { HELP_RESOURCES, LESSONS, SAMPLE_CHAT, type Audience } from './lib/content'
import { extractTextFromImage } from './lib/ocr'
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
  const fileRef = useRef<HTMLInputElement>(null)
  const { canInstall, showIosHint, installed, install } = useInstallPrompt()

  useEffect(() => {
    const shared = readSharedPayload()
    if (!shared) return
    setText(shared)
    const next = analyzeConversation(shared)
    setResult(next)
    setAnalyzed(true)
    window.history.replaceState({}, '', '/')
  }, [])

  function runAnalysis(value = text) {
    const next = analyzeConversation(value)
    setResult(next)
    setAnalyzed(true)
  }

  function loadSample() {
    setText(SAMPLE_CHAT)
    setPreviewUrl(null)
    setOcrError(null)
    runAnalysis(SAMPLE_CHAT)
  }

  function clearAll() {
    setText('')
    setResult(null)
    setAnalyzed(false)
    setOcrError(null)
    setOcrProgress(0)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ''
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
      if (!extracted) {
        setOcrError('No pudimos leer texto en la imagen. Probá con otra captura más nítida o pegá el chat.')
        return
      }
      setText(extracted)
      runAnalysis(extracted)
    } catch {
      setOcrError('Falló la lectura de la captura. Revisá la imagen o pegá el texto manualmente.')
    } finally {
      setOcrBusy(false)
    }
  }

  const lessons = LESSONS.filter((l) => l.audience === audience)
  const showInstallBanner = !installDismissed && (canInstall || showIosHint) && !installed

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
          <a href="#ayuda">Pedir ayuda</a>
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
                  ? 'En iPhone: compartí → “Añadir a pantalla de inicio”.'
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
            <h1>Tu alerta de grooming, en el celular</h1>
            <p className="lede">
              Instalá la app, compartí un mensaje o subí una captura. El análisis corre en tu
              dispositivo y te marca indicios sospechosos.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#analizar">
                Analizar ahora
              </a>
              <a className="btn btn-ghost" href="#instalar">
                Cómo instalarla
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
              Pegá texto, subí una captura o usá “Compartir” hacia Señal Segura. No lee WhatsApp
              u otras apps por debajo: vos elegís qué revisar. Todo se procesa en el teléfono.
            </p>
          </div>

          <div className="analyze-grid">
            <div className="compose">
              <div className="input-modes">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => void onImageSelected(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={() => fileRef.current?.click()}
                  disabled={ocrBusy}
                >
                  Subir o sacar captura
                </button>
              </div>

              {previewUrl && (
                <div className="capture-preview">
                  <img src={previewUrl} alt="Captura seleccionada para analizar" />
                </div>
              )}

              {ocrBusy && (
                <p className="ocr-status" role="status">
                  Leyendo texto de la captura… {Math.round(ocrProgress * 100)}%
                </p>
              )}
              {ocrError && <p className="ocr-error">{ocrError}</p>}

              <label htmlFor="chat">Texto del chat o mensaje sospechoso</label>
              <textarea
                id="chat"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Pegá el chat, o subí una captura para leerlo automáticamente…"
                rows={12}
              />
              <div className="compose-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => runAnalysis()}
                  disabled={ocrBusy}
                >
                  Buscar indicios
                </button>
                <button type="button" className="btn btn-ghost" onClick={loadSample}>
                  Probar ejemplo
                </button>
                <button type="button" className="btn btn-text" onClick={clearAll}>
                  Limpiar
                </button>
              </div>
            </div>

            <div className="result-panel" aria-live="polite">
              <AnimatePresence mode="wait">
                {!analyzed || !result ? (
                  <motion.div
                    key="empty"
                    className="result-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p>
                      Acá vas a ver el nivel de riesgo, las señales detectadas y pasos sugeridos.
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
                      <p className="level-tone">{LEVEL_META[result.level].tone}</p>
                      <p className="level-hint">{LEVEL_META[result.level].hint}</p>
                    </div>

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
                      <a className="btn btn-primary btn-small" href="#ayuda">
                        Ver cómo pedir ayuda
                      </a>
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
            <p>
              Señal Segura es una app web instalable (PWA): queda en tu pantalla de inicio y puede
              funcionar sin abrir el navegador como una página común.
            </p>
          </div>

          <ol className="install-steps">
            <li>
              <strong>Android (Chrome):</strong> menú ⋮ → “Instalar app” o “Agregar a la pantalla
              de inicio”.
            </li>
            <li>
              <strong>iPhone (Safari):</strong> botón Compartir → “Añadir a pantalla de inicio”.
            </li>
            <li>
              <strong>Usarla con chats:</strong> copiá mensajes, subí una captura, o en Android
              usá “Compartir” hacia Señal Segura cuando esté instalada.
            </li>
          </ol>

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
              Si hay indicios, no lo guardes. En San Juan y en Argentina hay canales para denunciar
              y orientarte.
            </p>
          </div>

          <ul className="help-list">
            {HELP_RESOURCES.map((resource) => (
              <li key={resource.name}>
                <h3>{resource.name}</h3>
                <p>{resource.detail}</p>
                {resource.action && (
                  <a className="btn btn-ghost btn-small" href={resource.action}>
                    Llamar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="footer">
        <p>
          <strong>Señal Segura</strong> es una herramienta de orientación preventiva. No diagnostica
          delitos ni sustituye el acompañamiento profesional o judicial.
        </p>
        <p className="footer-note">
          El análisis y la lectura de capturas corren en tu dispositivo. No monitorea otras apps en
          segundo plano.
        </p>
      </footer>
    </div>
  )
}
