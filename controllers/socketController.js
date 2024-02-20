const { v4: uuidv4 } = require('uuid')

const { randomString, randomInt } = require("../helpers/random") 
const { handleChatMessage, handlePlaylistCurrentPlaying, handleVideoPlay, handleVideoPause, handleVideoRateChange, handleUserKick, handleUserBan, handleAddToPlaylist, handleRemoveFromPlaylist, handleUserDisconnect } = require('../utils/socketMsgHandlers');
const { getOtherUsers } = require('../helpers/socket');

module.exports = function(io) {
    io.on('connection', async (socket) => {
        const ip = socket.handshake.address;
    
        // Socket Variables
        socket.username = randomString(5)
        socket.profileId = uuidv4()
        socket.profilePic = randomInt(1, 9)
        socket.roomId = socket.handshake.headers.referer.split(process.env.DOMAIN + "/room/")[1]
        socket.requestInfo = {
            datetime: null,
            requests: 0
        }

        var roomObj = io.sockets.adapter.rooms.get(socket.roomId)
        if (roomObj) {
            // Room is full
            if (roomObj.size + 1 > 10) { 
                socket.emit('socket_user_limit')
    
                return socket.disconnect(1);
            } // Client is banned from room 
            else if (roomObj.bannedUsers.has(ip)) { 
                socket.emit('user-ban')
    
                return socket.disconnect(1);
            }
        } 
        
        // Join socket to room
        socket.join(socket.roomId)
        roomObj = io.sockets.adapter.rooms.get(socket.roomId)
        socket.role = roomObj.size === 1 ? "owner" : "guest"

        // Room Banned Users
        if (roomObj.bannedUsers == undefined) {
            roomObj.bannedUsers = new Set()
        }

        // Room Playlist
        if (roomObj.playlist == undefined) {
            roomObj.playlist = []
        }
    
        // Myself Initialization
        socket.emit('user-init', {
            username: socket.username,
            role: socket.role,
            profilePic: socket.profilePic,
            profileId: socket.profileId,
            otherUsers: await getOtherUsers({ io, socket }),
            playlist: roomObj.playlist,
            currentPlayingIndex: roomObj.currentPlayingIndex > -1 ? roomObj.currentPlayingIndex : -1,
            currentVideoTime: roomObj.currentVideoTime || 0,
            currentVideoSpeed: roomObj.currentVideoSpeed || 1,
            lastVideoPlayed: roomObj.lastVideoPlayed || false,
            lastMessages: roomObj.lastMessages || []
        })
    
        // Other User joined room
        socket.to(socket.roomId).emit('user-join', {
            username: socket.username,
            profilePic: socket.profilePic,
            profileId: socket.profileId,
            role: socket.role
        })
    
        // Setup Handlers
        socket.on('chat-msg', (msg) => handleChatMessage({ msg, io, socket }))
        socket.on("playlist-add", (id) => handleAddToPlaylist({ id, io, socket }))
        socket.on('playlist-remove', (id) => handleRemoveFromPlaylist({ id, io, socket }))
        socket.on('playlist-change-playing', (i) => handlePlaylistCurrentPlaying({ i, io, socket }))
        socket.on('video-play', (time) => handleVideoPlay({ time, io, socket }))
        socket.on('video-pause', (time) => handleVideoPause({ time, io, socket }))
        socket.on('video-ratechange', (speed) => handleVideoRateChange({ speed, io, socket }))
        socket.on('user-kick', (profileId) => handleUserKick({ profileId, io, socket }))
        socket.on('user-ban', (profileId) => handleUserBan({ profileId, io, socket }))
        socket.on('disconnect', () => handleUserDisconnect({ io, socket }))
    })
}