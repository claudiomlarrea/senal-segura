import { APPS_SCRIPT_URL, INSTALL_COUNTED_KEY, INSTALL_SITE } from './stats-config'

export interface InstallCountResult {
  ok: boolean
  instalaciones?: number
  error?: string
}

function buildUrl(action: 'install' | 'installcount'): string {
  const base = APPS_SCRIPT_URL.trim()
  const join = base.includes('?') ? '&' : '?'
  return (
    base +
    join +
    'action=' +
    encodeURIComponent(action) +
    '&site=' +
    encodeURIComponent(INSTALL_SITE) +
    '&_=' +
    Date.now()
  )
}

function fetchJson(url: string): Promise<InstallCountResult> {
  return fetch(url, { method: 'GET' }).then(async (r) => {
    if (!r.ok) throw new Error('network')
    return (await r.json()) as InstallCountResult
  })
}

function fetchJsonp(url: string): Promise<InstallCountResult> {
  return new Promise((resolve, reject) => {
    const name = `_ssInstallCb_${Math.floor(Math.random() * 1e9)}`
    let done = false
    const join = url.includes('?') ? '&' : '?'
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[name]
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    ;(window as unknown as Record<string, (data: InstallCountResult) => void>)[name] = (
      data,
    ) => {
      if (done) return
      done = true
      cleanup()
      resolve(data)
    }

    script.async = true
    script.src = url + join + 'callback=' + encodeURIComponent(name)
    script.onerror = () => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('jsonp'))
    }
    document.body.appendChild(script)
    window.setTimeout(() => {
      if (done) return
      script.onerror?.(new Event('error'))
    }, 20000)
  })
}

async function requestInstallApi(action: 'install' | 'installcount'): Promise<InstallCountResult> {
  const url = buildUrl(action)
  try {
    return await fetchJson(url)
  } catch {
    return fetchJsonp(url)
  }
}

export async function fetchInstallCount(): Promise<number | null> {
  try {
    const data = await requestInstallApi('installcount')
    if (data && data.ok && typeof data.instalaciones === 'number') {
      return data.instalaciones
    }
  } catch {
    /* silencioso: el contador es informativo */
  }
  return null
}

/** Registra +1 una sola vez por dispositivo (localStorage). */
export async function registerInstallOnce(): Promise<number | null> {
  try {
    if (localStorage.getItem(INSTALL_COUNTED_KEY) === '1') {
      return fetchInstallCount()
    }
  } catch {
    /* private mode */
  }

  try {
    const data = await requestInstallApi('install')
    if (data && data.ok && typeof data.instalaciones === 'number') {
      try {
        localStorage.setItem(INSTALL_COUNTED_KEY, '1')
      } catch {
        /* ignore */
      }
      return data.instalaciones
    }
  } catch {
    /* ignore */
  }
  return null
}

export function formatInstallCount(n: number): string {
  try {
    return n.toLocaleString('es-AR')
  } catch {
    return String(n)
  }
}
