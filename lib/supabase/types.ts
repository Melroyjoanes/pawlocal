export type CategorySlug = 'dog-walking' | 'grooming' | 'vet' | 'pet-store' | 'insurance'

export interface Category {
  id: string
  name: string
  slug: CategorySlug
  icon: string
  color: string
  tagline: string | null
}

export interface Provider {
  id: string
  name: string
  business_name: string | null
  category_slug: CategorySlug
  whatsapp: string
  phone: string | null
  lat: number
  lng: number
  address: string
  price_min: number | null
  price_max: number | null
  price_unit: string
  hours_from: string
  hours_to: string
  working_days: string[]
  bio: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface ProviderPhoto {
  id: string
  provider_id: string
  url: string
  is_primary: boolean
  sort_order: number
}

export interface ProviderWithPhotos extends Provider {
  provider_photos: ProviderPhoto[]
}

export type Database = {
  public: {
    Tables: {
      categories: { Row: Category; Insert: Omit<Category, 'id'>; Update: Partial<Category> }
      providers: { Row: Provider; Insert: Omit<Provider, 'id' | 'created_at' | 'status'>; Update: Partial<Provider> }
      provider_photos: { Row: ProviderPhoto; Insert: Omit<ProviderPhoto, 'id'>; Update: Partial<ProviderPhoto> }
    }
  }
}
