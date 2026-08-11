import { useEffect, useState } from 'react'
import { registerInstallOnce } from '../lib/installStats'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function useInstallPrompt(onInstallCounted?: (total: number) => void) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))

    setIsIos(ios)
    setStandalone(isStandalone)
    setInstalled(isStandalone)

    // iOS / ya instalada: contar la primera apertura en modo app
    if (isStandalone) {
      void registerInstallOnce().then((total) => {
        if (total != null) onInstallCounted?.(total)
      })
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
      void registerInstallOnce().then((total) => {
        if (total != null) onInstallCounted?.(total)
      })
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, [])

  async function install() {
    if (!deferred) return false
    await deferred.prompt()
    const choice = await deferred.userChoice
    setDeferred(null)
    if (choice.outcome === 'accepted') {
      const total = await registerInstallOnce()
      if (total != null) onInstallCounted?.(total)
      return true
    }
    return false
  }

  return {
    canInstall: Boolean(deferred) && !installed,
    showIosHint: isIos && !standalone && !installed,
    installed: installed || standalone,
    install,
  }
}
