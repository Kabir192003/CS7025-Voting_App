import { api } from './api.js'
import { h, $, clear, toast } from './ui.js'

const EXAMPLES = {
  Tech: 'Pixel or iPhone?', Money: 'Save or invest?', Career: 'Startup or big firm?', Study: 'Notes by hand or typed?',
  Travel: 'Window or aisle?', 'Food & Drink': 'Flat white or cortado?', Home: 'Cat or dog?', Health: 'Gym at 7am or 7pm?',
  Style: 'Trainers or boots?', Relationships: 'Text back now or later?', Entertainment: 'Book or series first?', Everyday: 'Shower am or pm?'
}

let me
try { me = await api.get('/users/me') } catch (e) {
  clear($('#app')).append(h('div', { class: 'empty-state', role: 'alert' }, h('h3', { text: 'Can’t reach the server' }), h('p', { text: e.message }),
    h('button', { class: 'btn btn-primary', type: 'button', text: 'Try again', on: { click: () => location.reload() } })))
  await new Promise(() => {})
}
const picked = new Set(me.user.topics)
const root = $('#app')

const cta = h('button', { class: 'btn btn-ink btn-block', type: 'button', style: { 'min-height': '52px', 'font-size': '16px' } })
const grid = h('div', { class: 'topic-grid' })

function paint() {
  clear(grid)
  for (const name of Object.keys(EXAMPLES)) {
    const on = picked.has(name)
    grid.append(h('button', { class: 'topic-tile', type: 'button', 'aria-pressed': String(on), on: { click: () => { on ? picked.delete(name) : picked.add(name); paint() } } },
      h('span', { class: 't', text: name }), h('span', { class: 'e', text: EXAMPLES[name] })))
  }
  const ready = picked.size >= 3
  cta.disabled = !ready
  cta.textContent = ready ? `Build my feed · ${picked.size} topics` : `Pick ${3 - picked.size} more`
}

cta.addEventListener('click', async () => {
  cta.disabled = true
  try { await api.put('/users/me/topics', { topics: [...picked] }); location.href = 'home.html' } catch (e) { toast(e.message, 'error'); cta.disabled = false }
})

root.append(
  h('div', { class: 'row gap-3' }, h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 1, 'aria-valuemax': 3, 'aria-valuenow': 2, 'aria-label': 'Step 2 of 3' }, h('span', { class: 'on' }), h('span', { class: 'on' }), h('span')), h('span', { class: 'mono muted', text: '2 / 3' })),
  h('div', { class: 'stack gap-2' }, h('h1', { class: 'display', style: { 'font-size': '48px' }, text: 'What do you have opinions about?' }),
    h('p', { class: 'muted', text: 'Pick three or more. Your feed starts here and learns from how you vote.' })),
  grid,
  h('div', { class: 'stack gap-2', style: { 'margin-top': 'auto' } }, cta,
    h('button', { class: 'btn btn-quiet', type: 'button', text: 'Skip, show me everything', on: { click: () => { try { sessionStorage.setItem('tot-skip-onboarding', '1') } catch { /* ignore */ } location.href = 'home.html' } } })))
paint()
