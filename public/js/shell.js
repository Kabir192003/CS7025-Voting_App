/** Header, bottom nav, notifications, theme toggle and session handling shared by every signed-in page. */
import { api } from './api.js'
import { h, $, icon, clear, toast, timeAgo } from './ui.js'

const THEMES = ['auto', 'light', 'dark']
const readTheme = () => { try { return localStorage.getItem('tot-theme') || 'auto' } catch { return 'auto' } }
function applyTheme(t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', t)
  try { t === 'auto' ? localStorage.removeItem('tot-theme') : localStorage.setItem('tot-theme', t) } catch { /* ignore */ }
}

export const avatarEl = (user, extra = '') => {
  const initial = (user.display_name || user.username || '?').trim().charAt(0).toUpperCase()
  return h('span', { class: 'avatar ' + extra }, user.avatar ? h('img', { src: user.avatar, alt: '' }) : initial)
}

function popover(button, panel) {
  const wrap = h('div', { class: 'popover-wrap' }, button, panel)
  panel.hidden = true
  const close = () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false') }
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = panel.hidden
    document.dispatchEvent(new CustomEvent('tot:close-popovers'))
    panel.hidden = !open
    button.setAttribute('aria-expanded', String(open))
    if (open) panel.dispatchEvent(new CustomEvent('open'))
  })
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close() })
  document.addEventListener('tot:close-popovers', close)
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { close(); button.focus() } })
  return wrap
}

async function signOut(everywhere) {
  try { await api.post(everywhere ? '/auth/logout-all' : '/auth/logout') } catch { /* leave anyway */ }
  location.href = 'login.html'
}

function notificationsPanel(bellBadge) {
  const panel = h('div', { class: 'popover', role: 'region', 'aria-label': 'Notifications' })
  async function load() {
    clear(panel).append(h('h3', { text: 'Notifications' }), h('div', { class: 'empty', text: 'Loading…' }))
    try {
      const { items, unread } = await api.get('/notifications')
      clear(panel).append(h('h3', { text: 'Notifications' }))
      if (!items.length) panel.append(h('div', { class: 'empty', text: 'Nothing yet. When someone you voted with reports what they chose, it shows up here.' }))
      for (const n of items) {
        const verdictLine = !n.you_voted ? 'You saved this one.' : n.you_matched ? 'You picked the same.' : 'You picked the other side.'
        panel.append(h('a', { class: 'item' + (n.read ? '' : ' unread'), href: `poll.html?id=${n.poll_id}` },
          h('strong', { text: `The asker chose ${n.outcome_label}` }), h('div', { class: 'muted', text: n.title }),
          h('div', { class: 'mono muted', text: `${verdictLine} · ${timeAgo(n.created_at)}`, style: { 'font-size': '12px' } })))
      }
      if (unread) { await api.post('/notifications/read'); bellBadge.hidden = true }
    } catch (e) { clear(panel).append(h('h3', { text: 'Notifications' }), h('div', { class: 'empty', text: e.message })) }
  }
  panel.addEventListener('open', load)
  return panel
}

/**
 * @param {'feed'|'saved'|'ask'|'profile'|'poll'} active
 * @returns {Promise<{user, stats, pending_outcomes}>}
 */
export async function mountShell(active) {
  let me
  try { me = await api.get('/users/me') } catch (e) {
    // Never leave a blank page: say what happened and offer a retry.
    const app = $('#app')
    clear(app).append(h('div', { class: 'empty-state', role: 'alert', style: { 'margin-top': '48px' } },
      h('h3', { text: 'Can’t reach the server' }), h('p', { text: e.message }),
      h('p', { class: 'mono muted', style: { 'font-size': '12px' }, text: 'If you run this app: open /api/health. If it isn’t {"ok":true}, check the server logs and environment variables.' }),
      h('button', { class: 'btn btn-primary', type: 'button', text: 'Try again', on: { click: () => location.reload() } })))
    return new Promise(() => {}) // nothing else on this page can run without a session
  }
  const { user } = me

  // ---- header
  const params = new URLSearchParams(location.search)
  const search = h('form', { class: 'search', role: 'search', on: { submit: (e) => {
    e.preventDefault()
    const q = new FormData(e.target).get('q').trim()
    location.href = q ? `home.html?q=${encodeURIComponent(q)}` : 'home.html'
  } } },
    icon('search', 16), h('label', { class: 'sr-only', for: 'global-search', text: 'Search decisions' }),
    h('input', { id: 'global-search', name: 'q', type: 'search', placeholder: 'Search decisions, e.g. “Lisbon or Porto”', value: params.get('q') || '', maxlength: 80, autocomplete: 'off' }))

  let theme = readTheme()
  const themeBtn = h('button', { class: 'icon-btn', type: 'button' })
  const paintTheme = () => {
    clear(themeBtn).append(icon(theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'auto'))
    themeBtn.setAttribute('aria-label', `Theme: ${theme}. Switch theme`)
    themeBtn.title = `Theme: ${theme}`
  }
  themeBtn.addEventListener('click', () => { theme = THEMES[(THEMES.indexOf(theme) + 1) % 3]; applyTheme(theme); paintTheme() })
  paintTheme()

  const bellBadge = h('span', { class: 'badge-dot', hidden: true })
  const bell = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Notifications', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, icon('bell'), bellBadge)

  const avatarBtn = h('button', { class: 'avatar', type: 'button', 'aria-label': 'Your account', 'aria-haspopup': 'true', 'aria-expanded': 'false' })
  avatarBtn.append(...avatarEl(user).childNodes)
  const menu = h('div', { class: 'popover', style: { width: '240px' } },
    h('div', { class: 'item', style: { cursor: 'default' } }, h('strong', { text: user.display_name }), h('div', { class: 'mono muted', text: '@' + user.username, style: { 'font-size': '12px' } })),
    h('a', { class: 'item', href: 'profile.html', text: 'Your record' }),
    h('button', { class: 'item', type: 'button', text: 'Sign out', on: { click: () => signOut(false) } }),
    h('button', { class: 'item', type: 'button', text: 'Sign out everywhere', on: { click: () => signOut(true) } }))

  const link = (href, label, key) => h('a', { href, text: label, 'aria-current': active === key ? 'page' : null })
  $('#app-header').replaceWith(h('header', { class: 'app-header', id: 'app-header' },
    h('div', { class: 'app-header-inner' },
      h('a', { class: 'brand', href: 'home.html', 'aria-label': 'This or That, home' },
        h('span', { class: 'this', text: 'THIS' }), h('span', { class: 'slash', text: '/' }), h('span', { class: 'that', text: 'THAT' })),
      h('nav', { class: 'main-nav', 'aria-label': 'Primary' }, link('home.html', 'Feed', 'feed'), link('home.html?lens=saved', 'Saved', 'saved'), link('profile.html', 'Record', 'profile')),
      search,
      h('div', { class: 'header-actions' },
        h('a', { class: 'btn btn-primary btn-ask', href: 'ask.html' }, icon('plus', 16), 'Ask the crowd'),
        popover(bell, notificationsPanel(bellBadge)), themeBtn, popover(avatarBtn, menu)))))

  // ---- bottom nav (phones)
  const bn = $('#bottom-nav')
  if (bn) {
    bn.className = 'bottom-nav'
    bn.setAttribute('aria-label', 'Primary')
    bn.append(
      h('a', { href: 'home.html', 'aria-current': active === 'feed' ? 'page' : null }, icon('feed', 22), 'Decide'),
      h('a', { href: 'home.html?lens=saved', 'aria-current': active === 'saved' ? 'page' : null }, icon('bookmark', 22), 'Saved'),
      h('a', { href: 'ask.html', 'aria-current': active === 'ask' ? 'page' : null }, icon('plus', 22), 'Ask'),
      h('a', { href: 'profile.html', 'aria-current': active === 'profile' ? 'page' : null }, icon('user', 22), 'Record'))
  }

  // unread count without blocking first paint
  api.get('/notifications').then(({ unread }) => { if (unread) { bellBadge.textContent = unread > 9 ? '9+' : unread; bellBadge.hidden = false } }).catch(() => {})
  return me
}

export { toast }
