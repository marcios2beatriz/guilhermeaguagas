import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const mostrar = useCallback((mensagem, tipo = 'sucesso') => {
    setToast({ mensagem, tipo })
  }, [])

  const fechar = useCallback(() => setToast(null), [])

  return { toast, mostrar, fechar }
}
