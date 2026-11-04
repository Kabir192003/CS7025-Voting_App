/** Thin fetch wrapper. The session lives in an httpOnly cookie; JS never sees a token. */
export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status; this.code = code; this.fields = fields || {}
  }
}

async function request(method, path, body) {
  let res
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'tot', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new ApiError(0, 'network', 'Can’t reach the server. Check your connection and try again.')
  }
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) {
    const err = data?.error || {}
    if (res.status === 401 && !path.startsWith('/auth/')) {
      const next = encodeURIComponent(location.pathname + location.search)
      location.href = `login.html?next=${next}`
      return new Promise(() => {}) // navigation in flight
    }
    throw new ApiError(res.status, err.code || 'error', err.message || 'Something went wrong. Try again.', err.fields)
  }
  return data
}

const qs = (params) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') s.set(k, v)
  const out = s.toString()
  return out ? '?' + out : ''
}

export const api = {
  get: (path, params) => request('GET', path + qs(params)),
  post: (path, body = {}) => request('POST', path, body),
  put: (path, body = {}) => request('PUT', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  del: (path) => request('DELETE', path)
}
