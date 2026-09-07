import { useEffect, useState } from 'react'

// iOS Safari pans the layout viewport when a fixed-position input is focused,
// which visually shifts the whole app even though nothing is meant to scroll.
// Tracking window.visualViewport directly (instead of trusting `dvh`, which
// lags behind the keyboard animation) lets us pin height/offset to what's
// actually visible.
export function useVisualViewportHeight() {
  const [state, set_state] = useState(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offset_top: 0,
  }))

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      set_state({ height: vv.height, offset_top: vv.offsetTop })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return state
}
