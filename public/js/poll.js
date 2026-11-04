import { api } from './api.js'
import { mountShell } from './shell.js'
import { pickButtons, splitBar, verdictBadge } from './card.js'
import { h, $, clear, icon, toast, modal, confirmDialog, copyText, fmt, plural, timeAgo, dateTime, showFieldErrors } from './ui.js'

const id = Number(new URLSearchParams(location.search).get('id'))
const root = $('#app')
await mountShell('poll')

if (!Number.isInteger(id) || id <= 0) await notFound()
function notFound(message = 'That decision doesn’t exist or was removed.') {
  clear(root).append(h('div', { class: 'empty-state' }, h('h3', { text: 'Not found' }), h('p', { text: message }), h('a', { class: 'btn btn-primary', href: 'home.html', text: 'Back to the feed' })))
  return new Promise(() => {}) // nothing else to run on this page
}

let poll
try { poll = (await api.get(`/polls/${id}`)).poll } catch (e) { await notFound(e.status === 404 ? undefined : e.message) }

const stage = h('div', { class: 'stack gap-4' })
const argsBox = h('section', { id: 'arguments', class: 'stack gap-4', 'aria-label': 'Arguments' })
const side = h('aside', { class: 'poll-side' })
let argSort = 'top'

const header = () => h('section', { class: 'stack gap-3' },
  h('div', { class: 'poll-meta' },
    poll.topic && h('a', { class: 'chip', href: `home.html?topic=${poll.topic_slug}`, text: poll.topic }),
    h('span', {}, poll.mine ? (poll.is_anonymous ? 'asked by you, anonymously' : 'asked by you') : poll.author ? ['asked by ', h('strong', { text: poll.author.display_name })] : 'asked anonymously'),
    h('span', { 'aria-hidden': 'true', text: '·' }), h('span', { text: timeAgo(poll.created_at) }),
    h('span', { class: 'when', text: poll.archived ? 'archived' : poll.closed ? 'closed' : `closes ${dateTime(poll.closes_at)}` })),
  h('h1', { class: 'poll-title', text: poll.title }),
  poll.context && h('p', { style: { 'font-size': '17px', 'line-height': '1.6', 'max-width': '64ch' }, class: 'muted', text: poll.context }))

/* ---- stage: picks or results desk ---------------------------------------------- */
async function act(fn, container) {
  container?.querySelectorAll('button').forEach((b) => { b.disabled = true })
  try { setPoll((await fn()).poll) } catch (e) { toast(e.message, 'error'); container?.querySelectorAll('button').forEach((b) => { b.disabled = false }) }
}

function desk() {
  const r = poll.results, [oa, ob] = poll.options
  const pct = (n, p) => n === 0 ? '–' : [String(p), h('small', { text: '%' })]
  const mineSide = poll.my_vote === oa.id ? oa : poll.my_vote === ob.id ? ob : null
  const other = mineSide && (mineSide === oa ? ob : oa)
  const card = h('section', { class: 'card stack gap-4', 'aria-label': 'Results' },
    h('div', { class: 'desk-top' },
      h('div', { class: 'desk-side desk-a' }, h('span', { class: 'tag', text: `THIS · ${oa.label.toUpperCase()}` }), h('span', { class: 'pct num' }, ...[].concat(pct(r.n, r.a.pct))), h('span', { class: 'mono muted num', text: `${plural(r.a.votes, 'vote')}` })),
      h('div', { class: 'desk-mid' }, verdictBadge(r), h('span', { class: 'mono muted num', text: `margin ${r.margin} pts · n = ${fmt(r.n)}` })),
      h('div', { class: 'desk-side b desk-b' }, h('span', { class: 'tag', text: `THAT · ${ob.label.toUpperCase()}` }), h('span', { class: 'pct num' }, ...[].concat(pct(r.n, r.b.pct))), h('span', { class: 'mono muted num', text: plural(r.b.votes, 'vote') }))),
    (() => { const b = splitBar(r, { slim: true }); b.style.height = '22px'; b.style.borderRadius = '4px'; return b })())

  if (mineSide) {
    const lead = r.verdict.leader
    const withCrowd = !lead ? 'dead level' : (lead === 'a') === (mineSide === oa) ? 'with the majority' : 'against the grain'
    const n = h('div', { class: 'notice' }, icon('check', 18), h('span', {}, 'You voted ', h('strong', { text: mineSide.label }), `, ${withCrowd}.`))
    if (poll.change_until) {
      const mins = Math.max(1, Math.ceil((new Date(poll.change_until) - Date.now()) / 60000))
      n.append(h('span', { class: 'muted' }, `Changing your mind? ${mins} min left.`),
        h('button', { class: 'link-btn', type: 'button', text: `Switch to ${other.label}`, on: { click: () => act(() => api.post(`/polls/${poll.id}/vote`, { option_id: other.id }), n) } }),
        h('button', { class: 'link-btn', type: 'button', text: 'Undo vote', on: { click: () => act(() => api.del(`/polls/${poll.id}/vote`), n) } }))
    } else n.append(h('span', { class: 'muted', text: 'Your vote is locked in.' }))
    card.append(n)
  } else if (poll.mine) card.append(h('div', { class: 'notice' }, 'This is your decision. You can follow the split here but not vote on it.'))
  else if (poll.closed) card.append(h('div', { class: 'notice warn' }, poll.archived ? 'This decision was archived from the first version of the app.' : 'Voting has closed.'))
  else card.append(h('div', { class: 'notice warn' }, 'You’re looking without voting, so your opinion isn’t counted.', h('button', { class: 'link-btn', type: 'button', text: 'Vote now', on: { click: () => stageVote() } })))

  const trend = h('div', { class: 'stack gap-2' })
  card.append(trend)
  if (r.n >= 2) loadTrend(trend)
  return card
}

let forceVote = false
function stageVote() { forceVote = true; renderStage() }

async function loadTrend(box) {
  try {
    const { points } = await api.get(`/polls/${id}/trend`)
    const span = new Date(points[7].at) - new Date(poll.created_at)
    const label = (iso) => new Date(iso).toLocaleString('en-IE', span > 86400000 ? { day: 'numeric', month: 'short' } : { hour: '2-digit', minute: '2-digit' })
    box.append(
      h('div', { class: 'row wrap', style: { 'justify-content': 'space-between', gap: '12px' } }, h('h2', { class: 'side-title', text: 'How the split moved' }), h('span', { class: 'mono muted', style: { 'font-size': '11px' }, text: 'share of THIS at each point · dashed line = 50%' })),
      h('div', { class: 'trend', role: 'img', 'aria-label': 'Share of votes for this over time: ' + points.map((p) => (p.pct_a == null ? 'no votes' : p.pct_a + ' percent')).join(', ') },
        ...points.map((p) => h('div', { class: 'col' }, h('div', { class: 'b', style: { 'flex-grow': p.pct_a == null ? 1 : 100 - p.pct_a } }), h('div', { class: 'a', style: { 'flex-grow': p.pct_a == null ? 0 : p.pct_a }, text: p.pct_a == null ? '' : String(p.pct_a) })))),
      h('div', { class: 'trend-axis' }, ...points.map((p, i) => h('span', { text: i % 2 ? '' : label(p.at) }))))
  } catch { box.remove() }
}

function pickPanel() {
  return h('section', { class: 'card stack gap-4', 'aria-label': 'Cast your vote' },
    pickButtons(poll, (optionId, box) => act(() => api.post(`/polls/${poll.id}/vote`, { option_id: optionId }), box), { big: true }),
    h('div', { class: 'hint-line' }, h('span', { text: `${plural(poll.votes_total, 'vote')} in · results and arguments unlock when you vote` }),
      h('button', { class: 'link-btn', type: 'button', text: 'Just show me the results', on: { click: () => act(() => api.post(`/polls/${poll.id}/peek`), stage) } })))
}

function renderStage() {
  clear(stage)
  if (poll.revealed && !(forceVote && poll.can_vote && !poll.my_vote)) stage.append(desk())
  else if (poll.can_vote) stage.append(pickPanel())
  else stage.append(desk())
  if (poll.outcome) stage.append(h('div', { class: 'notice warn' }, icon('check', 18), h('span', {}, 'The asker went with ', h('strong', { text: poll.outcome.label }), '.')))
}

/* ---- arguments ------------------------------------------------------------------- */
function reportDialog(title, path) {
  return modal(title, (close) => {
    const form = h('form', { class: 'stack gap-4', on: { submit: async (e) => {
      e.preventDefault()
      const d = Object.fromEntries(new FormData(form))
      try { await api.post(path, { reason: d.reason, ...(d.note.trim() ? { note: d.note.trim() } : {}) }); toast('Thanks, we’ve got it'); close(true) } catch (ex) { toast(ex.message, 'error') }
    } } },
      h('div', { class: 'stack gap-2', role: 'radiogroup', 'aria-label': 'Reason' },
        ...[['spam', 'Spam or self-promotion'], ['abuse', 'Abusive or hateful'], ['misleading', 'Misleading'], ['other', 'Something else']].map(([v, l], i) =>
          h('label', { class: 'row gap-2' }, h('input', { type: 'radio', name: 'reason', value: v, checked: i === 0 }), l))),
      h('div', { class: 'field' }, h('label', { for: 'note', text: 'Anything we should know? (optional)' }), h('textarea', { class: 'textarea', id: 'note', name: 'note', maxlength: 300 })),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: () => close(false) } }), h('button', { class: 'btn btn-ink', type: 'submit', text: 'Send report' })))
    return form
  })
}

function argCard(a, sideKey) {
  const mark = h('button', { class: 'convince', type: 'button', 'aria-pressed': String(a.marked), disabled: a.mine, title: a.mine ? 'You can’t mark your own argument' : null, text: `Convincing · ${a.convincing}`, on: { click: async () => {
    try { const r = await api.post(`/arguments/${a.id}/convincing`); a.marked = r.marked; a.convincing = r.convincing; mark.setAttribute('aria-pressed', String(r.marked)); mark.textContent = `Convincing · ${r.convincing}` } catch (e) { toast(e.message, 'error') }
  } } })
  const actions = h('div', { class: 'arg-actions' }, mark)
  if (a.mine || poll.mine) actions.append(h('button', { class: 'link-btn', type: 'button', text: 'Remove', on: { click: async () => {
    if (!(await confirmDialog('Remove this argument?', 'It disappears for everyone.', 'Remove', true))) return
    try { await api.del(`/arguments/${a.id}`); toast('Removed'); await loadArgs(); poll.args_count = Math.max(0, poll.args_count - 1) } catch (e) { toast(e.message, 'error') }
  } } }))
  if (!a.mine) actions.append(h('button', { class: 'link-btn', type: 'button', text: 'Report', on: { click: () => reportDialog('Report this argument', `/arguments/${a.id}/report`) } }))
  return h('article', { class: `arg ${sideKey}` }, h('div', { class: 'who' }, h('strong', { text: a.mine ? 'You' : a.author.display_name }), h('span', { text: timeAgo(a.created_at) })), h('p', { text: a.body }), actions)
}

async function loadArgs() {
  clear(argsBox)
  if (!poll.revealed) {
    argsBox.append(h('h2', { class: 'display', style: { 'font-size': '34px' }, text: `${poll.args_count} arguments` }), h('div', { class: 'empty-state' }, h('p', { text: 'Vote to read what each side is saying. Reading first would sway your vote.' })))
    return
  }
  const header = h('div', { class: 'row wrap', style: { 'justify-content': 'space-between', gap: '12px' } })
  argsBox.append(header)
  if (!poll.arguments_enabled) { header.append(h('h2', { class: 'display', style: { 'font-size': '34px' }, text: 'Arguments are off' })); argsBox.append(h('p', { class: 'muted', text: 'The asker turned arguments off for this decision.' })); return }

  let data
  try { data = await api.get(`/polls/${id}/arguments`, { sort: argSort }) } catch (e) { argsBox.append(h('p', { text: e.message })); return }
  header.append(h('h2', { class: 'display', style: { 'font-size': '34px' }, text: plural(data.total, 'argument') }),
    h('div', { class: 'seg-control', role: 'group', 'aria-label': 'Sort arguments' },
      ...[['top', 'Most convincing'], ['new', 'Newest']].map(([k, l]) => h('button', { type: 'button', 'aria-pressed': String(argSort === k), text: l, on: { click: () => { argSort = k; loadArgs() } } }))))

  if (poll.my_vote && !poll.closed) {
    const mineSide = poll.my_vote === poll.options[0].id ? poll.options[0] : poll.options[1]
    const ta = h('textarea', { class: 'textarea', id: 'arg-body', name: 'body', rows: 3, maxlength: 600, placeholder: 'Make the case. Numbers and lived experience land best.', 'aria-describedby': 'arg-count' })
    const count = h('span', { id: 'arg-count', class: 'mono muted', style: { 'font-size': '11px' }, text: '0 / 600' })
    ta.addEventListener('input', () => { count.textContent = `${ta.value.length} / 600` })
    const post = h('button', { class: 'btn btn-ink', type: 'submit', text: 'Post argument' })
    const form = h('form', { class: 'card pad-sm stack gap-3', on: { submit: async (e) => {
      e.preventDefault(); post.disabled = true
      try { await api.post(`/polls/${id}/arguments`, { body: ta.value }); poll.args_count++; await loadArgs() } catch (ex) { toast(ex.message, 'error'); post.disabled = false }
    } } }, h('label', { for: 'arg-body', style: { 'font-size': '13px' }, class: 'muted' }, 'Arguing for ', h('strong', { text: mineSide.label }), ' (your vote)'), ta, h('div', { class: 'row', style: { 'justify-content': 'space-between' } }, count, post))
    argsBox.append(form)
  } else if (poll.can_vote && !poll.my_vote) argsBox.append(h('p', { class: 'muted', text: 'Vote to add your own argument.' }))

  const col = (sideKey, label, items) => h('div', { class: `args-col ${sideKey}` }, h('h3', { text: `${label} · ${items.length}` }),
    items.length ? items.map((a) => argCard(a, sideKey)) : h('p', { class: 'muted', style: { 'font-size': '14px' }, text: 'No arguments yet.' }))
  argsBox.append(h('div', { class: 'args-cols' }, col('a', `FOR THIS · ${poll.options[0].label.toUpperCase()}`, data.a), col('b', `FOR THAT · ${poll.options[1].label.toUpperCase()}`, data.b)))
}

/* ---- sidebar ----------------------------------------------------------------------- */
function outcomeCard() {
  const card = h('div', { class: 'card card-inverse stack gap-3' })
  if (poll.outcome) return card.append(h('p', { class: 'eyebrow', text: 'Outcome' }), h('p', { style: { 'font-size': '15px' } }, 'The asker chose ', h('strong', { text: poll.outcome.label }), '.')) || card
  if (poll.mine && poll.closed && !poll.archived) {
    const box = h('div', { class: 'row gap-2' })
    card.append(h('p', { class: 'eyebrow', style: { color: 'var(--that)' }, text: 'Close the loop' }), h('p', { style: { 'font-size': '15px' }, text: 'Voting has closed. Tell everyone what you actually chose.' }), box)
    poll.options.forEach((o, i) => box.append(h('button', { class: 'btn', type: 'button', style: { flex: 1, background: i ? 'var(--that)' : 'var(--this)', color: i ? 'var(--on-that)' : 'var(--on-this)', 'border-color': 'transparent' }, text: o.label, on: { click: async () => {
      if (!(await confirmDialog('Report your choice?', `Everyone who voted or saved this will be told you chose ${o.label}. You can’t change it later.`, 'Report it'))) return
      act(() => api.post(`/polls/${poll.id}/outcome`, { option_id: o.id }), box)
    } } })))
    return card
  }
  card.append(h('p', { class: 'eyebrow', style: { color: 'var(--that)' }, text: 'Pending outcome' }),
    h('p', { style: { 'font-size': '15px', 'line-height': '1.5' }, text: poll.closed ? 'This closed without a reported outcome.' : 'When this closes, the asker is asked what they actually chose. Vote or save it and you’ll get a notification.' }))
  return card
}

function sideCard() {
  const dl = h('dl', { class: 'dl' },
    h('dt', { text: 'Opened' }), h('dd', { text: dateTime(poll.created_at) }),
    h('dt', { text: 'Closes' }), h('dd', { text: poll.closes_at ? dateTime(poll.closes_at) : 'Never' }),
    h('dt', { text: 'Voters' }), h('dd', { class: 'mono', text: fmt(poll.votes_total) }),
    h('dt', { text: 'Arguments' }), h('dd', { text: poll.arguments_enabled ? 'On' : 'Off' }),
    h('dt', { text: 'Asker' }), h('dd', { text: poll.is_anonymous ? 'Anonymous' : 'Public' }))
  const save = h('button', { class: 'btn btn-sm', type: 'button', style: { flex: 1 }, 'aria-pressed': String(poll.saved), text: poll.saved ? 'Saved' : 'Save', on: { click: async () => {
    try { poll.saved ? await api.del(`/polls/${id}/save`) : await api.put(`/polls/${id}/save`); poll.saved = !poll.saved; save.textContent = poll.saved ? 'Saved' : 'Save'; save.setAttribute('aria-pressed', String(poll.saved)); toast(poll.saved ? 'Saved' : 'Removed from saved') } catch (e) { toast(e.message, 'error') }
  } } })
  const actions = h('div', { class: 'row wrap gap-2', style: { 'border-top': '1px solid var(--rule-soft)', 'padding-top': '12px' } },
    h('button', { class: 'btn btn-sm', type: 'button', style: { flex: 1 }, text: 'Copy link', on: { click: () => copyText(location.href) } }), save)
  if (poll.mine) {
    if (poll.votes_total === 0 && !poll.closed) actions.append(h('button', { class: 'btn btn-sm', type: 'button', style: { flex: '1 1 100%' }, text: 'Edit context', on: { click: editContext } }))
    actions.append(h('button', { class: 'btn btn-sm btn-danger', type: 'button', style: { flex: '1 1 100%' }, text: 'Delete this decision', on: { click: async () => {
      if (!(await confirmDialog('Delete this decision?', 'Its votes and arguments are deleted too. This can’t be undone.', 'Delete', true))) return
      try { await api.del(`/polls/${id}`); location.href = 'home.html' } catch (e) { toast(e.message, 'error') }
    } } }))
  } else actions.append(h('button', { class: 'link-btn', type: 'button', text: 'Report', on: { click: () => reportDialog('Report this decision', `/polls/${id}/report`) } }))
  return h('div', { class: 'card pad-sm stack gap-3' }, h('h2', { class: 'side-title', text: 'About this decision' }), dl, actions)
}

function editContext() {
  modal('Edit context', (close) => {
    const form = h('form', { class: 'stack gap-4', on: { submit: async (e) => {
      e.preventDefault()
      try { const r = await api.patch(`/polls/${id}`, { context: new FormData(form).get('context') }); close(); setPoll(r.poll) } catch (ex) { if (!showFieldErrors(form, ex)) toast(ex.message, 'error') }
    } } },
      h('div', { class: 'field' }, h('label', { for: 'ctx', text: 'Context' }), h('textarea', { class: 'textarea', id: 'ctx', name: 'context', rows: 5, maxlength: 600 }, poll.context), h('div', { class: 'err', 'data-err': 'context' }), h('p', { class: 'hint', text: 'You can edit this until the first vote lands.' })),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: () => close() } }), h('button', { class: 'btn btn-primary', type: 'submit', text: 'Save' })))
    return form
  })
}

async function renderSide() {
  clear(side).append(outcomeCard(), sideCard())
  try {
    const more = await api.get('/polls', { lens: 'fresh', topic: poll.topic_slug, limit: 5 })
    const items = more.polls.filter((p) => p.id !== id).slice(0, 3)
    if (items.length) side.append(h('div', { class: 'card pad-sm stack gap-4' }, h('h2', { class: 'side-title', text: `More ${poll.topic} decisions` }),
      ...items.map((p) => h('a', { class: 'close-item', href: `poll.html?id=${p.id}` }, h('span', { text: p.title }), p.results ? splitBar(p.results, { slim: true }) : h('span', { class: 'mono muted', text: `${plural(p.votes_total, 'vote')} in` })))))
  } catch { /* optional */ }
}

function setPoll(next) {
  poll = next; forceVote = false
  document.title = `${poll.title} · This or That`
  clear(root).append(h('div', { class: 'poll-layout' }, h('div', { class: 'poll-main' }, header(), stage, argsBox), side))
  renderStage(); loadArgs(); renderSide()
}

setPoll(poll)
if (location.hash === '#arguments') argsBox.scrollIntoView()
