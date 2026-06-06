export type CategorySlug = 'dog-walking' | 'grooming' | 'vet' | 'pet-store' | 'insurance' | 'dog-training'

export type Category = {
  id: string
  name: string
  slug: CategorySlug
  icon: string
  color: string
  tagline: string | null
}

export type TrainerMetadata = {
  training_methods?: string[]
  specialisations?: string[]
  session_format?: string
  certifications?: string
  breeds?: string
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
  email: string | null
  status: 'pending' | 'approved' | 'rejected'
  is_verified: boolean
  source: string
  google_place_id: string | null
  category_slugs: string[]
  metadata: TrainerMetadata | null
  is_emergency: boolean
  neighbourhood: string
  created_at: string
  is_available?: boolean
  availability_note?: string | null
  verification_tier?: string
}

export type Broadcast = {
  id: string
  service_slug: string
  pet_description: string
  area: string
  date_needed: string
  budget: string | null
  poster_name: string
  poster_whatsapp: string
  notes: string | null
  status: 'active' | 'filled' | 'expired'
  created_at: string
  expires_at: string
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
  email?: string | null
  metadata?: TrainerMetadata | null
  is_emergency?: boolean
}

export type Review = {
  id: string
  provider_id: string
  rating: number
  comment: string | null
  reviewer_name: string
  reviewer_phone: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export type ReviewInsert = {
  provider_id: string
  rating: number
  comment?: string | null
  reviewer_name: string
  reviewer_phone?: string | null
}

export type ProviderPhotoInsert = {
  provider_id: string
  url: string
  is_primary: boolean
  sort_order: number
}

export type WalkEvent = {
  type: 'pee' | 'poop'
  ts: string
  lat?: number
  lng?: number
}

export type WalkSession = {
  id: string
  provider_id: string
  share_token: string
  pet_name: string | null
  customer_name: string | null
  status: 'active' | 'completed'
  current_lat: number | null
  current_lng: number | null
  last_location_at: string | null
  walk_events: WalkEvent[]
  distance_km: number | null
  step_count: number | null
  started_at: string
  ended_at: string | null
  created_at: string
}

export type ProviderBooking = {
  id: string
  provider_id: string
  date: string            // YYYY-MM-DD
  service: string
  owner_name: string
  pet_name: string
  duration_min: number
  amount_inr: number
  notes: string | null
  created_at: string
}

export type ProviderBookingInsert = {
  provider_id: string
  date: string
  service: string
  owner_name?: string
  pet_name?: string
  duration_min?: number
  amount_inr?: number
  notes?: string | null
}

type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type ProviderContact = {
  id: string
  provider_id: string
  customer_id: string | null
  session_token: string
  responded: boolean | null
  booked: boolean | null
  prompt_sent_at: string | null
  created_at: string
}

export type ProviderContactInsert = {
  provider_id: string
  customer_id?: string | null
  session_token: string
  responded?: boolean | null
  booked?: boolean | null
  prompt_sent_at?: string | null
}

export type Database = {
  public: {
    Tables: {
      categories: { Row: Category; Insert: Omit<Category, 'id'>; Update: Partial<Category>; Relationships: GenericRelationship[] }
      providers: { Row: Provider; Insert: ProviderInsert; Update: Partial<Provider>; Relationships: GenericRelationship[] }
      provider_photos: { Row: ProviderPhoto; Insert: ProviderPhotoInsert; Update: Partial<ProviderPhoto>; Relationships: GenericRelationship[] }
      broadcasts: { Row: Broadcast; Insert: Omit<Broadcast, 'id' | 'status' | 'created_at' | 'expires_at'>; Update: Partial<Broadcast>; Relationships: GenericRelationship[] }
      reviews: { Row: Review; Insert: ReviewInsert & { status?: string }; Update: Partial<Review>; Relationships: GenericRelationship[] }
      provider_contacts: { Row: ProviderContact; Insert: ProviderContactInsert; Update: Partial<ProviderContact>; Relationships: GenericRelationship[] }
      walk_sessions: { Row: WalkSession; Insert: Omit<WalkSession, 'id' | 'status' | 'current_lat' | 'current_lng' | 'last_location_at' | 'walk_events' | 'ended_at' | 'created_at'>; Update: Partial<WalkSession>; Relationships: GenericRelationship[] }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: GenericRelationship[] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}
