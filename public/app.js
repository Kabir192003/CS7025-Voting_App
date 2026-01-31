const API_URL = '/api';

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function logout() { localStorage.removeItem('token'); window.location.href = 'index.html'; }

async function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (res.ok) {
            setToken(data.token);
            // Check if user has prefs - simplistic check, if new user we might want to redirect to prefs page
            // For now just go home
            window.location.href = 'home.html';
        } else {
            document.getElementById('msg').innerText = data.message;
        }
    } catch (e) { console.error(e); }
}

async function signup() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    try {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('msg').innerText = "Signup success! Please login.";
        } else {
            document.getElementById('msg').innerText = data.message;
        }
    } catch (e) { console.error(e); }
}

async function loadFeed(type, tab) {
    if (tab) {
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
    }

    const token = getToken();
    if (!token) return window.location.href = 'index.html';

    const endpoint = type === 'personalised' ? '/api/home/personalised' :
        type === 'trending' ? '/api/home/trending' : '/api/home/unanswered';

    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();

    const cont = document.getElementById('feed-content');
    cont.innerHTML = '';

    if (data.data.length === 0) {
        cont.innerHTML = '<p>No questions to display. Try adjusting your preferences!</p>';
        return;
    }

    data.data.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question-card';
        const responseCount = q.interaction_count || 0;
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h3><a href="question.html?id=${q.question_id}">${q.title}</a></h3>
                    <small>by ${q.username} | ${new Date(q.created_at).toLocaleDateString()}</small>
                </div>
                <div class="response-badge">${responseCount} ${responseCount === 1 ? 'response' : 'responses'}</div>
            </div>
        `;
        cont.appendChild(div);
    });
}

// Updated categories to match database
const CATEGORIES = [
    { id: 52, name: 'Technology' },
    { id: 53, name: 'Health' },
    { id: 54, name: 'Finance' },
    { id: 55, name: 'Sports' },
    { id: 56, name: 'General' },
    { id: 57, name: 'Science' }
];

let selectedCategories = new Set();

// Check if user has preferences set
async function checkUserPreferences() {
    try {
        const res = await fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (!res.ok) return false;

        const data = await res.json();
        // If user has preferences, return true
        return data.preferences && data.preferences.length > 0;
    } catch (e) {
        console.error('Error checking preferences:', e);
        return false;
    }
}

function showPrefs() {
    const modal = document.getElementById('prefs-modal');
    const chipContainer = document.getElementById('pref-chips');
    chipContainer.innerHTML = '';
    selectedCategories.clear();

    // Ideally, fetch current user preferences here to pre-select
    // For now we start fresh or simpler: just show all

    CATEGORIES.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerText = cat.name;
        chip.dataset.id = cat.id;
        chip.onclick = () => toggleCategory(chip, cat.id);
        chipContainer.appendChild(chip);
    });

    modal.showModal();
}

function toggleCategory(chip, id) {
    if (selectedCategories.has(id)) {
        selectedCategories.delete(id);
        chip.classList.remove('selected');
    } else {
        selectedCategories.add(id);
        chip.classList.add('selected');
    }
}

async function savePrefs() {
    const catList = Array.from(selectedCategories);

    if (catList.length === 0) {
        if (!confirm("No categories selected. Are you sure?")) return;
    }

    try {
        await fetch(`${API_URL}/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ categories: catList })
        });

        document.getElementById('prefs-modal').close();
        alert("Preferences saved successfully!");
        loadFeed('personalised', document.querySelector('.tabs button')); // Reload feed
    } catch (e) {
        console.error(e);
        alert("Failed to save preferences.");
    }
}

async function loadQuestionDetails(id) {
    const res = await fetch(`${API_URL}/questions/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const q = await res.json();

    document.getElementById('q-title').innerText = q.title;
    document.getElementById('q-desc').innerText = q.description;

    // Count responses for this question
    const responseRes = await fetch(`${API_URL}/responses/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const responses = await responseRes.json();
    const responseCount = responses.length;

    document.getElementById('q-meta').innerText = `Posted by ${q.username} in ${q.categories.join(', ')} | ${responseCount} ${responseCount === 1 ? 'response' : 'responses'}`;


    // Options
    const vSec = document.getElementById('vote-section');
    vSec.innerHTML = '';

    // Add nice header instruction
    if (q.options.length > 0) {
        const instr = document.createElement('p');
        instr.style.color = 'var(--text-muted)';
        instr.style.marginBottom = '1rem';
        instr.innerText = "Select an option to vote:";
        vSec.appendChild(instr);
    }

    q.options.forEach(opt => {
        const label = document.createElement('label');
        label.className = 'vote-option-label'; // We'll add some CSS for this
        label.style.display = "block";
        label.style.padding = "10px";
        label.style.border = "1px solid var(--border-color)";
        label.style.borderRadius = "var(--radius-md)";
        label.style.marginBottom = "5px";
        label.style.cursor = "pointer";

        // Hover effect helper
        label.onmouseover = () => label.style.background = "#F8FAFC";
        label.onmouseout = () => { if (label.querySelector('input').checked) return; label.style.background = "transparent"; };

        const input = document.createElement('input');
        input.type = "radio";
        input.name = "vote_opt";
        input.value = opt.option_id;
        input.style.marginRight = "10px";
        input.style.width = "auto";

        input.onchange = () => {
            document.querySelectorAll('.vote-option-label').forEach(l => l.style.background = "transparent");
            label.style.background = "#EFF6FF"; // light blue
        };

        label.appendChild(input);
        label.appendChild(document.createTextNode(opt.option_text));
        vSec.appendChild(label);
    });

    // Check comments enabled
    const commentArea = document.getElementById('comment-section');
    if (!q.comments_enabled) {
        commentArea.style.display = 'none';
    } else {
        commentArea.style.display = 'block';
    }

    // Load responses and check if WE have voted
    const myVote = await loadResponses(id);

    if (myVote) {
        // User has voted
        const submitBtn = document.querySelector('button[onclick="submitVote()"]');
        if (submitBtn) submitBtn.style.display = 'none';

        // Disable all inputs
        document.querySelectorAll('input[name="vote_opt"]').forEach(i => {
            i.disabled = true;
            if (i.value == myVote.option_id) {
                i.checked = true;
                i.parentElement.style.background = "#EFF6FF";
                i.parentElement.style.borderColor = "var(--primary)";
                i.parentElement.style.fontWeight = "bold";
            }
        });

        // Add message
        const votedMsg = document.createElement('div');
        votedMsg.className = 'alert success';
        votedMsg.style.marginTop = '1rem';
        votedMsg.innerHTML = `✅ You have already voted on this question.`;
        vSec.appendChild(votedMsg);
    }
}

async function loadResponses(qId) {
    const res = await fetch(`${API_URL}/responses/${qId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const list = await res.json();
    const div = document.getElementById('responses-list');
    div.innerHTML = '';

    if (list.length === 0) {
        div.innerHTML = '<p style="color: var(--text-muted);">No responses yet.</p>';
        return null; // No one voted
    }

    // Get current user ID to check if we voted
    let currentUserId = null;
    try {
        const userRes = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (userRes.ok) {
            const userData = await userRes.json();
            currentUserId = userData.user_id;
        }
    } catch (e) { }

    let myVote = null;

    list.forEach(r => {
        if (r.user_id === currentUserId) {
            myVote = r;
        }

        const item = document.createElement('div');
        item.className = 'response-item';
        item.style.padding = '10px';
        item.style.borderBottom = '1px solid var(--border-color)';

        let html = `<strong>${r.username}</strong> <span style="color:var(--text-muted); font-size:0.8rem;">${new Date(r.created_at).toLocaleDateString()}</span>`;

        // Match option text if we have options locally or just verify logic
        // We don't have option text in response list, but that's fine for now

        if (r.comment_text) {
            html += `<p style="margin-top:5px;">${r.comment_text}</p>`;
        }
        item.innerHTML = html;
        div.appendChild(item);
    });

    return myVote;
}

async function submitVote() {
    const qId = new URLSearchParams(window.location.search).get('id');
    const opt = document.querySelector('input[name="vote_opt"]:checked');
    const comment = document.getElementById('comment-text').value;

    if (!opt && !comment) return alert("Select an option or write a comment");

    const res = await fetch(`${API_URL}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
            question_id: qId,
            option_id: opt ? opt.value : null,
            comment_text: comment
        })
    });

    const data = await res.json();
    if (!res.ok) {
        alert(data.message || "Failed to submit response");
        return;
    }

    alert("✅ Response submitted successfully!");
    location.reload();
}

function addOption() {
    const d = document.getElementById('options-list');
    const i = document.createElement('input');
    i.type = "text"; i.className = "opt-input"; i.placeholder = "New Option";
    d.appendChild(i);
}

async function loadCategoriesForSelect() {
    // Use the shared constant or fetch from API
    const sel = document.getElementById('q-cat');
    if (!sel) return; // Guard for pages without this element

    CATEGORIES.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.innerText = c.name;
        sel.appendChild(o);
    });
}

async function postQuestion() {
    const t = document.getElementById('q-title').value;
    const d = document.getElementById('q-desc').value;
    const cat = document.getElementById('q-cat').value;
    const opts = Array.from(document.querySelectorAll('.opt-input')).map(i => i.value).filter(v => v);

    // New Checkboxes
    const isAnon = document.getElementById('q-anon').checked;
    const allowComments = document.getElementById('q-comments').checked;

    if (opts.length < 2) return alert("Need at least 2 options");

    await fetch(`${API_URL}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
            title: t,
            description: d,
            categories: [parseInt(cat)],
            options: opts,
            is_anonymous: isAnon,
            comments_enabled: allowComments
        })
    });
    alert("Created!");
    window.location.href = 'home.html';
}

async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!res.ok) throw new Error("Failed to load profile");

        const user = await res.json();
        document.getElementById('profile-name').innerText = user.username;
        document.getElementById('profile-meta').innerText = `Member since ${new Date(user.created_at).toLocaleDateString()}`;
    } catch (e) {
        console.error(e);
        document.getElementById('profile-name').innerText = "Error loading profile";
    }
}

async function loadUserQuestions() {
    try {
        const res = await fetch(`${API_URL}/users/me/questions`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const list = await res.json();

        const cont = document.getElementById('my-questions-list');
        cont.innerHTML = '';

        if (list.length === 0) {
            cont.innerHTML = '<p>You haven\'t asked any questions yet.</p>';
            return;
        }

        list.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-card';
            div.innerHTML = `
              <div style="display:flex; justify-content:space-between;">
                <h3><a href="question.html?id=${q.question_id}">${q.title}</a></h3>
                <small>${q.is_anonymous ? '(Posted anonymously)' : ''}</small>
              </div>
              <p>${q.description || ''}</p>
              <small>Posted on ${new Date(q.created_at).toLocaleDateString()} | ${q.interaction_count} responses</small>
            `;
            cont.appendChild(div);
        });

    } catch (e) {
        console.error(e);
    }
}

async function loadUserAnswers() {
    try {
        const res = await fetch(`${API_URL}/users/me/answers`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const list = await res.json();

        const cont = document.getElementById('my-answers-list');
        cont.innerHTML = '';

        if (list.length === 0) {
            cont.innerHTML = '<p>You haven\'t answered any questions yet.</p>';
            return;
        }

        list.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-card';
            div.innerHTML = `
              <div style="display:flex; justify-content:space-between;">
                <h3><a href="question.html?id=${q.question_id}">${q.title}</a></h3>
                <small>Answered</small>
              </div>
              <p>${q.description || ''}</p>
              <small>Original details: ${q.interaction_count} total responses</small>
            `;
            cont.appendChild(div);
        });

    } catch (e) {
        console.error(e);
    }
}
