import { useState } from 'react'

function useToast() {
  const [toasts, setToasts] = useState([])

  function toast(msg, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  return { toasts, toast }
}

export { useToast }
