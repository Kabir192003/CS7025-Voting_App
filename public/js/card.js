/** The poll card and the pieces of the results desk. Shared by the feed, profile and poll page. */
import { api } from './api.js'
import { h, icon, toast, fmt, plural, timeAgo, timeLeft, copyText } from './ui.js'

/** Two inks, one bar. Segments animate from 50/50 to the real split. */
export function splitBar(results, { slim = false } = {}) {
  const label = (p) => (slim ? null : results.n === 0 ? '–' : `${p}%`)
  const a = h('div', { class: 'seg seg-a', text: label(results.a.pct) })
  const b = h('div', { class: 'seg seg-b', text: label(results.b.pct) })
  const bar = h('div', { class: 'split' + (slim ? ' slim' : ''), role: 'img', 'aria-label': `${results.a.pct} percent this, ${results.b.pct} percent that` }, a, b)
  const set = (x, y) => { a.style.flexGrow = x; b.style.flexGrow = y }
  const target = results.n === 0 ? [1, 1] : [Math.max(results.a.pct, 0.01), Math.max(results.b.pct, 0.01)]
  set(1, 1)
  requestAnimationFrame(() => requestAnimationFrame(() => set(...target)))
  return bar
}

export function verdictBadge(results) {
  const { code, leader, label } = results.verdict
  const cls = code === 'leaning' || code === 'landslide' ? `verdict-${code}-${leader}` : `verdict-${code}`
  return h('span', { class: `verdict ${cls}`, text: label })
}

export function resultDesk(poll, { slim = false } = {}) {
  const r = poll.results
  const [oa, ob] = poll.options
  const mineSide = poll.my_vote === oa.id ? 'a' : poll.my_vote === ob.id ? 'b' : null
  const majority = r.verdict.leader
  const foot = h('div', { class: 'result-foot' },
    verdictBadge(r),
    h('span', { class: 'mono muted num', text: `n = ${fmt(r.n)} · margin ${r.margin} pts` }),
    mineSide && h('span', {}, 'You picked ', h('strong', { text: mineSide === 'a' ? oa.label : ob.label }),
      majority ? (majority === mineSide ? ' · with the majority' : ' · against the grain') : ' · dead level'))
  return h('div', { class: 'stack gap-3' },
    splitBar(r, { slim }),
    h('div', { class: 'result-labels' },
      h('span', { class: 'a' }, oa.label, ' ', h('span', { class: 'mono num', text: fmt(r.a.votes) })),
      h('span', { class: 'b' }, ob.label, ' ', h('span', { class: 'mono num', text: fmt(r.b.votes) }))),
    foot)
}

export function pickButtons(poll, onPick, { big = false } = {}) {
  const [oa, ob] = poll.options
  const mk = (o, cls, tag) => h('button', { class: `pick ${cls}` + (big ? ' pick-big' : ''), type: 'button', 'aria-label': `Vote ${o.label}`, on: { click: (e) => onPick(o.id, e.currentTarget.closest('.picks')) } },
    h('span', { class: 'tag', text: tag }), h('span', { class: 'label', text: o.label }))
  return h('div', { class: 'picks' }, mk(oa, 'pick-a', 'THIS'), mk(ob, 'pick-b', 'THAT'))
}

function minutesLeft(iso) { return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000)) }

/**
 * @param {object} poll serialized poll
 * @param {{onChange?: (poll)=>void, onRemoved?: ()=>void}} hooks
 */
export function pollCard(poll, hooks = {}) {
  const card = h('article', { class: 'card poll', 'data-poll': poll.id })
  const swap = (next) => { const n = pollCard(next, hooks); card.replaceWith(n); n.classList.add('enter'); hooks.onChange?.(next) }
  const busy = (el, on) => el?.querySelectorAll('button').forEach((b) => { b.disabled = on })

  async function act(fn, container) {
    busy(container, true)
    try { swap((await fn()).poll) } catch (e) { toast(e.message, 'error'); busy(container, false) }
  }

  const author = poll.mine ? (poll.is_anonymous ? 'You, anonymously' : 'You') : poll.author ? poll.author.display_name : 'Anonymous'
  card.append(h('div', { class: 'poll-meta' },
    poll.topic && h('span', { class: 'chip', text: poll.topic }),
    h('span', { text: author }), h('span', { 'aria-hidden': 'true', text: '·' }), h('span', { text: timeAgo(poll.created_at) }),
    h('span', { class: 'when', text: poll.archived ? 'archived' : timeLeft(poll.closes_at) })))

  card.append(h('div', { class: 'stack', style: { gap: '6px' } },
    h('h2', {}, h('a', { href: `poll.html?id=${poll.id}`, text: poll.title })),
    poll.context && h('p', { class: 'context', text: poll.context })))

  if (poll.revealed) {
    card.append(resultDesk(poll, {}))
    if (poll.outcome) card.append(h('div', { class: 'notice warn' }, icon('check', 16), h('span', {}, 'The asker went with ', h('strong', { text: poll.outcome.label }), '.')))
    else if (poll.my_vote && poll.change_until) {
      const undo = h('button', { class: 'link-btn', type: 'button', text: `Change vote (${minutesLeft(poll.change_until)} min left)`, on: { click: () => act(() => api.del(`/polls/${poll.id}/vote`), card) } })
      card.append(h('div', { class: 'hint-line' }, undo))
    }
  } else if (poll.can_vote) {
    card.append(pickButtons(poll, (optionId, box) => act(() => api.post(`/polls/${poll.id}/vote`, { option_id: optionId }), box)))
    card.append(h('div', { class: 'hint-line' },
      h('span', { text: `${plural(poll.votes_total, 'vote')} in · the split shows after you pick` }),
      h('button', { class: 'link-btn', type: 'button', text: 'Just show me the results', on: { click: () => act(() => api.post(`/polls/${poll.id}/peek`), card) } })))
  }

  const save = h('button', { class: 'foot-btn', type: 'button', 'aria-pressed': String(poll.saved), on: { click: async () => {
    try { poll.saved ? await api.del(`/polls/${poll.id}/save`) : await api.put(`/polls/${poll.id}/save`); poll.saved = !poll.saved; swap(poll); toast(poll.saved ? 'Saved' : 'Removed from saved') } catch (e) { toast(e.message, 'error') }
  } } }, icon('bookmark', 16), poll.saved ? 'Saved' : 'Save')
  card.append(h('div', { class: 'poll-foot' },
    h('a', { class: 'foot-btn', href: `poll.html?id=${poll.id}#arguments` }, icon('comment', 16), poll.arguments_enabled ? plural(poll.args_count, 'argument') : 'Arguments off'),
    save,
    h('button', { class: 'foot-btn', type: 'button', on: { click: () => copyText(new URL(`poll.html?id=${poll.id}`, location.href).href) } }, icon('link', 16), 'Copy link')))
  return card
}
