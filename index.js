require('dotenv').config()
const express = require('express')

const app = express()
app.use(express.json())
app.use(express.static('public'))

// routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/questions', require('./routes/questionRoutes'))
app.use('/api/responses', require('./routes/responseRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/preferences', require('./routes/preferenceRoutes'))
app.use('/api/home', require('./routes/homeRoutes'))

app.get('/', (req, res) => res.send('Server is running'))

const port = process.env.PORT || 4000
app.listen(port, () => console.log('server up on port ' + port))
