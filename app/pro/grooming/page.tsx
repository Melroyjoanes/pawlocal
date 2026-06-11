import { redirect } from 'next/navigation'

// Grooming is now accessible via the tab on /pro/reports
export default function GroomingRedirectPage() {
  redirect('/pro/reports')
}
