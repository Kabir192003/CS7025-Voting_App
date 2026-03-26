document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.feed-tab')
    const panels = document.querySelectorAll('.feed-panel')

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const name = tab.dataset.feed
            tabs.forEach(t => t.classList.remove('active-feed-tab'))
            panels.forEach(p => p.classList.remove('active-feed-panel'))
            tab.classList.add('active-feed-tab')

            const panel = document.getElementById(`${name}-panel`)
            if (panel) panel.classList.add('active-feed-panel')
            loadFeed(name)
        })
    })

    const token = localStorage.getItem('token')
    if (!token) { window.location.href = 'login.html'; return }

    const modal = document.getElementById('interestModal')
    const skipBtn = document.getElementById('skipInterestsBtn')
    const saveBtn = document.getElementById('saveInterestsBtn')
    const editBtn = document.getElementById('editInterestsBtn')

    let userInterests = []

    // check if user picked interests yet
    checkPrefs()

    async function checkPrefs() {
        try {
            const resp = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (resp.ok) {
                const user = await resp.json()
                if (!user.interests || user.interests.length === 0) {
                    if (modal) modal.classList.add('show')
                } else {
                    userInterests = user.interests
                    syncSelections(userInterests)
                    showInterestPills(user.interests)
                }
            }
        } catch (e) { console.error(e) }
        loadFeed('for-you')
    }

    function syncSelections(list) {
        document.querySelectorAll('.interest-option').forEach(opt => {
            if (list.includes(opt.textContent.trim())) {
                opt.classList.add('selected')
            } else {
                opt.classList.remove('selected')
            }
        })
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            syncSelections(userInterests)
            if (modal) modal.classList.add('show')
        })
    }

    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            modal.classList.remove('show')
            showInterestPills([])
        })
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const picked = []
            document.querySelectorAll('.interest-option.selected').forEach(opt => {
                picked.push(opt.textContent.trim())
            })

            await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ interests: picked })
            })

            userInterests = picked
            modal.classList.remove('show')
            showInterestPills(picked)
            loadFeed('for-you', true)
        })
    }

    document.querySelectorAll('.interest-option').forEach(opt => {
        opt.addEventListener('click', () => opt.classList.toggle('selected'))
    })

    function showInterestPills(list) {
        const box = document.getElementById('homeInterestList')
        if (box && list.length > 0) {
            box.innerHTML = ''
            list.forEach(name => {
                const s = document.createElement('span')
                s.textContent = name
                box.appendChild(s)
            })
        }
    }

    const endpoints = {
        'for-you': '/api/home',
        'trending': '/api/home/trending',
        'new': '/api/home',
        'unanswered': '/api/home/unanswered'
    }

    let loaded = {}

    async function loadFeed(name, force) {
        if (loaded[name] && !force) return
        const panel = document.getElementById(`${name}-panel`)
        if (!panel) return

        panel.innerHTML = '<p>Loading...</p>'
        try {
            const resp = await fetch(endpoints[name], {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (resp.ok) {
                const json = await resp.json()
                loaded[name] = true
                drawCards(panel, json.data)
            }
        } catch (e) {
            panel.innerHTML = '<p>Error loading feed.</p>'
        }
    }

    function drawCards(panel, questions) {
        if (!questions || !questions.length) {
            panel.innerHTML = '<p>No questions found.</p>'
            return
        }

        panel.innerHTML = questions.map(q => {
            const date = new Date(q.created_at).toLocaleDateString()
            const cats = (q.categories || []).map(c =>
                `<span class="meta-chip accent-${c.toLowerCase()}">${c}</span>`
            ).join('')

            const opts = q.options || []
            let total = opts.reduce((s, o) => s + o.votes, 0)
            const realTotal = total
            if (total === 0) total = 1

            const bars = opts.map(o => {
                const pct = Math.round((o.votes / total) * 100)
                return `
              <div class="vote-progress-item">
                <div class="vote-progress-label">
                  <span>${o.option_text}</span>
                  <span>${pct}% · ${o.votes} votes</span>
                </div>
                <div class="vote-progress-track">
                  <div class="vote-progress-fill" style="width: ${pct}%"></div>
                </div>
              </div>`
            }).join('')

            const btns = opts.map(o => {
                const active = q.user_voted_option_id === o.option_id ? 'active-choice' : ''
                return `<button class="vote-choice ${active}" onclick="vote(${q.question_id}, ${o.option_id}, event)">${o.option_text}</button>`
            }).join('')

            return `
            <article class="question-card-v2" onclick="window.location.href='question.html?id=${q.question_id}'">
              <div class="question-card-top">
                <div class="question-card-meta-left">
                  <span class="meta-chip neutral">${q.username}</span>
                  ${cats}
                   <span class="meta-time">${date}</span>
                </div>
                <button class="save-link-btn" type="button" onclick="event.stopPropagation()">Save</button>
              </div>
              <h3>${q.title}</h3>
              <p class="question-summary">${q.description}</p>
              <div class="vote-choice-row">${btns}</div>
              <div class="vote-progress-group">${bars}</div>
              <div class="question-footer-meta">
                <span>${q.interaction_count || 0} total interactions</span>
              </div>
            </article>`
        }).join('')
    }

    window.vote = async function (qid, optId, ev) {
        ev.stopPropagation()
        const t = localStorage.getItem('token')
        try {
            const resp = await fetch('/api/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
                body: JSON.stringify({ question_id: qid, option_id: optId })
            })
            if (resp.ok) {
                window.location.reload()
            } else {
                const err = await resp.json()
                alert(err.message)
            }
        } catch (e) { console.error(e) }
    }
})
