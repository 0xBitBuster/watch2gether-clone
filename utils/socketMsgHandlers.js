const axios = require('axios');

const { parseYTDuration } = require("../helpers/parsers")
const { validYTID } = require("../helpers/validation");
const { socketRateLimit } = require('../utils/rateLimiters');

const videoRates = new Set([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2])

function handleChatMessage({ msg, io, socket }) {
	if (!socketRateLimit(socket)) return;
    
	const chatMsg = msg.trim().replace(/\s{4,}/g, ' ');

	// If valid chat message
	if (chatMsg.length > 0 && chatMsg.length < 256) {
		let roomObj = io.sockets.adapter.rooms.get(socket.roomId)

		let msgPayload = {
			username: socket.username,
			profilePic: socket.profilePic,
			role: socket.role,
			msg
		}

		// Add to last messages
		if (roomObj.lastMessages) {
			if (roomObj.lastMessages.length < 20) {
				roomObj.lastMessages.push(msgPayload)
			} else {
				roomObj.lastMessages.shift()
				roomObj.lastMessages.push(msgPayload)
			}
		} else {
			roomObj.lastMessages = [msgPayload]
		}

		// Emit message
		socket.emit("chat-msg-self", msgPayload)

		socket.to(socket.roomId).emit("chat-msg", msgPayload)
	} else {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}
}

async function handleAddToPlaylist({ id, io, socket }) {
	if (!socketRateLimit(socket)) return;
    
	let roomObj = io.sockets.adapter.rooms.get(socket.roomId);

	// If Playlist full
	if (roomObj.playlist && roomObj.playlist.length > 19) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}

	// Valid YT Video ID
	if (!validYTID(id)) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}

	// Fetch video Snippet
	let videoSnippet = false;

	await axios.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.GOOGLE_YOUTUBE_API_KEY}&part=snippet&id=${id}`)
		.then(({ data }) => {
			if (data.items.length > 0) {
				videoSnippet = data.items[0].snippet;
			} else {
				socket.emit('playlist-add-error', 'Video not found')
			}
		})
		.catch(() => socket.emit('playlist-add-error', 'Something went wrong'));

	if (!videoSnippet) return;

	// Fetch video Duration
	let videoDuration = false

	await axios.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.GOOGLE_YOUTUBE_API_KEY}&part=contentDetails&id=${id}`)
		.then(({ data }) => {
			if (data.items.length > 0) {
				videoDuration = data.items[0].contentDetails.duration;
			} else {
				socket.emit('playlist-add-error', 'Video not found')
			}
		})
		.catch(() => socket.emit('playlist-add-error', 'Something went wrong'));

	if (!videoDuration) return;

	const thumbnails = videoSnippet.thumbnails
	const videoInfo = {
		addedBy: socket.username,
		ytId: id,
		thumbnail: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails?.medium.url || thumbnails.standard.url,
		title: videoSnippet.title,
		duration: parseYTDuration(videoDuration)
	}

	// Push video to playlist
	roomObj.playlist.push(videoInfo)

	if (roomObj.playlist.length == 1) {
		roomObj.currentPlayingIndex = 0;
	}

	// Emit
	socket.to(socket.roomId).emit('playlist-add', videoInfo)
	socket.emit("playlist-add-success", videoInfo)
}

function handleRemoveFromPlaylist({ id, io, socket }) {
	if (!socketRateLimit(socket)) return;
    
	// Check valid YT Video ID
	if (!validYTID(id)) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}

	let roomObj = io.sockets.adapter.rooms.get(socket.roomId);
	let newPlaylist = []
	let latestVideoPlayed = false
	let isPlaying = false;
	let gotDeleted = false

	if (roomObj.playlist.length > 0) {
		roomObj.playlist.forEach((playlist, i) => {
			if (playlist.ytId != id) {
				newPlaylist.push(playlist)
			} else {
				if (roomObj.currentPlayingIndex == i) {
					isPlaying = true;
				}

				gotDeleted = true

				latestVideoPlayed = id
			}
		})
	} else {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}

	// Remove video if found
	if (gotDeleted) {
		roomObj.playlist = newPlaylist;

		if (roomObj.playlist.length == 0) {
			if (isPlaying) {
				roomObj.currentPlayingIndex = -1;
			}

			roomObj.latestVideoPlayed = latestVideoPlayed;
		} else if (roomObj.playlist.length > 0) {                
			if (isPlaying) {
				roomObj.currentPlayingIndex = 0;
			}
		}

		io.in(socket.roomId).emit('playlist-remove', id)
	} else {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}
}

function handlePlaylistCurrentPlaying({ i, io, socket }) {
	if (!socketRateLimit(socket)) return;
    
	const index = Number(i)
	
	if (!isNaN(index)) {
		let roomObj = io.sockets.adapter.rooms.get(socket.roomId);

		if (index > roomObj.playlist.length - 1 || (roomObj.playlist.length > 0 && index < 0)) {
			// Not valid
			socket.emit("socket_invalid_input")

			return socket.disconnect(1)
		} else {
			// Change playing Index
			if (roomObj.currentPlayingIndex != index) {
				roomObj.currentPlayingIndex = index

				io.in(socket.roomId).emit('playlist-change-playing', index)
			}
		}
	} else {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}
}

function handleVideoPlay({ time, io, socket }) {
	if (!socketRateLimit(socket)) return;

	const playedAt = Number(Number(time).toFixed(4))
	if (isNaN(playedAt) || playedAt < 0) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	} 

	let roomObj = io.sockets.adapter.rooms.get(socket.roomId);

	// Check if playedAt is not greater than video duration
	if (roomObj.playlist.length > 0) {
		if (playedAt > roomObj.playlist[roomObj.currentPlayingIndex].duration) {
			socket.emit("socket_invalid_input")

			return socket.disconnect(1)
		}
	} else {
		// Default video duration at room join
		if (playedAt > 184) {
			socket.emit("socket_invalid_input")

			return socket.disconnect(1)
		}
	}

	roomObj.currentVideoTime = playedAt

	socket.to(socket.roomId).emit('video-play', playedAt)
}

function handleVideoPause({ time, io, socket }) {
	if (!socketRateLimit(socket)) return;

	const pausedAt = Number(Number(time).toFixed(4))

	if (isNaN(pausedAt) || pausedAt < 0) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	} 

	let roomObj = io.sockets.adapter.rooms.get(socket.roomId);
	
	// Check if pausedAt is not greater than video duration
	if (roomObj.playlist.length > 0) {
		if (pausedAt > roomObj.playlist[roomObj.currentPlayingIndex].duration) {
			socket.emit("socket_invalid_input")

			return socket.disconnect(1)
		}
	} else {
		// Default video duration at room join
		if (pausedAt > 184) {
			socket.emit("socket_invalid_input")

			return socket.disconnect(1)
		}
	}

	roomObj.currentVideoTime = pausedAt

	socket.to(socket.roomId).emit('video-pause', pausedAt)
}

function handleVideoRateChange({ speed, io, socket }) {
	if (!socketRateLimit(socket)) return;

	// If speed is invalid
	if (isNaN(speed) || !videoRates.has(speed)) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	} 

	let roomObj = io.sockets.adapter.rooms.get(socket.roomId);

	roomObj.currentVideoSpeed = speed

	socket.to(socket.roomId).emit('video-ratechange', speed)
}

async function handleUserKick({ profileId, io, socket }) {
	if (!socketRateLimit(socket)) return;
            
	// Permission
	if (socket.role != 'owner') {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1) 
	}

	// Myself
	if (profileId == socket.profileId) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1) 
	}

	let userKicked = false
	const connectedSockets = await io.in(socket.roomId).fetchSockets()

	for (let i = 0; i < connectedSockets.length; i++) {
		if (connectedSockets[i].profileId == profileId) {
			socket.broadcast.to(connectedSockets[i].id).emit('user-kick');
			connectedSockets[i].disconnect(1)
			userKicked = true

			break;
		}
	}

	if (!userKicked) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}
}

async function handleUserBan({ profileId, io, socket }) {
	if (!socketRateLimit(socket)) return;

	// Permission
	if (socket.role != 'owner') {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1) 
	}

	// Myself
	if (profileId == socket.profileId) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1) 
	}

	let userBanned = false
	let roomObj = io.sockets.adapter.rooms.get(socket.roomId);
	const connectedSockets = await io.in(socket.roomId).fetchSockets()

	for (let i = 0; i < connectedSockets.length; i++) {
		if (connectedSockets[i].profileId == profileId) {
			socket.broadcast.to(connectedSockets[i].id).emit('user-ban');
			roomObj.bannedUsers.add(connectedSockets[i].handshake.address)
			connectedSockets[i].disconnect(1)
			userBanned = true

			break;
		}
	}

	if (!userBanned) {
		socket.emit("socket_invalid_input")

		return socket.disconnect(1)
	}
}

async function handleUserDisconnect({ io, socket }) {
	io.in(socket.roomId).emit('user-disconnect', socket.profileId);
    
	const isOwner = socket.role == 'owner'

	// If new Owner needed
	if (isOwner) {   
		let roomObj = io.sockets.adapter.rooms.get(socket.roomId)

		if (roomObj && roomObj.size > 0) {
			const connectedSockets = await io.in(socket.roomId).fetchSockets()
			const newOwner = connectedSockets[0]

			newOwner.role = "owner"

			io.in(socket.roomId).emit('user-role-change', newOwner.profileId)
		}
	}
}

module.exports = {
	handleChatMessage,
	handleAddToPlaylist,
	handleRemoveFromPlaylist,
	handlePlaylistCurrentPlaying,
	handleVideoPlay,
	handleVideoPause,
	handleVideoRateChange,
	handleUserKick,
	handleUserBan,
	handleUserDisconnect
}