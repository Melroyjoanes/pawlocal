'use client'

import { useEffect, useState } from 'react'
import AuthModal from '@/components/AuthModal'

interface Props {
  authRequired?: string
  next?: string
}

export default function AuthRequired({ authRequired, next }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (authRequired === '1') {
      setOpen(true)
    }
  }, [authRequired])

  if (!authRequired) return null

  return (
    <AuthModal
      open={open}
      onClose={() => setOpen(false)}
      redirectTo={next}
      message={next ? `Sign in to continue` : undefined}
    />
  )
}
