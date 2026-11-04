import { api } from './api.js'
import { mountShell } from './shell.js'
import { h, $, clear, toast, showFieldErrors, timeLeft } from './ui.js'

const TOPICS = ['Tech', 'Money', 'Career', 'Study', 'Travel', 'Food & Drink', 'Home', 'Health', 'Style', 'Relationships', 'Entertainment', 'Everyday']
const DURATIONS = [[6, '6 hours'], [24, '1 day'], [72, '3 days'], [168, '7 days']]

const { user } = await mountShell('ask')
const root = $('#app')
const s = { title: '', context: '', a: '', b: '', topic: '', duration: 72, anon: false, args: true, hide: true }

const el = {
  title: h('input', { class: 'input', id: 'title', name: 'title', maxlength: 140, autocomplete: 'off', required: true, placeholder: 'e.g. Lisbon or Porto for a first long weekend?', style: { 'font-size': '22px', 'font-weight': '600' } }),
  context: h('textarea', { class: 'textarea', id: 'context', name: 'context', rows: 3, maxlength: 600, placeholder: 'Budget, timeline, what matters to you. Voters decide better with a constraint.' }),
  a: h('input', { class: 'input', id: 'option_a', name: 'option_a', maxlength: 28, autocomplete: 'off', required: true, placeholder: 'Lisbon', style: { 'font-weight': '600' } }),
  b: h('input', { class: 'input', id: 'option_b', name: 'option_b', maxlength: 28, autocomplete: 'off', required: true, placeholder: 'Porto', style: { 'font-weight': '600' } })
}
const counts = { title: h('span', { class: 'mono muted', style: { 'font-size': '12px' } }), context: h('span', { class: 'mono muted', style: { 'font-size': '12px' } }) }
const topicBox = h('div', { class: 'row wrap gap-2', role: 'group', 'aria-label': 'Topic' })
const durBox = h('div', { class: 'seg-control', role: 'group', 'aria-label': 'Voting closes after' })
const toggleBox = h('div', { class: 'stack', style: { 'border-top': '1px solid var(--rule)' } })
const preview = h('article', { class: 'card poll', 'aria-label': 'Preview' })
const checks = h('div', { class: 'stack gap-3' })
const checkCount = h('span', { class: 'mono muted', style: { 'font-size': '12px' } })
const submit = h('button', { class: 'btn btn-primary', type: 'submit', style: { 'min-height': '48px', padding: '0 22px', 'font-size': '16px' }, text: 'Put it to the crowd' })

function paint() {
  counts.title.textContent = `${s.title.length} / 140`
  counts.context.textContent = `${s.context.length} / 600`

  clear(topicBox)
  for (const t of TOPICS) topicBox.append(h('button', { class: 'pill', type: 'button', 'aria-pressed': String(s.topic === t), on: { click: () => { s.topic = t; paint() } } }, t))
  clear(durBox)
  for (const [hrs, label] of DURATIONS) durBox.append(h('button', { type: 'button', 'aria-pressed': String(s.duration === hrs), text: label, on: { click: () => { s.duration = hrs; paint() } } }))

  clear(toggleBox)
  for (const [key, label, hint] of [
    ['anon', 'Post anonymously', 'Your name is hidden from everyone, including on your profile.'],
    ['args', 'Allow arguments', 'Voters can explain their pick, grouped by side.'],
    ['hide', 'Hide results until people vote', 'Recommended. Keeps early votes from steering later ones.']
  ]) toggleBox.append(h('div', { class: 'toggle-row' }, h('div', { class: 'stack', style: { gap: '2px' } }, h('span', { class: 't', text: label }), h('span', { class: 'muted', style: { 'font-size': '13px' }, text: hint })),
    h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(s[key]), 'aria-label': label, on: { click: () => { s[key] = !s[key]; paint() } } }, h('span'))))

  const title = s.title.trim(), a = s.a.trim(), b = s.b.trim()
  const results = [
    [title.length >= 12 && /\?$/.test(title), 'Reads as a question.', 'At least 12 characters, ending with a question mark.'],
    [a && b && a.toLowerCase() !== b.toLowerCase(), 'Two distinct options.', 'Voters can only pick one.'],
    [a.length <= 28 && b.length <= 28 && (a || b), 'Options fit on a button.', 'Under 28 characters each.'],
    [s.context.trim().length >= 30, 'Enough context.', 'Budget, timeline or what matters to you.'],
    [!!s.topic, 'A topic is chosen.', 'It decides who sees it first.']
  ]
  clear(checks).append(...results.map(([ok, label, hint]) => h('div', { class: 'check' + (ok ? ' ok' : '') }, h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', {}, h('strong', { text: label }), ' ', h('span', { class: 'muted', text: hint })))))
  checkCount.textContent = `${results.filter((r) => r[0]).length} of ${results.length}`

  const author = s.anon ? 'Anonymous' : user.display_name
  clear(preview).append(
    h('div', { class: 'poll-meta' }, s.topic && h('span', { class: 'chip', text: s.topic }), h('span', { text: author }), h('span', { 'aria-hidden': 'true', text: '·' }), h('span', { text: 'just now' }),
      h('span', { class: 'when', text: timeLeft(new Date(Date.now() + s.duration * 3600000).toISOString()) })),
    h('h2', { text: title || 'Your question appears here', style: { 'font-size': '22px', 'line-height': '1.25', 'font-weight': '600' } }),
    s.context.trim() && h('p', { class: 'context', text: s.context }),
    h('div', { class: 'picks' },
      h('div', { class: 'pick pick-a' }, h('span', { class: 'tag', text: 'THIS' }), h('span', { class: 'label', text: a || 'Option one' })),
      h('div', { class: 'pick pick-b' }, h('span', { class: 'tag', text: 'THAT' }), h('span', { class: 'label', text: b || 'Option two' }))))
}

for (const k of Object.keys(el)) el[k].addEventListener('input', () => { s[k] = el[k].value; paint() })

const form = h('form', { class: 'ask-form', novalidate: true, on: { submit: async (e) => {
  e.preventDefault(); submit.disabled = true
  try {
    const { poll } = await api.post('/polls', { title: s.title, context: s.context, option_a: s.a, option_b: s.b, topic: s.topic, duration_hours: s.duration, is_anonymous: s.anon, arguments_enabled: s.args, hide_results: s.hide })
    location.href = `poll.html?id=${poll.id}`
  } catch (err) {
    const shown = showFieldErrors(form, err)
    toast(shown ? 'Fix the highlighted fields and try again.' : err.message, 'error')
    if (err.fields?.topic) topicBox.scrollIntoView({ block: 'center' })
    submit.disabled = false
  }
} } },
  h('div', { class: 'stack', style: { gap: '6px' } }, h('h1', { class: 'display', style: { 'font-size': 'clamp(40px, 6vw, 56px)' }, text: 'What are you stuck on?' }),
    h('p', { class: 'muted', style: { 'max-width': '56ch' }, text: 'Two options, one question. The clearer the trade-off, the more useful the split.' })),
  h('div', { class: 'field' }, h('div', { class: 'row', style: { 'justify-content': 'space-between', 'align-items': 'baseline' } }, h('label', { for: 'title', text: 'Question' }), counts.title), el.title, h('div', { class: 'err', 'data-err': 'title' })),
  h('div', { class: 'field' }, h('div', { class: 'row', style: { 'justify-content': 'space-between', 'align-items': 'baseline' } }, h('label', { for: 'context' }, 'Context ', h('span', { class: 'muted', style: { 'font-weight': '400' }, text: '(optional)' })), counts.context), el.context, h('div', { class: 'err', 'data-err': 'context' })),
  h('div', { class: 'sides' },
    h('div', { class: 'side-box a' }, h('label', { class: 'tag', for: 'option_a', text: 'THIS' }), el.a, h('div', { class: 'err', 'data-err': 'option_a', style: { color: 'var(--danger)', 'font-size': '13px' } })),
    h('div', { class: 'side-box b' }, h('label', { class: 'tag', for: 'option_b', text: 'THAT' }), el.b, h('div', { class: 'err', 'data-err': 'option_b', style: { color: 'var(--danger)', 'font-size': '13px' } }))),
  h('div', { class: 'field' }, h('span', { class: 'label', text: 'Topic' }), topicBox, h('div', { class: 'err', 'data-err': 'topic' })),
  h('div', { class: 'field' }, h('span', { class: 'label', text: 'Voting closes after' }), durBox, h('div', { class: 'err', 'data-err': 'duration_hours' })),
  toggleBox,
  h('div', { class: 'row wrap gap-3' }, submit, h('span', { class: 'muted', style: { 'font-size': '13px' }, text: 'You can edit the context until the first vote lands.' })))

root.append(h('div', { class: 'ask-layout' }, form,
  h('aside', { class: 'ask-side' }, h('p', { class: 'eyebrow', text: 'Live preview · how voters see it' }), preview,
    h('div', { class: 'card pad-sm stack gap-3' }, h('div', { class: 'row', style: { 'justify-content': 'space-between', 'align-items': 'baseline' } }, h('h2', { class: 'side-title', text: 'Question check' }), checkCount), checks))))
paint()
document.title = 'Ask the crowd · This or That'
