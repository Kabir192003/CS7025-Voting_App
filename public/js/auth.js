import { api } from './api.js'
import { h, $, icon, showFieldErrors } from './ui.js'

const app = $('#app')
const isRegister = location.pathname.endsWith('register.html')

// Only follow same-site relative paths after sign-in (no open redirects).
const rawNext = new URLSearchParams(location.search).get('next') || ''
const next = /^\/[A-Za-z0-9_\-./?=&%#]*$/.test(rawNext) && !rawNext.startsWith('//') ? rawNext : 'home.html'

function demoSplit() {
  const bar = h('div', { class: 'split', role: 'img', 'aria-label': '52 percent this, 48 percent that' },
    h('div', { class: 'seg seg-a', style: { 'flex-grow': '52' }, text: '52%' }), h('div', { class: 'seg seg-b', style: { 'flex-grow': '48' }, text: '48%' }))
  bar.firstChild.style.setProperty('background', '#8FA9CF'); bar.firstChild.style.setProperty('color', '#0E0F1F')
  return h('div', { class: 'auth-demo' }, bar, h('span', { class: 'verdict verdict-close', style: { background: '#fff', color: '#14152B', 'align-self': 'flex-start' }, text: 'Too close to call · n = 1,204' }))
}

app.append(
  h('section', { class: 'auth-left' },
    h('a', { class: 'brand', href: 'login.html' }, h('span', { class: 'this', text: 'THIS' }), h('span', { class: 'slash', text: '/' }), h('span', { class: 'that', text: 'THAT' })),
    h('div', { class: 'stack gap-4' },
      h('h1', { class: 'display', text: isRegister ? 'Two options. One crowd.' : 'Can’t decide?' }),
      h('p', { text: 'Put a two-sided decision to the community, vote on other people’s, and see where the crowd lands. Results stay hidden until you vote, so every vote is honest.' })),
    demoSplit()),
  h('section', { class: 'auth-right' }, isRegister ? registerCard() : loginCard()))

function loginCard() {
  const err = h('div', { class: 'form-error', role: 'alert', hidden: true })
  const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit', text: 'Sign in' })
  const form = h('form', { class: 'stack gap-4', novalidate: true, on: { submit: async (e) => {
    e.preventDefault(); err.hidden = true; btn.disabled = true
    const d = Object.fromEntries(new FormData(form))
    try { await api.post('/auth/login', { username: d.username.trim(), password: d.password }); location.href = next } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false }
  } } },
    h('div', { class: 'field' }, h('label', { for: 'username', text: 'Username' }), h('input', { class: 'input', id: 'username', name: 'username', autocomplete: 'username', required: true, autofocus: true, maxlength: 64 })),
    h('div', { class: 'field' }, h('label', { for: 'password', text: 'Password' }), h('input', { class: 'input', id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: true, maxlength: 200 })),
    err, btn)
  return h('div', { class: 'auth-card' }, h('div', { class: 'stack gap-2' }, h('h2', { text: 'Welcome back' }), h('p', { class: 'muted', text: 'Sign in to join today’s decisions.' })), form,
    h('p', { class: 'muted', style: { 'font-size': '14px' } }, 'New here? ', h('a', { href: 'register.html', text: 'Create an account' })))
}

function registerCard() {
  const err = h('div', { class: 'form-error', role: 'alert', hidden: true })
  const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit', text: 'Create account' })
  const strength = h('p', { class: 'hint', 'aria-live': 'polite', text: 'At least 8 characters. A short sentence works well.' })
  const field = (id, label, extra = {}, hint) => h('div', { class: 'field' }, h('label', { for: id, text: label }),
    h('input', { class: 'input', id, name: id, ...extra }), hint, h('div', { class: 'err', 'data-err': id }))
  const form = h('form', { class: 'stack gap-4', novalidate: true, on: { submit: async (e) => {
    e.preventDefault(); err.hidden = true
    const d = Object.fromEntries(new FormData(form))
    if (d.password !== d.confirm) { showFieldErrors(form, { fields: { confirm: 'Passwords don’t match' } }); return }
    showFieldErrors(form, {})
    btn.disabled = true
    try {
      await api.post('/auth/signup', { username: d.username.trim(), password: d.password, ...(d.email.trim() ? { email: d.email.trim() } : {}) })
      location.href = 'onboarding.html'
    } catch (ex) {
      if (!showFieldErrors(form, ex)) { err.textContent = ex.message; err.hidden = false }
      else if (ex.code === 'username_taken') form.querySelector('[data-err="username"]').textContent = ex.message
      btn.disabled = false
    }
  } } },
    field('username', 'Username', { autocomplete: 'username', required: true, autofocus: true, maxlength: 24, pattern: '[A-Za-z0-9_.]+' }, h('p', { class: 'hint', text: '3–24 characters: letters, numbers, dots and underscores.' })),
    field('email', 'Email (optional)', { type: 'email', autocomplete: 'email', maxlength: 254 }),
    field('password', 'Password', { type: 'password', autocomplete: 'new-password', required: true, maxlength: 72 }, strength),
    field('confirm', 'Confirm password', { type: 'password', autocomplete: 'new-password', required: true, maxlength: 72 }),
    err, btn)
  form.querySelector('#password').addEventListener('input', (e) => {
    const v = e.target.value
    strength.textContent = !v ? 'At least 8 characters. A short sentence works well.' : v.length < 8 ? `${8 - v.length} more character${8 - v.length === 1 ? '' : 's'} to go` : v.length < 12 ? 'Good. Longer is stronger.' : 'Strong'
  })
  return h('div', { class: 'auth-card' }, h('div', { class: 'stack gap-2' }, h('h2', { text: 'Join the crowd' }), h('p', { class: 'muted', text: 'It takes a minute. Then pick your topics and start voting.' })), form,
    h('p', { class: 'muted', style: { 'font-size': '14px' } }, 'Already have an account? ', h('a', { href: 'login.html', text: 'Sign in' })))
}
void icon
