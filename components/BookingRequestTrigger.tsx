'use client'

import { useState } from 'react'
import BookingRequestSheet from './BookingRequestSheet'

interface Props {
  providerId: string
  providerName: string
  providerWhatsapp: string
  categorySlug: string
}

export default function BookingRequestTrigger({ providerId, providerName, providerWhatsapp, categorySlug }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 rounded-2xl font-semibold transition-colors min-h-[52px]"
      >
        📋 Send Request
      </button>
      <BookingRequestSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        providerId={providerId}
        providerName={providerName}
        providerWhatsapp={providerWhatsapp}
        categorySlug={categorySlug}
      />
    </>
  )
}
