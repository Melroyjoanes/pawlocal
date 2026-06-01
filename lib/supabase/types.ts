export type CategorySlug = 'dog-walking' | 'grooming' | 'vet' | 'pet-store' | 'insurance'

export type Category = {
  id: string
  name: string
  slug: CategorySlug
  icon: string
  color: string
  tagline: string | null
}

export type Provider = {
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
  is_verified: boolean
  source: string
  google_place_id: string | null
  category_slugs: string[]
  created_at: string
}

export type ProviderPhoto = {
  id: string
  provider_id: string
  url: string
  is_primary: boolean
  sort_order: number
}

export type ProviderWithPhotos = Provider & {
  provider_photos: ProviderPhoto[]
}

export type ProviderInsert = {
  name: string
  business_name?: string | null
  category_slug: CategorySlug
  category_slugs?: string[]
  whatsapp: string
  phone?: string | null
  lat: number
  lng: number
  address: string
  price_min?: number | null
  price_max?: number | null
  price_unit?: string
  hours_from?: string
  hours_to?: string
  working_days?: string[]
  bio?: string | null
}

export type ProviderPhotoInsert = {
  provider_id: string
  url: string
  is_primary: boolean
  sort_order: number
}

type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  public: {
    Tables: {
      categories: { Row: Category; Insert: Omit<Category, 'id'>; Update: Partial<Category>; Relationships: GenericRelationship[] }
      providers: { Row: Provider; Insert: ProviderInsert; Update: Partial<Provider>; Relationships: GenericRelationship[] }
      provider_photos: { Row: ProviderPhoto; Insert: ProviderPhotoInsert; Update: Partial<ProviderPhoto>; Relationships: GenericRelationship[] }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: GenericRelationship[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}
