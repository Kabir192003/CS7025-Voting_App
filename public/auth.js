document.addEventListener('DOMContentLoaded', () => {
    // login
    const loginForm = document.getElementById('loginForm')
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const user = document.getElementById('username').value
            const pass = document.getElementById('password').value

            try {
                const resp = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass })
                })
                const data = await resp.json()

                if (resp.ok) {
                    localStorage.setItem('token', data.token)
                    window.location.href = 'home.html'
                } else {
                    alert('Login failed: ' + data.message)
                }
            } catch (err) {
                console.error(err)
                alert('Error connecting to server.')
            }
        })
    }

    // register
    const regForm = document.getElementById('registerForm')
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const user = document.getElementById('new-username').value
            const email = document.getElementById('email').value
            const pass = document.getElementById('new-password').value
            const confirm = document.getElementById('confirm-password').value

            if (pass !== confirm) {
                alert('Passwords do not match')
                return
            }

            try {
                const resp = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, email, password: pass })
                })
                const data = await resp.json()

                if (resp.ok) {
                    localStorage.setItem('token', data.token)
                    window.location.href = 'home.html'
                } else {
                    alert('Registration failed: ' + data.message)
                }
            } catch (err) {
                console.error(err)
                alert('Error connecting to server.')
            }
        })
    }
})
