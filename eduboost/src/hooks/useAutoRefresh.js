import { useEffect } from 'react'

export function useAutoRefresh(callback, dependencies = []) {
  useEffect(() => {
    if (typeof callback !== 'function') {
      return undefined
    }

    function refresh() {
      void callback()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    window.addEventListener('focus', refresh)

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener('focus', refresh)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, dependencies)
}