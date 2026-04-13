require('dotenv').config()
const express = require('express')
const path = require('path')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css')
        if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript')
        if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html')
    }
}))

// routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/questions', require('./routes/questionRoutes'))
app.use('/api/responses', require('./routes/responseRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/preferences', require('./routes/preferenceRoutes'))
app.use('/api/home', require('./routes/homeRoutes'))

app.get('/', (req, res) => res.redirect('/home.html'))

// catch-all for unknown API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' })
})

// global error handler — prevents server crash on unhandled errors
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack || err)
    res.status(500).json({ message: 'Internal server error' })
})

// catch unhandled rejections so the server never crashes
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err)
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('server up on port ' + port))
