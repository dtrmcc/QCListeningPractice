const AUTH_KEY = 'qc_toefl_auth'

const CREDENTIALS = {
  username: 'qinghua',
  password: 'chen0653',
}

export function login(username, password) {
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    const session = { authenticated: true, user: username, ts: Date.now() }
    localStorage.setItem(AUTH_KEY, JSON.stringify(session))
    return true
  }
  return false
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

export function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session.authenticated) return null
    return session
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return getSession() !== null
}
