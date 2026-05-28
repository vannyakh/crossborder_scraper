import { useEffect, useRef } from 'react'
import { useLocation, useNavigation } from 'react-router-dom'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 100,
  minimum: 0.1,
  speed: 250,
  easing: 'ease',
})

export function RouteProgress() {
  const navigation = useNavigation()
  const location = useLocation()
  const locationKeyRef = useRef(`${location.pathname}${location.search}`)

  useEffect(() => {
    const pending = navigation.state === 'loading' || navigation.state === 'submitting'

    if (pending) {
      NProgress.start()
      return
    }

    NProgress.done()
  }, [navigation.state])

  useEffect(() => {
    const key = `${location.pathname}${location.search}`
    if (key === locationKeyRef.current) return
    locationKeyRef.current = key

    NProgress.start()
    const timer = window.setTimeout(() => NProgress.done(), 220)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search])

  return null
}
