// Google Maps loader utility
let isLoaded = false
let isLoading = false
const callbacks: (() => void)[] = []

export function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key not set'))
      return
    }

    if (isLoaded) {
      resolve()
      return
    }

    callbacks.push(resolve)

    if (isLoading) return

    isLoading = true

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=__googleMapsCallback`
    script.async = true
    script.defer = true

    ;(window as Window & { __googleMapsCallback?: () => void }).__googleMapsCallback = () => {
      isLoaded = true
      isLoading = false
      callbacks.forEach((cb) => cb())
      callbacks.length = 0
    }

    document.head.appendChild(script)
  })
}

export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && typeof google !== 'undefined' && !!google.maps
}
