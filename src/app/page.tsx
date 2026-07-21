import { fetchHomeData } from '@/lib/home-data'
import type { HomeData } from '@/lib/home-data'
import AppClient from '@/components/app-client'

// ISR: the server-rendered HTML (with all home data baked in) is cached and
// reused for 60s, then regenerated on the next request. Every visitor gets an
// instant first paint while content stays fresh.
export const revalidate = 60

export default async function Page() {
  // Fetch home data on the SERVER and inject it into the initial HTML.
  // This means the browser receives a fully-rendered page with all products,
  // hero slides, promos etc. — no waiting for JS + API round-trip.
  let initialHomeData: HomeData | null = null
  try {
    initialHomeData = await fetchHomeData()
  } catch (e) {
    // If the DB is cold/unavailable, the client will fall back to its own fetch
    console.error('[SSR] home data fetch failed:', e)
  }

  return <AppClient initialHomeData={initialHomeData} />
}
