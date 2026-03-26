const tabs = document.querySelectorAll('.dashboard-tab')
const mainPanels = document.querySelectorAll('.tab-panel')
const sidePanels = document.querySelectorAll('.side-panel-group')

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const name = tab.dataset.tab
        tabs.forEach(t => t.classList.remove('active-tab'))
        mainPanels.forEach(p => p.classList.remove('active-panel'))
        sidePanels.forEach(p => p.classList.remove('active-panel'))

        tab.classList.add('active-tab')
        const main = document.getElementById(`${name}-panel`)
        const side = document.getElementById(`${name}-side`)
        if (main) main.classList.add('active-panel')
        if (side) side.classList.add('active-panel')
    })
})

const defaults = {
    avatarData: '',
    displayName: 'Kelly',
    gender: '',
    birthday: '',
    region: '',
    userId: 'TT-2025-00421',
    bio: 'Curious about everyday decisions, good design, and helping people choose more clearly.',
    interests: ['Technology', 'Food', 'Travel', 'Design']
}

let profile = null

function getProfile() { return profile || defaults }

async function saveProfile(data) {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
        await fetch('/api/users/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        })
    } catch (err) {
        console.error('save failed', err)
    }
}

function renderProfile() {
    const data = getProfile()

    const avatar = document.getElementById('profileAvatar')
    const nameEl = document.getElementById('profileDisplayName')
    const bioEl = document.getElementById('profileBioText')
    const interestRow = document.getElementById('profileInterestRow')
    const prefList = document.getElementById('profilePreferenceList')
    const factsEl = document.getElementById('profileFactsList')

    const qStat = document.getElementById('statQuestionsPosted')
    const aStat = document.getElementById('statAnswersContributed')
    const vStat = document.getElementById('statVotesReceived')

    if (qStat) qStat.textContent = data.questionsPosted || 0
    if (aStat) aStat.textContent = data.answersContributed || 0
    if (vStat) vStat.textContent = data.votesReceived || 0

    if (avatar) {
        if (data.avatarData && data.avatarData.trim() !== '') {
            avatar.innerHTML = `<img src="${data.avatarData}" alt="Avatar" class="profile-avatar-image">`
        } else {
            avatar.textContent = (data.displayName || 'Kelly').charAt(0).toUpperCase()
        }
    }

    if (nameEl) nameEl.textContent = data.displayName || 'Kelly'
    if (bioEl) bioEl.textContent = data.bio || defaults.bio

    // interests chips
    if (interestRow) {
        interestRow.innerHTML = ''
        data.interests.forEach(i => {
            const s = document.createElement('span')
            s.textContent = i
            interestRow.appendChild(s)
        })
    }

    if (prefList) {
        prefList.innerHTML = ''
        data.interests.forEach(i => {
            const s = document.createElement('span')
            s.textContent = i
            prefList.appendChild(s)
        })
    }

    if (factsEl) {
        factsEl.innerHTML = `
            <div><span>Gender</span><strong>${data.gender || 'Not set'}</strong></div>
            <div><span>Birthday</span><strong>${data.birthday || 'Not set'}</strong></div>
            <div><span>Region</span><strong>${data.region || 'Not set'}</strong></div>
             <div><span>ID</span><strong>${data.userId || 'TT-2025-00421'}</strong></div>
        `
    }
}

// edit profile stuff
const editForm = document.getElementById('editProfileForm')
const avatarInput = document.getElementById('avatarFileInput')
const nameIn = document.getElementById('displayNameInput')
const genderIn = document.getElementById('genderInput')
const bdayIn = document.getElementById('birthdayInput')
const regionIn = document.getElementById('ipInput')
const bioIn = document.getElementById('bioInput')
const idDisplay = document.getElementById('userIdDisplay')

const prevImg = document.getElementById('previewAvatarImage')
const prevFallback = document.getElementById('previewAvatarFallback')
const prevImgSide = document.getElementById('previewAvatarImageSide')
const prevFallbackSide = document.getElementById('previewAvatarFallbackSide')

const prevName = document.getElementById('previewDisplayName')
const prevGender = document.getElementById('previewGender')
const prevBday = document.getElementById('previewBirthday')
const prevRegion = document.getElementById('previewIP')
const prevId = document.getElementById('previewUserId')
const prevBio = document.getElementById('previewBio')
const prevInterests = document.getElementById('previewInterestRow')

const interestBtns = document.querySelectorAll('.edit-interest-option')

let avatarData = ''

function setAvatar(data, name) {
    const initial = (name || 'Kelly').charAt(0).toUpperCase()

    if (data && data.trim() !== '') {
        if (prevImg) { prevImg.src = data; prevImg.style.display = 'block' }
        if (prevFallback) prevFallback.style.display = 'none'
        if (prevImgSide) { prevImgSide.src = data; prevImgSide.style.display = 'block' }
        if (prevFallbackSide) prevFallbackSide.style.display = 'none'
    } else {
        if (prevImg) prevImg.style.display = 'none'
        if (prevFallback) { prevFallback.style.display = 'flex'; prevFallback.textContent = initial }
        if (prevImgSide) prevImgSide.style.display = 'none'
        if (prevFallbackSide) { prevFallbackSide.style.display = 'flex'; prevFallbackSide.textContent = initial }
    }
}

function refreshPreview() {
    if (!prevName) return

    const picked = Array.from(document.querySelectorAll('.edit-interest-option.selected'))
        .map(b => b.textContent.trim())
    const name = nameIn.value.trim() || 'Kelly'

    setAvatar(avatarData, name)

    prevName.textContent = name
    prevGender.textContent = genderIn.value || 'Gender not set'
    prevBday.textContent = bdayIn.value || 'Birthday not set'
    prevRegion.textContent = regionIn.value.trim() || 'Region not set'
    prevId.textContent = `ID: ${idDisplay.textContent}`
    prevBio.textContent = bioIn.value.trim() || defaults.bio

    prevInterests.innerHTML = ''
        ; (picked.length ? picked : defaults.interests).forEach(i => {
            const s = document.createElement('span')
            s.textContent = i
            prevInterests.appendChild(s)
        })
}

function setupEditPage() {
    if (!editForm) return
    const data = getProfile()

    avatarData = data.avatarData || ''
    nameIn.value = data.displayName || 'Kelly'
    genderIn.value = data.gender || ''
    bdayIn.value = data.birthday || ''
    regionIn.value = data.region || ''
    bioIn.value = data.bio || defaults.bio
    idDisplay.textContent = data.userId || 'TT-2025-00421'

    interestBtns.forEach(btn => {
        if (data.interests.includes(btn.textContent.trim())) btn.classList.add('selected')
    })

    refreshPreview()

        ;[nameIn, genderIn, bdayIn, regionIn, bioIn].forEach(inp => {
            inp.addEventListener('input', refreshPreview)
            inp.addEventListener('change', refreshPreview)
        })

    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => { avatarData = ev.target.result; refreshPreview() }
            reader.readAsDataURL(file)
        })
    }

    interestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected')
            refreshPreview()
        })
    })

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const picked = Array.from(document.querySelectorAll('.edit-interest-option.selected'))
            .map(b => b.textContent.trim())

        const updated = {
            avatarData: avatarData,
            displayName: nameIn.value.trim() || 'Kelly',
            gender: genderIn.value || '',
            birthday: bdayIn.value || '',
            region: regionIn.value.trim() || '',
            userId: idDisplay.textContent || 'TT-2025-00421',
            bio: bioIn.value.trim() || defaults.bio,
            interests: picked.length ? picked : defaults.interests
        }

        await saveProfile(updated)
        localStorage.setItem('selectedInterests', JSON.stringify(updated.interests))
        window.location.href = 'profile.html'
    })
}

async function init() {
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = 'login.html'; return }

    try {
        const resp = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (resp.ok) {
            const d = await resp.json()
            profile = {
                avatarData: d.avatarData || '',
                displayName: d.displayName || d.username,
                gender: d.gender || '',
                birthday: d.birthday || '',
                region: d.region || '',
                userId: `TT-${d.user_id}`,
                bio: d.bio || defaults.bio,
                interests: d.interests && d.interests.length ? d.interests : defaults.interests,
                questionsPosted: d.questionsPosted,
                answersContributed: d.answersContributed,
                votesReceived: d.votesReceived
            }
        }
    } catch (err) {
        console.error('profile load failed', err)
    }

    renderProfile()
    setupEditPage()
    loadActivity(token)
}

function makeCards(questions, label) {
    if (!questions || !questions.length) return '<p>No activity yet.</p>'

    return questions.map(q => {
        const date = new Date(q.created_at).toLocaleDateString()
        const cats = (q.categories || []).map(c =>
            `<span class="meta-chip accent-${c.toLowerCase()}">${c}</span>`
        ).join('')

        let total = q.options.reduce((s, o) => s + (o.votes || 0), 0)
        if (total === 0) total = 1

        const bars = q.options.map(o => {
            const pct = Math.round(((o.votes || 0) / total) * 100)
            return `
            <div class="vote-progress-item">
              <div class="vote-progress-label">
                <span>${o.option_text}</span>
                 <span>${pct}% · ${o.votes || 0} votes</span>
              </div>
              <div class="vote-progress-track">
                <div class="vote-progress-fill" style="width:${pct}%"></div>
              </div>
            </div>`
        }).join('')

        return `
        <article class="profile-card-v2" onclick="window.location.href='question.html?id=${q.question_id}'" style="cursor:pointer;">
            <div class="profile-card-top">
                <div class="profile-card-tags">
                <span class="meta-chip neutral">${label}</span>
                ${cats}
                </div>
                <span class="profile-card-time">${date}</span>
            </div>
            <h3>${q.title}</h3>
            <p>${q.description}</p>
            <div class="vote-progress-group">${bars}</div>
            <div class="profile-card-footer">
              <span>${q.interaction_count} total interactions</span>
            </div>
        </article>`
    }).join('')
}

async function loadActivity(token) {
    try {
        const qResp = await fetch('/api/users/me/questions', { headers: { 'Authorization': `Bearer ${token}` } })
        if (qResp.ok) {
            const qs = await qResp.json()
            const el = document.getElementById('questions-panel')
            if (el) el.innerHTML = makeCards(qs, 'My Question')
        }

        const aResp = await fetch('/api/users/me/answers', { headers: { 'Authorization': `Bearer ${token}` } })
        if (aResp.ok) {
            const ans = await aResp.json()
            const el = document.getElementById('answers-panel')
            if (el) el.innerHTML = makeCards(ans, 'My Answer')
        }
    } catch (e) { console.error(e) }
}

init()
