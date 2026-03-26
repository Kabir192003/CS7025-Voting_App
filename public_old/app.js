const API_URL = '/api';

// --- Local Storage Helpers ---
const getToken = () => localStorage.getItem('token');
const setToken = (t) => localStorage.setItem('token', t);
const logout = () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
};

// --- Core API Fetcher ---
const fetchApi = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'API Error');
    return data;
};

// --- DOM Utilities ---
const $ = (id) => document.getElementById(id);

// --- Auth Views ---
async function login() {
    try {
        const data = await fetchApi('/auth/login', 'POST', {
            username: $('username').value,
            password: $('password').value
        });
        setToken(data.token);
        window.location.href = 'home.html';
    } catch (err) {
        $('msg').innerText = err.message;
    }
}

async function signup() {
    try {
        await fetchApi('/auth/signup', 'POST', {
            username: $('username').value,
            password: $('password').value
        });
        $('msg').innerText = "Signup success! Please login.";
    } catch (err) {
        $('msg').innerText = err.message;
    }
}

// --- Feed View ---
async function loadFeed(type, tabElement) {
    if (tabElement) {
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        tabElement.classList.add('active');
    }

    if (!getToken()) return window.location.href = 'index.html';

    const endpoints = {
        personalised: '/home/personalised',
        trending: '/home/trending',
        unanswered: '/home/unanswered'
    };

    try {
        const data = await fetchApi(endpoints[type]);
        const container = $('feed-content');
        container.innerHTML = '';

        if (!data.data.length) {
            container.innerHTML = '<p class="text-muted text-center p-xl">No questions to display. Try adjusting your preferences!</p>';
            return;
        }

        data.data.forEach(q => {
            const card = document.createElement('div');
            card.className = 'question-card';
            const responses = q.interaction_count || 0;

            card.innerHTML = `
        <div class="flex-between start">
          <div class="flex-1">
            <h3><a href="question.html?id=${q.question_id}">${q.title}</a></h3>
            <small>by ${q.username} | ${new Date(q.created_at).toLocaleDateString()}</small>
          </div>
          <div class="response-badge">${responses} ${responses === 1 ? 'response' : 'responses'}</div>
        </div>
      `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Feed error:', err);
    }
}

// --- Preferences ---
const CATEGORIES = [
    { id: 52, name: 'Technology' },
    { id: 53, name: 'Health' },
    { id: 54, name: 'Finance' },
    { id: 55, name: 'Sports' },
    { id: 56, name: 'General' },
    { id: 57, name: 'Science' }
];

let selectedCategories = new Set();

async function checkUserPreferences() {
    try {
        const user = await fetchApi('/users/me');
        return user.preferences && user.preferences.length > 0;
    } catch {
        return false;
    }
}

function showPrefs() {
    const container = $('pref-chips');
    container.innerHTML = '';
    selectedCategories.clear();

    CATEGORIES.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerText = cat.name;
        chip.onclick = () => {
            if (selectedCategories.has(cat.id)) {
                selectedCategories.delete(cat.id);
                chip.classList.remove('selected');
            } else {
                selectedCategories.add(cat.id);
                chip.classList.add('selected');
            }
        };
        container.appendChild(chip);
    });

    $('prefs-modal').showModal();
}

async function savePrefs() {
    const categories = Array.from(selectedCategories);

    if (categories.length === 0 && !confirm("No categories selected. Are you sure?")) {
        return;
    }

    try {
        await fetchApi('/preferences', 'POST', { categories });
        $('prefs-modal').close();
        alert("Preferences saved successfully!");
        loadFeed('personalised', document.querySelector('.tabs button'));
    } catch {
        alert("Failed to save preferences.");
    }
}

// --- Question Details View ---
async function loadQuestionDetails(id) {
    try {
        const q = await fetchApi(`/questions/${id}`);
        $('q-title').innerText = q.title;
        $('q-desc').innerText = q.description;

        const responses = await fetchApi(`/responses/${id}`);
        const count = responses.length;

        $('q-meta').innerText = `Posted by ${q.username} in ${q.categories.join(', ')} | ${count} ${count === 1 ? 'response' : 'responses'}`;

        const voteSection = $('vote-section');
        voteSection.innerHTML = '';

        if (q.options.length > 0) {
            const instr = document.createElement('p');
            instr.className = 'text-muted mb-md';
            instr.innerText = "Select an option to vote:";
            voteSection.appendChild(instr);
        }

        q.options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'vote-option-label';

            label.onmouseover = () => { label.style.background = "#F8FAFC"; };
            label.onmouseout = () => { if (!label.querySelector('input').checked) label.style.background = "transparent"; };

            const input = document.createElement('input');
            input.type = "radio";
            input.name = "vote_opt";
            input.value = opt.option_id;
            input.className = "mr-sm w-auto";

            input.onchange = () => {
                document.querySelectorAll('.vote-option-label').forEach(l => l.style.background = "transparent");
                label.style.background = "#EFF6FF";
            };

            label.appendChild(input);
            label.appendChild(document.createTextNode(opt.option_text));
            voteSection.appendChild(label);
        });

        $('comment-section').style.display = q.comments_enabled ? 'block' : 'none';

        const myVote = await loadResponses(id);
        if (myVote) {
            const btn = document.querySelector('button[onclick="submitVote()"]');
            if (btn) btn.style.display = 'none';

            document.querySelectorAll('input[name="vote_opt"]').forEach(input => {
                input.disabled = true;
                if (input.value == myVote.option_id) {
                    input.checked = true;
                    input.parentElement.classList.add('voted-option');
                }
            });

            const msg = document.createElement('div');
            msg.className = 'alert success mt-md';
            msg.innerHTML = `✅ You have already voted on this question.`;
            voteSection.appendChild(msg);
        }
    } catch (err) {
        console.error('Error loading question:', err);
    }
}

async function loadResponses(qId) {
    try {
        const list = await fetchApi(`/responses/${qId}`);
        const container = $('responses-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<p class="text-muted">No responses yet.</p>';
            return null;
        }

        let currentUserId = null;
        try {
            const user = await fetchApi('/users/me');
            currentUserId = user.user_id;
        } catch { }

        let myVote = null;

        list.forEach(r => {
            if (r.user_id === currentUserId) myVote = r;

            const item = document.createElement('div');
            item.className = 'response-item p-sm border-b';

            let html = `<strong>${r.username}</strong> <span class="text-muted text-sm">${new Date(r.created_at).toLocaleDateString()}</span>`;
            if (r.comment_text) html += `<p class="mt-sm">${r.comment_text}</p>`;

            item.innerHTML = html;
            container.appendChild(item);
        });

        return myVote;
    } catch {
        return null;
    }
}

// --- Voting & Asking ---
async function submitVote() {
    const qId = new URLSearchParams(window.location.search).get('id');
    const opt = document.querySelector('input[name="vote_opt"]:checked');
    const comment = $('comment-text').value;

    if (!opt && !comment) return alert("Select an option or write a comment");

    try {
        await fetchApi('/responses', 'POST', {
            question_id: qId,
            option_id: opt ? opt.value : null,
            comment_text: comment
        });
        alert("✅ Response submitted successfully!");
        location.reload();
    } catch (err) {
        alert(err.message || "Failed to submit response");
    }
}

function addOption() {
    const input = document.createElement('input');
    input.type = "text";
    input.className = "opt-input";
    input.placeholder = "New Option";
    $('options-list').appendChild(input);
}

function loadCategoriesForSelect() {
    const select = $('q-cat');
    if (!select) return;

    CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.innerText = cat.name;
        select.appendChild(opt);
    });
}

async function postQuestion() {
    const options = Array.from(document.querySelectorAll('.opt-input'))
        .map(i => i.value)
        .filter(Boolean);

    if (options.length < 2) return alert("Need at least 2 options");

    try {
        await fetchApi('/questions', 'POST', {
            title: $('q-title').value,
            description: $('q-desc').value,
            categories: [parseInt($('q-cat').value)],
            options,
            is_anonymous: $('q-anon').checked,
            comments_enabled: $('q-comments').checked
        });
        alert("Created!");
        window.location.href = 'home.html';
    } catch (err) {
        alert("Failed to create question");
    }
}

// --- Profile Views ---
async function loadProfile() {
    try {
        const user = await fetchApi('/users/me');
        $('profile-name').innerText = user.username;
        $('profile-meta').innerText = `Member since ${new Date(user.created_at).toLocaleDateString()}`;
    } catch {
        $('profile-name').innerText = "Error loading profile";
    }
}

async function loadUserQuestions() {
    try {
        const list = await fetchApi('/users/me/questions');
        const container = $('my-questions-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = "<p>You haven't asked any questions yet.</p>";
            return;
        }

        list.forEach(q => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.innerHTML = `
        <div class="flex-between">
          <h3><a href="question.html?id=${q.question_id}">${q.title}</a></h3>
          <small>${q.is_anonymous ? '(Posted anonymously)' : ''}</small>
        </div>
        <p>${q.description || ''}</p>
        <small>Posted on ${new Date(q.created_at).toLocaleDateString()} | ${q.interaction_count} responses</small>
      `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadUserAnswers() {
    try {
        const list = await fetchApi('/users/me/answers');
        const container = $('my-answers-list');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = "<p>You haven't answered any questions yet.</p>";
            return;
        }

        list.forEach(q => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.innerHTML = `
        <div class="flex-between">
          <h3><a href="question.html?id=${q.question_id}">${q.title}</a></h3>
          <small>Answered</small>
        </div>
        <p>${q.description || ''}</p>
        <small>Original details: ${q.interaction_count} total responses</small>
      `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}
