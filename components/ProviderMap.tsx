'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import type { Provider } from '@/lib/supabase/types'
import type { CategoryConfig } from '@/lib/categories'
import { JUHU_CENTER, DEFAULT_ZOOM } from '@/lib/categories'

interface Props {
  providers: Provider[]
  category: CategoryConfig
  onSelectProvider: (id: string) => void
  selectedId: string | null
}

export default function ProviderMap({ providers, category, onSelectProvider, selectedId }: Props) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <Map
        defaultCenter={JUHU_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId="pawlocal-map"
        className="w-full h-full rounded-xl"
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {providers.map((provider) => (
          <AdvancedMarker
            key={provider.id}
            position={{ lat: provider.lat, lng: provider.lng }}
            onClick={() => onSelectProvider(provider.id)}
            title={provider.name}
          >
            <Pin
              background={selectedId === provider.id ? '#000000' : category.color}
              borderColor={selectedId === provider.id ? '#000000' : category.color}
              glyphColor="#ffffff"
              scale={selectedId === provider.id ? 1.4 : 1}
            />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}
