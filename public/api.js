/**
 * Wrapper around fetch() that automatically handles expired/invalid tokens
 * and network failures. If any API call returns 401, the user is redirected
 * to the login page. Network errors return null so callers can handle gracefully.
 */
async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token')
    if (!token) {
        window.location.href = 'login.html'
        return null
    }

    // merge auth header into whatever was passed
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    }

    try {
        const resp = await fetch(url, options)

        if (resp.status === 401) {
            localStorage.removeItem('token')
            window.location.href = 'login.html'
            return null
        }

        return resp
    } catch (err) {
        console.error('Network error:', err)
        return null
    }
}

/**
 * Clear the token when any logout link is clicked.
 */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.logout-link-v2, .logout-link').forEach(link => {
        link.addEventListener('click', (e) => {
            localStorage.removeItem('token')
        })
    })
})
