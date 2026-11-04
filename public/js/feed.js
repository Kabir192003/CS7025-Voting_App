import { api } from './api.js'
import { mountShell } from './shell.js'
import { pollCard, splitBar } from './card.js'
import { h, $, clear, fmt, plural } from './ui.js'

const LENSES = [
  ['foryou', 'For you'], ['rising', 'Rising'], ['fresh', 'Fresh'], ['needs', 'Needs votes'], ['saved', 'Saved']
]
const params = new URLSearchParams(location.search)
const state = { lens: params.get('lens') || (params.get('q') ? 'fresh' : 'foryou'), topic: params.get('topic') || '', q: params.get('q') || '' }
if (!LENSES.some(([k]) => k === state.lens)) state.lens = 'foryou'

const me = await mountShell(state.lens === 'saved' ? 'saved' : 'feed')
let skipped = false
try { skipped = !!sessionStorage.getItem('tot-skip-onboarding') } catch { /* storage blocked */ }
if (!me.user.topics.length && !skipped) { location.replace('onboarding.html'); await new Promise(() => {}) }

const root = $('#app')
const list = h('div', { class: 'stack gap-4', 'aria-live': 'polite' })
const title = h('h1', { class: 'display feed-title' })
const eyebrow = h('p', { class: 'eyebrow mono' })
const lensGroup = h('div', { class: 'lens-group stack', role: 'group', 'aria-label': 'Feed lens' })
const topicBox = h('div', { class: 'row wrap gap-2 topic-box' })
const rightCol = h('aside', { class: 'feed-right', 'aria-label': 'Your record and trends' })
let offset = 0, loading = false

root.append(h('div', { class: 'feed-layout' },
  h('aside', { class: 'feed-left', 'aria-label': 'Filters' }, lensGroup,
    h('div', { class: 'stack gap-2 topics-wrap' }, h('p', { class: 'eyebrow', text: 'Topics' }), topicBox),
    h('div', { class: 'stack gap-2 feed-note', style: { 'border-top': '1px solid var(--rule)', 'padding-top': '20px' } },
      h('p', { class: 'muted', style: { 'font-size': '13px' }, text: 'Results stay hidden until you vote, so the crowd you see is a crowd of independent opinions.' }))),
  h('section', { class: 'feed-main', 'aria-label': 'Decisions' }, h('div', { class: 'stack', style: { gap: '4px' } }, eyebrow, title), list),
  rightCol))

/* ---- lens + topics ---------------------------------------------------------- */
function syncUrl() {
  const p = new URLSearchParams()
  if (state.lens !== 'foryou') p.set('lens', state.lens)
  if (state.topic) p.set('topic', state.topic)
  if (state.q) p.set('q', state.q)
  history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''))
}

function paintLenses() {
  clear(lensGroup)
  for (const [key, label] of LENSES) {
    lensGroup.append(h('button', { class: 'lens-btn', type: 'button', 'aria-pressed': String(state.lens === key), on: { click: () => { state.lens = key; state.q = ''; reload() } } }, label))
  }
}

async function paintTopics() {
  const { topics } = await api.get('/topics', { trend: 1 })
  clear(topicBox)
  for (const t of topics) {
    const mine = me.user.topics.includes(t.name)
    topicBox.append(h('button', { class: 'pill', type: 'button', 'aria-pressed': String(state.topic === t.slug), title: mine ? 'One of your topics' : null,
      on: { click: () => { state.topic = state.topic === t.slug ? '' : t.slug; reload() } } }, t.name))
  }
  paintRising(topics)
}

/* ---- feed ------------------------------------------------------------------- */
const TITLES = {
  foryou: (n) => (n === 0 ? 'You’re all caught up' : `${fmt(n)} ${n === 1 ? 'decision is' : 'decisions are'} waiting on you`),
  rising: () => 'Rising right now', fresh: () => 'Fresh decisions', needs: () => 'These need your vote', saved: () => 'Your saved decisions'
}
const EMPTY = {
  foryou: ['Nothing left to vote on', 'You’ve voted on everything we have for you. Ask something yourself.'],
  rising: ['Nothing rising yet', 'Check back soon, or vote on something fresh.'],
  fresh: ['No decisions match', 'Try a different topic or search.'],
  needs: ['Every decision has votes', 'Nice. The crowd is keeping up.'],
  saved: ['Nothing saved yet', 'Tap Save on a decision to keep it here.']
}

function skeletons(n = 3) {
  return Array.from({ length: n }, () => h('div', { class: 'card stack gap-3', 'aria-hidden': 'true' },
    h('div', { class: 'skeleton', style: { height: '14px', width: '30%' } }), h('div', { class: 'skeleton', style: { height: '26px', width: '80%' } }),
    h('div', { class: 'skeleton', style: { height: '70px' } })))
}

function paintHeader(total) {
  const day = new Date().toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase().replace(',', '')
  eyebrow.textContent = `${day} · ${state.q ? 'SEARCH' : LENSES.find(([k]) => k === state.lens)[1].toUpperCase()}${state.topic ? ' · ' + state.topic.toUpperCase().replace('-', ' & ') : ''}`
  title.textContent = state.q ? `${plural(total, 'result')} for “${state.q}”` : TITLES[state.lens](total)
  document.title = `${state.q ? 'Search' : LENSES.find(([k]) => k === state.lens)[1]} · This or That`
}

async function load(append = false) {
  if (loading) return
  loading = true
  if (!append) { clear(list).append(...skeletons()) ; offset = 0 }
  try {
    const data = await api.get('/polls', { lens: state.q ? 'fresh' : state.lens, topic: state.topic, q: state.q, offset, limit: 12 })
    if (!append) { clear(list); paintHeader(data.total) }
    list.querySelector('.load-more')?.remove()
    for (const p of data.polls) list.append(pollCard(p))
    if (!data.polls.length && !append) {
      const [t, d] = state.q ? ['No decisions match', 'Try different words, or ask it yourself.'] : EMPTY[state.lens]
      list.append(h('div', { class: 'empty-state' }, h('h3', { text: t }), h('p', { text: d }), h('a', { class: 'btn btn-primary', href: 'ask.html', text: 'Ask the crowd' })))
    }
    if (data.has_more) { offset = data.next_offset; list.append(h('button', { class: 'btn load-more', type: 'button', text: 'Load more', on: { click: () => load(true) } })) }
  } catch (e) {
    clear(list).append(h('div', { class: 'empty-state' }, h('h3', { text: 'Couldn’t load the feed' }), h('p', { text: e.message }), h('button', { class: 'btn', type: 'button', text: 'Try again', on: { click: () => load() } })))
  } finally { loading = false }
}

function reload() { syncUrl(); paintLenses(); paintTopics().catch(() => {}); load() }

/* ---- right column ------------------------------------------------------------ */
function recordCard() {
  const s = me.stats
  const contrarian = (s.alignment || []).filter((a) => a.n >= 3 && a.pct < 50).sort((a, b) => a.pct - b.pct)[0]
  return h('div', { class: 'card card-inverse stack gap-4' },
    h('p', { class: 'eyebrow', text: 'Your decision record' }),
    h('div', { class: 'record-grid' },
      h('div', {}, h('div', { class: 'n', text: fmt(s.votes_cast) }), h('div', { class: 'l', text: 'votes cast' })),
      h('div', {}, h('div', { class: 'n', style: { color: 'var(--that)' }, text: s.with_majority_pct == null ? '–' : s.with_majority_pct + '%' }), h('div', { class: 'l', text: 'with the crowd' })),
      h('div', {}, h('div', { class: 'n', style: { color: 'var(--this)' }, text: String(s.streak_days) }), h('div', { class: 'l', text: s.streak_days === 1 ? 'day streak' : 'day streak' }))),
    h('p', { style: { 'font-size': '13px', 'line-height': '1.5' }, class: 'muted' },
      contrarian ? ['You’re a contrarian on ', h('strong', { text: contrarian.topic }), `: you side with the minority ${Math.round((100 - contrarian.pct) / 10)} times out of 10.`]
        : s.votes_cast ? 'Vote on polls with 10+ votes to see how often you side with the crowd.' : 'Cast your first vote to start your record.'))
}

async function paintRight() {
  clear(rightCol).append(recordCard())
  try {
    const close = await api.get('/polls', { lens: 'close', limit: 3 })
    const card = h('div', { class: 'card pad-sm stack gap-4' }, h('div', { class: 'row', style: { 'justify-content': 'space-between', 'align-items': 'baseline' } }, h('h2', { class: 'side-title', text: 'Too close to call' }), h('span', { class: 'mono muted', style: { 'font-size': '11px' }, text: 'within 6 pts' })))
    if (!close.polls.length) card.append(h('p', { class: 'muted', style: { 'font-size': '14px' }, text: 'No dead heats right now.' }))
    for (const p of close.polls) card.append(h('a', { class: 'close-item', href: `poll.html?id=${p.id}` }, h('span', { text: p.title }), splitBar(p.results, { slim: true }), h('span', { class: 'mono muted num', text: `${p.results.a.pct} – ${p.results.b.pct} · n = ${fmt(p.results.n)}` })))
    rightCol.append(card)
  } catch { /* sidebar is optional */ }
}

function paintRising(topics) {
  rightCol.querySelector('[data-rising]')?.remove()
  const rows = topics.filter((t) => t.votes_7d > 0).sort((a, b) => b.votes_7d - a.votes_7d).slice(0, 4)
  if (!rows.length) return
  rightCol.append(h('div', { class: 'card pad-sm stack gap-3', data: { rising: '1' } }, h('h2', { class: 'side-title', text: 'Busy topics this week' }),
    ...rows.map((t) => h('div', { class: 'row', style: { 'justify-content': 'space-between', 'font-size': '14px' } }, h('span', { text: t.name }),
      h('span', { class: t.change_pct == null ? 'mono muted' : t.change_pct >= 0 ? 'trend-up' : 'trend-down', text: t.change_pct == null ? `${fmt(t.votes_7d)} votes` : `${t.change_pct >= 0 ? '+' : ''}${t.change_pct}%` })))))
}

paintLenses()
paintRight()
paintTopics().catch(() => {})
load()
