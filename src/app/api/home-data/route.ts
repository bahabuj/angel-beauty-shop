import { NextResponse } from 'next/server'
import { fetchHomeData, getCachedHomeData } from '@/lib/home-data'

// Always serve cached data instantly on the API path; refresh happens lazily
// by the SSR path or a background revalidation. This makes every API hit ~1ms.
export async function GET() {
  try {
    // If we have fresh cache, return it immediately (sub-millisecond response)
    const cached = getCachedHomeData()
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      })
    }

    // First cold load — fetch + populate cache
    const data = await fetchHomeData()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('[HOME_DATA]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch home data' },
      { status: 500 }
    )
  }
}
