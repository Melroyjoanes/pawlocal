import type { CategorySlug } from './supabase/types'

export interface CategoryConfig {
  slug: CategorySlug
  name: string
  icon: string
  color: string
  bgColor: string
  tagline: string
  description: string
}

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'dog-walking',
    name: 'Dog Walking',
    icon: '🦮',
    color: '#4F46E5',
    bgColor: 'bg-indigo-50',
    tagline: 'Trusted walkers near Juhu',
    description: 'Professional dog walkers in your neighbourhood',
  },
  {
    slug: 'grooming',
    name: 'Grooming',
    icon: '✂️',
    color: '#7C3AED',
    bgColor: 'bg-violet-50',
    tagline: 'Grooming salons near you',
    description: 'Bath, trim, and style for your pet',
  },
  {
    slug: 'vet',
    name: 'Vet / Doctor',
    icon: '🏥',
    color: '#DC2626',
    bgColor: 'bg-red-50',
    tagline: 'Clinics & vets nearby',
    description: 'Trusted veterinarians and pet clinics',
  },
  {
    slug: 'pet-store',
    name: 'Pet Store',
    icon: '🐾',
    color: '#059669',
    bgColor: 'bg-emerald-50',
    tagline: 'Stores near Juhu',
    description: 'Food, accessories, and everything your pet needs',
  },
  {
    slug: 'insurance',
    name: 'Insurance',
    icon: '🛡️',
    color: '#D97706',
    bgColor: 'bg-amber-50',
    tagline: 'Compare pet insurance plans',
    description: 'Protect your pet with the right insurance plan',
  },
]

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

// Juhu, Mumbai centre coordinates
export const JUHU_CENTER = { lat: 19.1075, lng: 72.8263 }
export const DEFAULT_ZOOM = 14
