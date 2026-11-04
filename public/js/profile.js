import { api } from './api.js'
import { mountShell, avatarEl } from './shell.js'
import { pollCard } from './card.js'
import { h, $, clear, fmt, toast, modal, confirmDialog, showFieldErrors } from './ui.js'

const TOPICS = ['Tech', 'Money', 'Career', 'Study', 'Travel', 'Food & Drink', 'Home', 'Health', 'Style', 'Relationships', 'Entertainment', 'Everyday']
let me = await mountShell('profile')
const root = $('#app')
let tab = 'asked', offset = 0

const headBox = h('section', { class: 'profile-head' })
const statBox = h('section', { class: 'stat-strip', 'aria-label': 'Stats' })
const tabsBox = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Activity' })
const listBox = h('div', { class: 'stack gap-4', 'aria-live': 'polite' })
const sideBox = h('aside', { class: 'feed-right', 'aria-label': 'Insights' })

root.append(h('div', { class: 'stack gap-6' }, headBox, statBox, h('div', { class: 'feed-layout' },
  h('section', { class: 'feed-main', 'aria-label': 'Your decisions' }, tabsBox, listBox), sideBox)))

/* ---- avatar upload: resize and re-encode in the browser before it ever leaves the device -- */
function toAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error('Choose a PNG, JPEG or WebP image.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const size = 256, c = document.createElement('canvas'); c.width = c.height = size
      const ratio = Math.max(size / img.width, size / img.height)
      const w = img.width * ratio, hgt = img.height * ratio
      c.getContext('2d').drawImage(img, (size - w) / 2, (size - hgt) / 2, w, hgt)
      URL.revokeObjectURL(url)
      const data = c.toDataURL('image/jpeg', 0.82)
      data.length > 200000 ? reject(new Error('That image is too large.')) : resolve(data)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Couldn’t read that image.')) }
    img.src = url
  })
}

async function refresh() { me = await api.get('/users/me'); paintHead(); paintStats(); paintSide() }

/* ---- header --------------------------------------------------------------------- */
function paintHead() {
  const u = me.user
  clear(headBox).append(
    h('div', { class: 'row wrap gap-4' }, avatarEl(u, 'xl'),
      h('div', { class: 'stack', style: { gap: '6px' } },
        h('h1', { class: 'display', style: { 'font-size': 'clamp(44px, 7vw, 64px)', 'font-weight': 900 }, text: u.display_name }),
        h('p', { class: 'muted', style: { 'font-size': '14px' } }, h('span', { class: 'mono', text: '@' + u.username }), [u.region, `joined ${new Date(u.created_at).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}`].filter(Boolean).map((x) => ' · ' + x).join('')),
        u.bio && h('p', { class: 'muted', style: { 'max-width': '56ch' }, text: u.bio }),
        h('div', { class: 'row wrap gap-2' }, u.topics.length ? u.topics.map((t) => h('span', { class: 'chip', text: t })) : h('span', { class: 'muted', style: { 'font-size': '13px' }, text: 'No topics picked yet' })))),
    h('div', { class: 'row wrap gap-2' }, h('button', { class: 'btn', type: 'button', text: 'Edit profile', on: { click: editProfile } }), h('button', { class: 'btn', type: 'button', text: 'Topics', on: { click: editTopics } })))
}

function paintStats() {
  const s = me.stats
  const stat = (n, l, color) => h('div', { class: 'stat' }, h('span', { class: 'n num', style: color ? { color } : {}, text: n }), h('span', { class: 'l', text: l }))
  clear(statBox).append(stat(fmt(s.votes_cast), 'votes cast'), stat(fmt(s.polls_asked), `decisions asked · ${fmt(s.votes_received)} votes received`),
    stat(s.with_majority_pct == null ? '–' : s.with_majority_pct + '%', 'of your votes sided with the majority', 'var(--this)'), stat(fmt(s.convincing_received), 'times your argument was marked convincing'))
}

/* ---- tabs ------------------------------------------------------------------------- */
function paintTabs() {
  clear(tabsBox)
  for (const [k, l] of [['asked', 'Asked'], ['voted', 'Voted'], ['saved', 'Saved']]) tabsBox.append(h('button', { role: 'tab', type: 'button', 'aria-selected': String(tab === k), on: { click: () => { tab = k; paintTabs(); loadList() } } }, l))
}

async function loadList(append = false) {
  if (!append) { offset = 0; clear(listBox).append(h('div', { class: 'card' }, h('div', { class: 'skeleton', style: { height: '90px' } }))) }
  try {
    const data = await api.get('/users/me/polls', { tab, offset, limit: 10 })
    if (!append) clear(listBox)
    listBox.querySelector('.load-more')?.remove()
    for (const p of data.polls) listBox.append(pollCard(p))
    if (!data.polls.length && !append) {
      const [t, d, cta] = { asked: ['Nothing asked yet', 'Put your first decision to the crowd.', ['ask.html', 'Ask the crowd']], voted: ['No votes yet', 'Vote on a few decisions to build your record.', ['home.html', 'Go to the feed']], saved: ['Nothing saved', 'Tap Save on a decision to keep it here.', ['home.html', 'Browse decisions']] }[tab]
      listBox.append(h('div', { class: 'empty-state' }, h('h3', { text: t }), h('p', { text: d }), h('a', { class: 'btn btn-primary', href: cta[0], text: cta[1] })))
    }
    if (data.has_more) { offset = data.next_offset; listBox.append(h('button', { class: 'btn load-more', type: 'button', text: 'Load more', on: { click: () => loadList(true) } })) }
  } catch (e) { clear(listBox).append(h('div', { class: 'empty-state' }, h('p', { text: e.message }))) }
}

/* ---- side ------------------------------------------------------------------------- */
function paintSide() {
  const s = me.stats
  clear(sideBox)
  const align = h('div', { class: 'card pad-sm stack gap-4' }, h('div', { class: 'row', style: { 'justify-content': 'space-between', 'align-items': 'baseline' } }, h('h2', { class: 'side-title', text: 'With the crowd, by topic' }), h('span', { class: 'mono muted', style: { 'font-size': '11px' }, text: '50% = coin flip' })))
  if (!s.alignment.length) align.append(h('p', { class: 'muted', style: { 'font-size': '14px' }, text: 'Vote on decisions that have 10 or more votes to see how often you side with the crowd.' }))
  for (const t of s.alignment) align.append(h('div', { class: 'bar-row' }, h('div', { class: 'row', style: { 'justify-content': 'space-between', 'font-size': '14px' } }, h('span', { text: t.topic }), h('span', { class: 'mono muted num', style: { 'font-size': '12px' }, text: `${t.pct}% · ${t.n} votes` })),
    h('div', { class: 'track' }, h('div', { class: 'fill' + (t.pct < 50 ? ' low' : ''), style: { width: t.pct + '%' } }))))
  const low = s.alignment.filter((t) => t.n >= 3 && t.pct < 50).sort((a, b) => a.pct - b.pct)[0]
  if (low) align.append(h('p', { class: 'muted', style: { 'font-size': '13px' }, text: `Below 50% means you usually pick the side that loses. On ${low.topic}, that’s you.` }))
  sideBox.append(align)

  for (const p of me.pending_outcomes) {
    const box = h('div', { class: 'row gap-2' })
    p.options.forEach((o, i) => box.append(h('button', { class: 'btn', type: 'button', style: { flex: 1, background: i ? 'var(--that)' : 'var(--this)', color: i ? 'var(--on-that)' : 'var(--on-this)', 'border-color': 'transparent' }, text: o.label, on: { click: async () => {
      if (!(await confirmDialog('Report your choice?', `Everyone who voted or saved this will be told you chose ${o.label}.`, 'Report it'))) return
      try { await api.post(`/polls/${p.id}/outcome`, { option_id: o.id }); toast('Thanks. Voters have been told.'); await refresh() } catch (e) { toast(e.message, 'error') }
    } } })))
    sideBox.append(h('div', { class: 'card card-inverse stack gap-3' }, h('p', { class: 'eyebrow', style: { color: 'var(--that)' }, text: 'Awaiting your outcome' }),
      h('p', { style: { 'font-size': '15px', 'line-height': '1.5' } }, h('a', { href: `poll.html?id=${p.id}`, style: { color: 'inherit' }, text: `“${p.title}”` }), ' has closed. Tell voters what you picked.'), box))
  }

  sideBox.append(h('div', { class: 'card pad-sm stack gap-3' }, h('h2', { class: 'side-title', text: 'Account' }),
    h('p', { class: 'muted', style: { 'font-size': '14px' }, text: me.user.email || 'No email on file' }),
    h('div', { class: 'row wrap gap-2' }, h('button', { class: 'btn btn-sm', type: 'button', text: 'Change password', on: { click: changePassword } }),
      h('button', { class: 'btn btn-sm', type: 'button', text: 'Sign out everywhere', on: { click: async () => {
        if (!(await confirmDialog('Sign out everywhere?', 'Every device, including this one, will need to sign in again.', 'Sign out'))) return
        await api.post('/auth/logout-all').catch(() => {}); location.href = 'login.html'
      } } }))))
}

/* ---- dialogs ---------------------------------------------------------------------- */
function editProfile() {
  const u = me.user
  let avatar = u.avatar
  modal('Edit profile', (close) => {
    const preview = h('div', {})
    const paintPreview = () => { clear(preview).append(avatarEl({ ...u, avatar }, 'xl')) }
    paintPreview()
    const file = h('input', { type: 'file', id: 'avatar-file', accept: 'image/png,image/jpeg,image/webp', class: 'sr-only', on: { change: async (e) => {
      const f = e.target.files[0]; if (!f) return
      try { avatar = await toAvatar(f); paintPreview() } catch (err) { toast(err.message, 'error') }
    } } })
    const field = (name, label, control, hint) => h('div', { class: 'field' }, h('label', { for: name, text: label }), control, hint && h('p', { class: 'hint', text: hint }), h('div', { class: 'err', 'data-err': name }))
    const form = h('form', { class: 'stack gap-4', novalidate: true, on: { submit: async (e) => {
      e.preventDefault()
      const d = Object.fromEntries(new FormData(form))
      try {
        await api.put('/users/me', { display_name: d.display_name.trim() || u.username, bio: d.bio, gender: d.gender, birthday: d.birthday, region: d.region, email: d.email.trim(), avatar: avatar || null })
        close(); toast('Profile saved'); await refresh()
      } catch (ex) { if (!showFieldErrors(form, ex)) toast(ex.message, 'error') }
    } } },
      h('div', { class: 'row gap-4' }, preview, h('div', { class: 'stack gap-2' }, h('label', { class: 'btn btn-sm', for: 'avatar-file', text: 'Choose photo' }), file,
        h('button', { class: 'link-btn', type: 'button', text: 'Remove photo', on: { click: () => { avatar = null; paintPreview() } } }))),
      field('display_name', 'Display name', h('input', { class: 'input', id: 'display_name', name: 'display_name', maxlength: 40, value: u.display_name })),
      field('bio', 'Bio', h('textarea', { class: 'textarea', id: 'bio', name: 'bio', rows: 3, maxlength: 200 }, u.bio), '200 characters. Shown on your profile.'),
      field('region', 'Region', h('input', { class: 'input', id: 'region', name: 'region', maxlength: 60, value: u.region, placeholder: 'Dublin' })),
      h('div', { class: 'row gap-3 wrap' }, h('div', { style: { flex: '1 1 180px' } }, field('gender', 'Gender', h('select', { class: 'select', id: 'gender', name: 'gender' }, ...[['', 'Prefer not to say'], ['Female', 'Female'], ['Male', 'Male'], ['Non-binary', 'Non-binary']].map(([v, l]) => h('option', { value: v, selected: u.gender === v }, l))))),
        h('div', { style: { flex: '1 1 180px' } }, field('birthday', 'Birthday', h('input', { class: 'input', id: 'birthday', name: 'birthday', type: 'date', value: u.birthday })))),
      field('email', 'Email', h('input', { class: 'input', id: 'email', name: 'email', type: 'email', maxlength: 254, value: u.email, autocomplete: 'email' })),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: () => close() } }), h('button', { class: 'btn btn-primary', type: 'submit', text: 'Save changes' })))
    return form
  })
}

function editTopics() {
  const picked = new Set(me.user.topics)
  modal('Your topics', (close) => {
    const box = h('div', { class: 'row wrap gap-2' })
    const save = h('button', { class: 'btn btn-primary', type: 'button', text: 'Save topics' })
    const paint = () => {
      clear(box)
      for (const t of TOPICS) box.append(h('button', { class: 'pill', type: 'button', 'aria-pressed': String(picked.has(t)), on: { click: () => { picked.has(t) ? picked.delete(t) : picked.add(t); paint() } } }, t))
      save.disabled = picked.size === 0
    }
    save.addEventListener('click', async () => { try { await api.put('/users/me/topics', { topics: [...picked] }); close(); toast('Topics saved. Your feed will adjust.'); await refresh() } catch (e) { toast(e.message, 'error') } })
    paint()
    return h('div', { class: 'stack gap-4' }, h('p', { class: 'muted', text: 'Decisions from these topics get a boost in your For you feed.' }), box,
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: () => close() } }), save))
  })
}

function changePassword() {
  modal('Change password', (close) => {
    const field = (name, label, ac) => h('div', { class: 'field' }, h('label', { for: name, text: label }), h('input', { class: 'input', id: name, name, type: 'password', autocomplete: ac, required: true, maxlength: 72 }), h('div', { class: 'err', 'data-err': name }))
    const form = h('form', { class: 'stack gap-4', novalidate: true, on: { submit: async (e) => {
      e.preventDefault()
      const d = Object.fromEntries(new FormData(form))
      try { await api.post('/auth/password', { current: d.current, next: d.next }); close(); toast('Password changed. Other devices were signed out.') } catch (ex) { if (!showFieldErrors(form, ex)) toast(ex.message, 'error') }
    } } }, field('current', 'Current password', 'current-password'), field('next', 'New password', 'new-password'),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: () => close() } }), h('button', { class: 'btn btn-primary', type: 'submit', text: 'Change password' })))
    return form
  })
}

paintHead(); paintStats(); paintSide(); paintTabs(); loadList()
document.title = `${me.user.display_name} · This or That`
