import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function unauthorized(): Response {
  return json({ error: 'unauthorized' }, 401)
}

function parseAllowedNames(): Set<string> {
  const raw = Deno.env.get('SERVER_SECRET_ALLOWED_NAMES') ?? ''
  return new Set(
    raw
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
  )
}

serve((req) => {
  const sharedToken = Deno.env.get('SUPABASE_SECRET_FETCH_TOKEN')
  const auth = req.headers.get('authorization')
  if (!sharedToken || auth !== `Bearer ${sharedToken}`) return unauthorized()

  const url = new URL(req.url)
  const name = url.searchParams.get('name')?.trim()
  if (!name) return json({ error: 'name is required' }, 400)

  const allowed = parseAllowedNames()
  if (!allowed.has(name)) return json({ error: 'forbidden' }, 403)

  const value = Deno.env.get(name)
  if (!value) return json({ error: 'not found' }, 404)

  return json({ value })
})
