import { registerSW } from 'virtual:pwa-register'

/** Registra el service worker (solo existe en el build de producción) y lo actualiza solo cuando hay versión nueva. */
export function registerServiceWorker() {
  registerSW({ immediate: true })
}
