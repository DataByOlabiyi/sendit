// Google Maps loader utility
let isLoaded = false
let isLoading = false
let authFailed = false
const successCallbacks: (() => void)[] = []
const errorCallbacks: ((e: Error) => void)[] = []

type MapsWindow = Window & {
  __googleMapsCallback?: () => void
  gm_authFailure?: () => void
}

export function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key not configured'))
      return
    }

    if (authFailed) {
      reject(new Error('Google Maps authentication failed'))
      return
    }

    if (isLoaded) {
      resolve()
      return
    }

    successCallbacks.push(resolve)
    errorCallbacks.push(reject)

    if (isLoading) return

    isLoading = true

    ;(window as MapsWindow).gm_authFailure = () => {
      authFailed = true
      isLoaded = false
      isLoading = false
      const err = new Error('Google Maps authentication failed — check API key and domain restrictions')
      errorCallbacks.forEach((cb) => cb(err))
      successCallbacks.length = 0
      errorCallbacks.length = 0
    }

    ;(window as MapsWindow).__googleMapsCallback = () => {
      isLoaded = true
      isLoading = false
      successCallbacks.forEach((cb) => cb())
      successCallbacks.length = 0
      errorCallbacks.length = 0
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=__googleMapsCallback`
    script.async = true
    script.defer = true
    script.onerror = () => {
      isLoading = false
      const err = new Error('Failed to load Google Maps script')
      errorCallbacks.forEach((cb) => cb(err))
      successCallbacks.length = 0
      errorCallbacks.length = 0
    }

    document.head.appendChild(script)
  })
}

export function isGoogleMapsLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as Window & { google?: { maps?: unknown } }).google?.maps
  )
}

export function hasGoogleMapsAuthError(): boolean {
  return authFailed
}
