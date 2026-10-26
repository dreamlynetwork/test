// Standalone JioSaavn client: works in Node 18+, Vercel, Cloudflare Workers.
// https://www.jiosaavn.com/api.php does nothing on its own: every request
// MUST include `__call` (which function to run), plus _format, api_version, ctx.

const BASE = 'https://www.jiosaavn.com/api.php'

type Params = Record<string, string | number | undefined>

async function call<T = any>(
  __call: string,
  params: Params = {},
  ctx: 'web6dot0' | 'android' = 'web6dot0'
): Promise<T> {
  const url = new URL(BASE)
  url.searchParams.set('__call', __call)
  url.searchParams.set('_format', 'json')
  url.searchParams.set('_marker', '0')
  url.searchParams.set('api_version', '4')
  url.searchParams.set('ctx', ctx)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
    }
  })
  if (!res.ok) throw new Error(`JioSaavn returned HTTP ${res.status}`)

  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('JioSaavn returned a non-JSON response (possibly blocked by region/IP)')
  }
}

/* ------------------------------- endpoints ------------------------------- */

export const searchSongs = (q: string, page = 0, limit = 10) =>
  call('search.getResults', { q, p: page, n: limit })

export const searchAlbums = (q: string, page = 0, limit = 10) =>
  call('search.getAlbumResults', { q, p: page, n: limit })

export const searchArtists = (q: string, page = 0, limit = 10) =>
  call('search.getArtistResults', { q, p: page, n: limit })

export const searchPlaylists = (q: string, page = 0, limit = 10) =>
  call('search.getPlaylistResults', { q, p: page, n: limit })

export const autocomplete = (query: string) => call('autocomplete.get', { query })

export const songById = (ids: string) => call('song.getDetails', { pids: ids })

export const albumById = (albumid: string) => call('content.getAlbumDetails', { albumid })

export const playlistById = (listid: string, page = 0, limit = 50) =>
  call('playlist.getDetails', { listid, p: page, n: limit })

export const artistById = (artistId: string) =>
  call('artist.getArtistPageDetails', { artistId, n_song: 10, n_album: 10, page: 0 })

export const lyrics = (lyrics_id: string) => call('lyrics.getLyrics', { lyrics_id })

export const recommended = (pid: string) => call('reco.getreco', { pid })

export const trending = (type = 'song', language = 'hindi') =>
  call('content.getTrending', { entity_type: type, entity_language: language })

// Radio / suggestions (needs ctx=android)
export async function suggestions(songId: string, k = 10) {
  const station = await call<{ stationid?: string }>(
    'webradio.createEntityStation',
    { entity_id: JSON.stringify([encodeURIComponent(songId)]), entity_type: 'queue' },
    'android'
  )
  if (!station?.stationid) throw new Error('could not create station')
  return call('webradio.getSong', { stationid: station.stationid, k }, 'android')
}

/* --------------------------------- demo ---------------------------------- */
// Run: npx tsx jiosaavn-client.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  searchSongs('arijit', 0, 2)
    .then((r) => console.log(JSON.stringify(r, null, 2).slice(0, 1500)))
    .catch((e) => console.error('FAILED:', e.message))
}
