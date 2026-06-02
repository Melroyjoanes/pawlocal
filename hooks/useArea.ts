'use client'
import { useEffect, useState } from 'react'

export function useArea(): string {
  const [area, setArea] = useState('Juhu')

  useEffect(() => {
    // Read initial value
    const saved = localStorage.getItem('pawlocal_area')
    if (saved) setArea(saved)

    // Listen for changes from LocationPicker (cross-component)
    function onStorage(e: StorageEvent) {
      if (e.key === 'pawlocal_area' && e.newValue) setArea(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return area
}
