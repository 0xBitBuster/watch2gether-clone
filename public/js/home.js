const errorEl = document.getElementById('error')
const errorText = document.getElementById('error__text')

const errorMsgs = {
    'socket_disconnect_error': 'Disconnected from room. Please try again or contact me!',
    'socket_reconnect_error': 'Something went wrong while reconnecting to room. Please try again or contact me!',
    'socket_connection_limit': 'You can only be connected to one room at a time.',
    'socket_user_limit': 'Disconnected from room due to maximum user limit.',
    'socket_connection_ban': 'Slow down. Banned due too many requests. Try again in one hour!',
    'socket_invalid_input': 'Invalid input. Try again or contact me!',
    'browser_not_supported': 'Your browser does not support our video player. Please update your browser!',
    'socket_user_kick': 'You have been kicked from the room.',
    'socket_user_ban': 'You have been banned from the room.'
}
const errorMsgKeys = Object.keys(errorMsgs)

for (let i = 0; i < errorMsgKeys.length; i++) {
    const key = errorMsgKeys[i]

    if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key)

        errorEl.classList.remove('d-none')
        errorText.innerText = errorMsgs[key]
    }
}