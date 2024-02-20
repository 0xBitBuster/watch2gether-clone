const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const dotenv = require("dotenv")
const compression = require("compression")

const secureHeaders = require('./utils/secureHeaders')
const socketController = require('./controllers/socketController')

dotenv.config()
const app = express();
const server = http.createServer(app);
const io = socketio(server)

secureHeaders(app)
socketController(io)
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(compression())
app.set('view engine', 'ejs');

const homeRoutes = require('./routes/homeRoutes');
const roomRoutes = require('./routes/roomRoutes');

app.use('/room', roomRoutes)
app.use('/', homeRoutes)

app.use('*', (req, res, next) => {
    return res.status(404).render("404")
})

process.on('uncaughtException', (err) => console.log('Unexpected exception: ', err)); 
process.on('SIGINT', () => console.log('Received SIGINT Signal, shutting down...'))

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
})    
