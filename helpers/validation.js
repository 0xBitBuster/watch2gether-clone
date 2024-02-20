
function validUUID(str) {
	const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
	return regex.test(str)
}

function validYTID(str) {
	const regex = /^[a-zA-Z0-9_-]{11}$/;
    return regex.test(str)
}

module.exports = {
	validUUID,
	validYTID
}