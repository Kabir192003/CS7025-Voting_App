/**
 * DOM helpers. Everything user-supplied goes through textContent / text nodes, never
 * innerHTML, so there is no HTML-injection path even if the CSP were relaxed.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'text') el.textContent = v
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn)
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv
    else if (k === 'style') for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv)
    else if (v === true) el.setAttribute(k, '')
    else el.setAttribute(k, v)
  }
  append(el, children)
  return el
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue
    el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  }
  return el
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el }
export const $ = (sel, root = document) => root.querySelector(sel)

const SVG = 'http://www.w3.org/2000/svg'
const ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  comment: 'M4 5h16v11H9l-5 4z',
  link: 'M10 14L21 3M21 3h-7M21 3v7M19 14v6H4V5h6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  auto: 'M12 3a9 9 0 1 0 0 18V3z',
  feed: 'M4 4h16v7H4zM4 13h16v7H4z',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
  chevron: 'M15 18l-6-6 6-6',
  check: 'M20 6L9 17l-5-5',
  arrow: 'M5 12h14M13 6l6 6-6 6'
}
export function icon(name, size = 18, filled = false) {
  const s = document.createElementNS(SVG, 'svg')
  s.setAttribute('width', size); s.setAttribute('height', size); s.setAttribute('viewBox', '0 0 24 24')
  s.setAttribute('fill', filled ? 'currentColor' : 'none'); s.setAttribute('stroke', 'currentColor')
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round')
  s.setAttribute('aria-hidden', 'true')
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', ICONS[name]); s.append(p)
  return s
}

/* ---- formatting ---------------------------------------------------------- */
export const fmt = (n) => Number(n).toLocaleString('en-IE')
export const plural = (n, one, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeLeft(iso) {
  if (!iso) return 'open'
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  if (s <= 0) return 'closed'
  if (s < 3600) return `closes in ${Math.max(1, Math.ceil(s / 60))}m`
  if (s < 86400) return `closes in ${Math.floor(s / 3600)}h`
  return `closes in ${Math.floor(s / 86400)}d`
}

export const dateTime = (iso) => new Date(iso).toLocaleString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/* ---- toast and dialog -------------------------------------------------------- */
let toastHost
export function toast(message, kind = 'info') {
  toastHost ||= document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }))
  const t = h('div', { class: 'toast' + (kind === 'error' ? ' error' : ''), text: message })
  toastHost.append(t)
  setTimeout(() => t.remove(), kind === 'error' ? 5000 : 3000)
}

/** Open a modal. `build(close)` returns the body nodes. Resolves when closed. */
export function modal(title, build) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { 'aria-label': title })
    const close = (value) => { dlg.close(); dlg.remove(); resolve(value) }
    dlg.append(h('div', { class: 'dialog-body' }, h('h2', { text: title }), build(close)))
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(undefined) })
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(undefined) })
    document.body.append(dlg)
    dlg.showModal()
  })
}

export function confirmDialog(title, message, confirmLabel = 'Confirm', danger = false) {
  return modal(title, (close) => h('div', { class: 'stack gap-4' },
    h('p', { class: 'muted', text: message }),
    h('div', { class: 'dialog-actions' },
      h('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: () => close(false) } }),
      h('button', { class: 'btn ' + (danger ? 'btn-ink' : 'btn-primary'), type: 'button', text: confirmLabel, on: { click: () => close(true) } })
    ))).then(Boolean)
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Link copied') } catch { toast('Copy failed. Select the address bar instead.', 'error') }
}

/** Show field-level errors from an ApiError on a form. */
export function showFieldErrors(form, err) {
  form.querySelectorAll('[data-err]').forEach((n) => { n.textContent = '' })
  form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'))
  let any = false
  for (const [name, msg] of Object.entries(err.fields || {})) {
    const slot = form.querySelector(`[data-err="${name}"]`)
    if (slot) { slot.textContent = msg; any = true }
    form.querySelector(`[name="${name}"]`)?.setAttribute('aria-invalid', 'true')
  }
  return any
}

export const topicSlug = (name) => name.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
