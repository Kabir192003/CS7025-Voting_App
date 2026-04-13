const addBtn = document.getElementById('addOptionBtn')
const optBox = document.getElementById('optionsContainer')
const form = document.getElementById('questionForm')
const titleIn = document.getElementById('questionTitle')
const descIn = document.getElementById('questionDescription')
const prevTitle = document.getElementById('previewTitle')
const prevDesc = document.getElementById('previewDescription')
const prevOpts = document.getElementById('previewOptions')

let numOptions = 2

function refreshPreview() {
    prevTitle.textContent = titleIn.value.trim() || 'Your question will appear here'
    prevDesc.textContent = descIn.value.trim() || 'Add a title and a short description to preview your post.'

    prevOpts.innerHTML = ''
    document.querySelectorAll('input[name="option[]"]').forEach((inp, i) => {
        const pill = document.createElement('span')
        pill.className = 'preview-option-pill'
        pill.textContent = inp.value.trim() || `Option ${i + 1}`
        prevOpts.appendChild(pill)
    })
}

addBtn.addEventListener('click', () => {
    numOptions++
    const row = document.createElement('div')
    row.className = 'option-input-row'
    row.innerHTML = `<input type="text" name="option[]" placeholder="Option ${numOptions}">`

    optBox.appendChild(row)
    row.querySelector('input').addEventListener('input', refreshPreview)
    refreshPreview()
})

titleIn.addEventListener('input', refreshPreview)
descIn.addEventListener('input', refreshPreview)
document.querySelectorAll('input[name="option[]"]').forEach(inp => {
    inp.addEventListener('input', refreshPreview)
})

form.addEventListener('reset', () => {
    setTimeout(() => {
        const rows = document.querySelectorAll('.option-input-row')
        rows.forEach((r, i) => { if (i > 1) r.remove() })
        numOptions = 2
        refreshPreview()
    }, 0)
})

form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const title = titleIn.value.trim()
    const desc = descIn.value.trim()
    const cat = document.getElementById('questionCategory').value
    const anon = document.getElementById('anonymousCheck').checked
    const allowComments = document.getElementById('allowCommentsCheck').checked

    const opts = Array.from(document.querySelectorAll('input[name="option[]"]'))
        .map(inp => inp.value.trim())
        .filter(v => v !== '')

    if (!title || opts.length < 2) {
        alert('Please provide a title and at least 2 options.')
        return
    }

    const token = localStorage.getItem('token')
    if (!token) { window.location.href = 'login.html'; return }

    try {
        const resp = await apiFetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title, description: desc,
                categories: cat ? [cat] : [],
                options: opts,
                is_anonymous: anon,
                comments_enabled: allowComments
            })
        })
        if (!resp) return

        if (resp.ok) {
            window.location.href = 'home.html'
        } else {
            const err = await resp.json()
            alert('Error: ' + err.message)
        }
    } catch (e) {
        alert('Failed to connect to server.')
    }
})
