# PawLocal — Pet Services Directory for Juhu, Mumbai

Hyperlocal directory for dog walkers, groomers, vets, pet stores, and insurance providers.

## Setup

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up Supabase
1. Create a project at https://supabase.com
2. Run `supabase/migrations/001_initial.sql` in the SQL editor
3. Run `supabase/migrations/002_admin_rls.sql` in the SQL editor
4. Create an admin user: Authentication → Users → Add user

### 3. Set up Google Maps
1. Create a project at https://console.cloud.google.com
2. Enable Maps JavaScript API
3. Create an API key (restrict to your domain)
4. Create a Map ID in Maps → Map Management

### 4. Configure environment variables
```bash
cp .env.example .env.local
# Fill in all 4 values
```

### 5. Run locally
```bash
pnpm dev
```

### 6. Deploy
1. Push to GitHub
2. Import to Vercel
3. Add all 4 env vars in Vercel dashboard

## Adding providers
Run the SQL in `supabase/seed-example.sql` for each of your contacts.

## Stack
Next.js 15 · TypeScript · Tailwind · shadcn/ui · Supabase · Google Maps
