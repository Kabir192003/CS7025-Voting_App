const token = localStorage.getItem('token')
const qid = new URLSearchParams(window.location.search).get('id')
const box = document.getElementById('questionDetailsContainer')

async function showQuestion() {
    if (!qid) { box.innerHTML = '<p>No question specified.</p>'; return }

    try {
        const resp = await fetch(`/api/questions/${qid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!resp.ok) { box.innerHTML = '<p>Question not found.</p>'; return }

        const q = await resp.json()
        const date = new Date(q.created_at).toLocaleDateString()
        const cats = (q.categories || []).map(c =>
            `<span class="meta-chip accent-${c.toLowerCase()}">${c}</span>`
        ).join('')

        let total = q.options.reduce((s, o) => s + (o.votes || 0), 0)
        if (total === 0) total = 1

        const bars = q.options.map(o => {
            const v = o.votes || 0
            const pct = Math.round((v / total) * 100)
            return `
            <div class="vote-progress-item">
            <div class="vote-progress-label">
                <span>${o.option_text}</span>
                <span>${pct}% · ${v} votes</span>
            </div>
            <div class="vote-progress-track">
                <div class="vote-progress-fill" style="width: ${pct}%"></div>
            </div>
            </div>`
        }).join('')

        const btns = q.options.map(o =>
            `<button class="vote-choice" onclick="vote(${q.question_id}, ${o.option_id})">${o.option_text}</button>`
        ).join('')

        box.innerHTML = `
        <article class="question-card-v2" style="cursor: default;">
            <div class="question-card-top">
            <div class="question-card-meta-left">
                <span class="meta-chip neutral">${q.username}</span>
                ${cats}
            </div>
            <button class="save-link-btn" type="button">Save</button>
            </div>

            <h2>${q.title}</h2>
            <p class="question-summary" style="margin-bottom: 24px;">${q.description}</p>

            <div class="vote-choice-row" style="margin-bottom: 24px;">${btns}</div>
            <div class="vote-progress-group">${bars}</div>

            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e1e4e8;">
            <h4>Comments</h4>

            <form id="commentForm" style="display:flex; gap:12px; margin-bottom: 24px;">
                <input type="text" id="commentInput" placeholder="Add a comment..." style="flex:1; border: 1px solid #e1e4e8; border-radius: 8px; padding: 12px; font-size: 15px;" required />
                <button type="submit" class="submit-question-btn" style="width: auto; padding: 0 24px; white-space: nowrap;">Post Comment</button>
            </form>

            <div id="commentsContainer">
                <div class="empty-state-line">Loading comments...</div>
            </div>
        </article>`

        document.getElementById('commentForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            const txt = document.getElementById('commentInput').value.trim()
            if (!txt) return

            try {
                const r = await fetch('/api/responses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ question_id: qid, comment_text: txt })
                })
                if (r.ok) showQuestion()
                else {
                    const err = await r.json()
                    alert(err.message)
                }
            } catch (err) { console.error(err) }
        })

        loadComments()
    } catch (err) {
        console.error(err)
        box.innerHTML = '<p>Failed to load question.</p>'
    }
}

async function loadComments() {
    const section = document.getElementById('commentsContainer')
    if (!section) return

    try {
        const resp = await fetch(`/api/responses/${qid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!resp.ok) {
            section.innerHTML = '<div class="empty-state-line">Failed to load comments</div>'
            return
        }

        const all = await resp.json()
        const comments = all.filter(c => c.comment_text && c.comment_text.trim() !== '')

        if (!comments.length) {
            section.innerHTML = '<div class="empty-state-line">No comments yet.</div>'
            return
        }

        section.innerHTML = comments.map(c => `
            <div style="margin-bottom: 16px; padding: 12px; background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0;">
                <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px; color: #111827;">${c.username}</div>
                <div style="font-size: 15px; color: #4B5563;">${c.comment_text}</div>
            </div>
        `).join('')
    } catch (err) { console.error(err) }
}

window.vote = async function (questionId, optionId) {
    try {
        const resp = await fetch('/api/responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ question_id: questionId, option_id: optionId })
        })
        if (resp.ok) showQuestion()
        else {
            const err = await resp.json()
            alert(err.message)
        }
    } catch (e) { console.error(e) }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!token) { window.location.href = 'login.html'; return }
    showQuestion()
})
