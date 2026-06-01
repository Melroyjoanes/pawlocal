'use client'

import { useState, useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

interface Props {
  value: string
  onChange: (address: string) => void
  onPlaceSelect: (coords: { lat: number; lng: number }) => void
  required?: boolean
}

// Mumbai bounding box — biases autocomplete results toward Mumbai
const MUMBAI_BOUNDS = {
  north: 19.35,
  south: 18.85,
  east: 73.10,
  west: 72.70,
}

export default function AddressAutocomplete({ value, onChange, onPlaceSelect, required }: Props) {
  const placesLib = useMapsLibrary('places')
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (placesLib) {
      serviceRef.current = new placesLib.AutocompleteService()
    }
  }, [placesLib])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleInput(text: string) {
    onChange(text)
    if (!serviceRef.current || text.length < 2) {
      setPredictions([])
      setIsOpen(false)
      return
    }
    try {
      const result = await serviceRef.current.getPlacePredictions({
        input: text,
        componentRestrictions: { country: 'in' },
        bounds: MUMBAI_BOUNDS,
      })
      const preds = result?.predictions ?? []
      setPredictions(preds)
      setIsOpen(preds.length > 0)
    } catch {
      setPredictions([])
      setIsOpen(false)
    }
  }

  function handleSelect(prediction: google.maps.places.AutocompletePrediction) {
    // Fill the input immediately — don't wait for geocoding
    onChange(prediction.description)
    setPredictions([])
    setIsOpen(false)

    if (!placesLib) return

    // Fetch lat/lng via PlacesService.getDetails
    const dummy = document.createElement('div')
    const svc = new placesLib.PlacesService(dummy)
    svc.getDetails(
      { placeId: prediction.place_id, fields: ['geometry'] },
      (place, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          onPlaceSelect({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
        }
      }
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        required={required}
        autoComplete="off"
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => predictions.length > 0 && setIsOpen(true)}
        placeholder="Type your address, building name or locality..."
        className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pl-teal)] bg-white"
      />

      {isOpen && predictions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {predictions.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                // onMouseDown instead of onClick so input doesn't blur before the event fires
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(p)
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border last:border-0 flex flex-col gap-0.5"
              >
                <span className="font-medium text-foreground leading-snug">
                  {p.structured_formatting.main_text}
                </span>
                {p.structured_formatting.secondary_text && (
                  <span className="text-muted-foreground text-xs leading-snug">
                    {p.structured_formatting.secondary_text}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
