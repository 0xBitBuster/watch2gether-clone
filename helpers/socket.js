async function getOtherUsers({ io, socket }) {
	const otherUsers = []
	const connectedSockets = await io.in(socket.roomId).fetchSockets()

	connectedSockets.forEach((connectedSocket) => {
		if (socket.id != connectedSocket.id) {
			const { profileId, profilePic, username, role } = connectedSocket

			otherUsers.push({
				profileId,
				profilePic,
				username,
				role
			})
		}
	});

	return otherUsers;
}

module.exports = {
	getOtherUsers
}