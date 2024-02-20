// Rate Limiter
async function socketRateLimit(socket) {
    const now = new Date().getTime()

    // If first request
    if (socket.requestInfo.requests == 0) {   
        socket.requestInfo.datetime = now
        socket.requestInfo.requests++;
    } // If socket datetime expired
    else if (now - socket.requestInfo.datetime > 300000) {   
        socket.requestInfo.datetime = now;
        socket.requestInfo.requests = 1
    } // If 100 requests in last 5 minutes ban ip (1h)
    else if (socket.requestInfo.requests > 99) {   
        socket.emit('socket_connection_ban')

        socket.disconnect(1)

        return false
    } // Else Increase request count
    else {
        socket.requestInfo.requests++;
    }

    return true
}

module.exports = {
	socketRateLimit
}