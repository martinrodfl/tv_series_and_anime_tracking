import { useState } from 'react'

export interface Notice {
  severity: 'success' | 'error'
  text: string
}

/** Aviso breve para el usuario y un ayudante para ejecutar acciones informando de su éxito o fallo. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null)

  /** Ejecuta la acción; si falla muestra `failure` y, si va bien y se indica, muestra `success`. */
  const run = async (action: () => Promise<unknown>, success: string | null, failure: string) => {
    try {
      await action()
      if (success) setNotice({ severity: 'success', text: success })
    } catch {
      setNotice({ severity: 'error', text: failure })
    }
  }

  return { notice, setNotice, clearNotice: () => setNotice(null), run }
}
