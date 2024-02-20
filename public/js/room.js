/**
 * DOM Elements
 */
const DOMAIN = document.getElementById('DOMAIN').innerText
const ROOM_ID = document.getElementById('ROOM_ID').innerText
const removeCreditBtn = document.getElementById('credits__close')
const ytLinkInp = document.getElementById('search__input')
const ytSearchBtn = document.getElementById('search__button')
const ytSearchForm = document.getElementById('search__form')
const ytSearchVideoLimit = document.getElementById('search__limit')
const roomLinkInp = document.getElementById('link__input')
const copyRoomLinkBtn = document.getElementById('link__copy')
const copyRoomLinkUserLimit = document.getElementById('link__limit')
const usersContainer = document.getElementById('main__users')
const chatForm = document.getElementById('chat__form')
const chatInp = document.getElementById('chat__input')
const chatContainer = document.getElementById('chat__container')
const chatSubmitBtn = document.getElementById('chat__button')
const chatEmptyMsg = document.getElementById('chat__empty-msg')
const playlistContainer = document.getElementById('playlist__container')
const playlistEmptyMsg = document.getElementById('playlist__empty-message')

/**
 * DOM Defaults
 */
let userLength = 0;
let myRole = 'guest';
let myId = '';
let canAddYTLink = true;
let canCopyRoomLink = true;
let canWriteMsg = true;
let currentPlayingIndex = 0;
let playerActionByMyself = true;
let seekAllowed = true;
let rateChangeAllowed = true;

ytSearchBtn.disabled = true;
chatSubmitBtn.disabled = true;
roomLinkInp.value = DOMAIN + "/room/" + ROOM_ID;

/**
 * Initialize Player
 */
const playlist = []
const supported = Plyr.supported('video', 'youtube', true);

if (!supported.api) {
    sendErrorAndRedirect("Your browser does not support our video player. Please update your browser!");
}

const player = new Plyr('#player', {
    controls: [
        'play-large',
        'play', 
        'progress', 
        'current-time', 
        'mute',
        'volume',
        'captions', 
        'settings',
        'pip', 
        'airplay',
        'fullscreen', 
    ],
    tooltips: {
        controls: true,
        seek: true
    },
    keyboard: { 
        focused: true, 
        global: true 
    },
    storage: {
        enabled: false
    }
});




/*
   _____            _        _     ______               _       
  / ____|          | |      | |   |  ____|             | |      
 | (___   ___   ___| | _____| |_  | |____   _____ _ __ | |_ ___ 
  \___ \ / _ \ / __| |/ / _ \ __| |  __\ \ / / _ \ '_ \| __/ __|
  ____) | (_) | (__|   <  __/ |_  | |___\ V /  __/ | | | |_\__ \
 |_____/ \___/ \___|_|\_\___|\__| |______\_/ \___|_| |_|\__|___/

*/
const socket = io()

/**
 * Error Handling
 */
socket.on("socket_user_limit", () => sendErrorAndRedirect("This room is currently full."))
socket.on('socket_connection_ban', () => sendErrorAndRedirect("Slow down. You are banned as you have made too many requests recently. Try again in one hour!"))
socket.on("socket_invalid_input", () => sendErrorAndRedirect("Invalid input. Please try again or contact us."))
socket.on('disconnect', () => sendErrorAndRedirect("Disconnected from room. Please try again or contact us."))
socket.io.on("reconnect_error", () => sendErrorAndRedirect("Something went wrong while reconnecting to room. Please try again or contact us."));

/**
 * Initialize myself
 */
socket.on('user-init', (data) => {
    myRole = data.role;
    myId = data.profileId
    userLength++;

    appendUser(data.profilePic, data.username, data.profileId, true, data.role)

    // Other users
    if (data.otherUsers.length > 0) {
        data.otherUsers.forEach(user => {
            appendUser(user.profilePic, user.username, user.profileId, false, user.role)
            userLength++;
        })
    }

    checkRoomLinkAvailability()

    // Existing playlist
    if (data.playlist.length > 0) {
        data.playlist.forEach(video => {
            addVideoToPlaylist(video.ytId, video.thumbnail, video.title, video.addedBy, false)
        })
    }

    checkAddVideoAvailability()

    // Last Video Played if playlist empty
    if (data.lastVideoPlayed) {
        player.on("ready", () => {
            player.source = {
                type: 'video',
                sources: [
                    {
                        src: data.lastVideoPlayed,
                        provider: 'youtube',
                    }
                ],
            };

            player.currentTime = data.currentVideoTime
            player.speed = data.currentVideoSpeed
        })
    } else if (data.currentPlayingIndex > -1) {
        // If playlist not empty
        currentPlayingIndex = data.currentPlayingIndex

        const playingVideo = playlist[currentPlayingIndex]

        player.on("ready", () => {
            player.source = {
                type: 'video',
                sources: [
                    {
                        src: playingVideo.id,
                        provider: 'youtube',
                    }
                ],
            };

            player.currentTime = data.currentVideoTime
            player.speed = data.currentVideoSpeed
        })
    } else {
        // If playlist empty
        currentPlayingIndex = -1

        player.on("ready", () => {
            player.currentTime = data.currentVideoTime
            player.speed = data.currentVideoSpeed
        })
    }

    // Display last 20 messages if there are messages
    if (data.lastMessages.length > 0) {
        data.lastMessages.forEach((msgInfo) => {
            const { profilePic, msg, username, role } = msgInfo;
            
            appendChatMsg(profilePic, msg, username, false, role)
        })
    }
})

/**
 * Handle user join
 */
socket.on('user-join', (user) => {
    userLength++;
    checkRoomLinkAvailability()
    appendUser(user.profilePic, user.username, user.profileId, false, user.role)

    player.pause()
})

/**
 * Handle other user message
 */
socket.on('chat-msg', (data) => {
    appendChatMsg(data.profilePic, data.msg, data.username, false, data.role)
})

/**
 * Handle myself message
 */
socket.on('chat-msg-self', (data) => {
    appendChatMsg(data.profilePic, data.msg, data.username, true, data.role)
})

/**
 * Handle when other users add to playlist
 */
socket.on('playlist-add', (video) => {
    addVideoToPlaylist(video.ytId, video.thumbnail, video.title, video.addedBy, false)
    checkAddVideoAvailability()
})

/**
 * Handle when myself adds to playlist
 */
socket.on('playlist-add-success', (video) => {
    addVideoToPlaylist(video.ytId, video.thumbnail, video.title, video.addedBy, true)
    checkAddVideoAvailability()
    changeSearchBtnStatus("Added!", 'success')
})

/**
 * Handle when myself has error adding something to playlist
 */
socket.on('playlist-add-error', (err) => {
    changeSearchBtnStatus(err, 'danger')
})

/**
 * Handle when any user removes from playlist
 */
socket.on('playlist-remove', (id) => {
    removeVideo(id)
    checkAddVideoAvailability()
})

/**
 * Handle when any user changes video playback rate
 */
socket.on('playlist-change-playing', (index) => {
    changePlayingIndexFunction(index)
})

/**
 * Handle when other user plays video
 */
socket.on('video-play', (time) => {
    playerActionByMyself = false
    seekAllowed = false

    player.currentTime = time
    player.play()
})

/**
 * Handle when other users pause video
 */
socket.on('video-pause', (time) => {
    playerActionByMyself = false
    seekAllowed = false

    player.currentTime = time
    player.pause()
})

/**
 * Handle when other users change playback rate of video
 */
socket.on('video-ratechange', (speed) => {
    rateChangeAllowed = false
    player.speed = speed
})

/**
 * Handle when any users role get's changed
 */
socket.on('user-role-change', (profileId) => {
    document.getElementById(`user-${profileId}`).insertAdjacentHTML('beforeend', '<i class="bi bi-star-fill user__mid" title="Owner"></i>')

    const newOwnerEl = document.querySelector(`#user-${profileId} figcaption`)

    if (profileId === myId) {
        myRole = "owner"

        // Myself
        newOwnerEl.textContent = newOwnerEl.textContent.replace('(Guest)', '(Owner)')
    
        // Other Users
        document.querySelectorAll('.main__user').forEach((el) => {
            var userId = el.id.split('user-')[1]

            if (userId != myId) {
                el.insertAdjacentHTML('beforeend', `<i class="bi bi-person-x user__left" title="Ban User" onClick="punishUser('${userId}', 'ban')"></i>`)
                el.insertAdjacentHTML('beforeend', `<i class="bi bi-box-arrow-right user__right" title="Kick User" onClick="punishUser('${userId}', 'kick')"></i>`)
            }
        })
    } else {
        // other user
        newOwnerEl.textContent = newOwnerEl.textContent.replace('Guest-', 'Owner-')
    }
})

/**
 * Handle when myself get's kicked or banned
 */
socket.on('user-kick', () => sendErrorAndRedirect("You have been kicked from the room."))
socket.on('user-ban', () => sendErrorAndRedirect("You have been banned from the room."))

/**
 * Handle when other users disconnect
 */
socket.on('user-disconnect', (profileId) => {
    userLength--;
    checkRoomLinkAvailability()
    removeUser(profileId)
})




/**
  _____   ____  __  __   ______               _       
 |  __ \ / __ \|  \/  | |  ____|             | |      
 | |  | | |  | | \  / | | |____   _____ _ __ | |_ ___ 
 | |  | | |  | | |\/| | |  __\ \ / / _ \ '_ \| __/ __|
 | |__| | |__| | |  | | | |___\ V /  __/ | | | |_\__ \
 |_____/ \____/|_|  |_| |______\_/ \___|_| |_|\__|___/

*/
/**
 * Handle remove credits button click
 */
removeCreditBtn.addEventListener('click', () => {
    setTimeout(() => {
        removeCreditBtn.parentElement.hidden = true;
    }, 950)

    removeCreditBtn.parentElement.classList.add('credits__close-animation')
})

/**
 * Handle typing into Link Input
 */
ytLinkInp.addEventListener('keyup', () => {
    const ytLink = ytLinkInp.value.trim();

    ytSearchBtn.disabled = (ytLink.length === 0 || !canAddYTLink)
})

/**
 * Handle submitting youtube link
 */
ytSearchForm.addEventListener('submit', async(e) => {
    e.preventDefault();

    const ytLink = ytLinkInp.value.trim();

    if (ytLink.length > 0 && canAddYTLink) {
        // Reset Inputs
        ytLinkInp.value = "";
        ytSearchBtn.disabled = true;

        // Check playlist limit
        if (playlist.length > 20) {
            return changeSearchBtnStatus("Playlist limit reached", 'danger')
        }

        const ytID = getVideoIDFromYTURL(ytLink)

        if (ytID === false) {
            return changeSearchBtnStatus("Video not found!", 'danger')
        } 
        
        // Check if video is already in playlist
        if (checkPlaylistDuplicate(ytID) === true) {
            return changeSearchBtnStatus("Video already in playlist!", 'danger')
        }

        socket.emit('playlist-add', ytID)
    }
})

/**
 * Handle "copy room link" button click
 */
copyRoomLinkBtn.addEventListener("click", () => {
    if (canCopyRoomLink) {
        copyRoomLink()
    }
})

/**
 * Handle typing into Chat Message Input
 */
chatInp.addEventListener('keyup', () => {
    const chatMsg = chatInp.value.trim().replace(/\s{4,}/g, ' ');

    chatSubmitBtn.disabled = (chatMsg.length === 0 || chatMsg.length > 256)
})

/**
 * Handle submitting Chat Message
 */
chatForm.addEventListener('submit', (e) => {
    e.preventDefault()

    if (canWriteMsg) {
        const chatMsg = chatInp.value.trim().replace(/\s{4,}/g, ' ');
        
        if (chatMsg.length > 0 && chatMsg.length < 256) {
            socket.emit("chat-msg", chatMsg)
        }
        
        // Reset Inputs
        chatInp.value = ""
        chatSubmitBtn.disabled = true
    }
})




/**
  _____   ____  __  __   _    _      _                     
 |  __ \ / __ \|  \/  | | |  | |    | |                    
 | |  | | |  | | \  / | | |__| | ___| |_ __   ___ _ __ ___ 
 | |  | | |  | | |\/| | |  __  |/ _ \ | '_ \ / _ \ '__/ __|
 | |__| | |__| | |  | | | |  | |  __/ | |_) |  __/ |  \__ \
 |_____/ \____/|_|  |_| |_|  |_|\___|_| .__/ \___|_|  |___/
                                      | |                  
                                      |_|                  
*/
/**
 * Redirect user to home page with error message
 */
function sendErrorAndRedirect(msg) {
    sessionStorage.setItem("error_message", msg);
    window.location = DOMAIN;
}

/**
 * Check if user's are allowed to add video
 */
function checkAddVideoAvailability() {
    if (playlist.length <= 20) {
        // Available
        ytSearchBtn.hidden = false;
        ytLinkInp.hidden = false;
        ytSearchVideoLimit.style.display = 'none'
    } else {
        // Not Available
        ytSearchBtn.hidden = true;
        ytLinkInp.hidden = true;
        ytSearchVideoLimit.style.display = 'block'
    }
}

/**
 * Changes the add youtube link button status
 */
function changeSearchBtnStatus(newStatus, newColor) {
    // Display New Status
    ytSearchBtn.innerText = newStatus
    ytSearchBtn.classList.replace("btn-primary", `btn-${newColor}`);
    ytLinkInp.readOnly = true;
    canAddYTLink = false;

    // Display Default Status
    setTimeout(() => {
        ytSearchBtn.innerText = "Add"
        ytSearchBtn.classList.replace(`btn-${newColor}`, "btn-primary");
        ytLinkInp.readOnly = false;
        canAddYTLink = true;
    }, 3000)
}

/**
 * Checks if the room link is available to copy
 */
function checkRoomLinkAvailability() {
    if (userLength < 10) {
        // Available
        copyRoomLinkUserLimit.style.display = 'none'
        roomLinkInp.hidden = false
        copyRoomLinkBtn.hidden = false
    } else {
        // Not Available
        copyRoomLinkUserLimit.style.display = 'block'
        roomLinkInp.hidden = true
        copyRoomLinkBtn.hidden = true
    }
}

/**
 * Changes the "copy room link" button status
 */
function changeCopyRoomLinkStatus(newStatus, newColor) {
    // Display New Status
    copyRoomLinkBtn.innerText = newStatus
    copyRoomLinkBtn.classList.replace('btn-primary', `btn-${newColor}`);
    canCopyRoomLink = false;

    // Display Default Status
    setTimeout(() => {
        copyRoomLinkBtn.innerText = "Copy"
        copyRoomLinkBtn.classList.replace(`btn-${newColor}`, 'btn-primary');
        canCopyRoomLink = true;
    }, 3000)
}

/**
 * Copies the room link
 */
function copyRoomLink() {
    // Check if browser does not support clipboard
    if (!navigator.clipboard) {
        try {
            // Select Element
            roomLinkInp.focus();
            roomLinkInp.select();
    
            // Execute copy command
            document.execCommand('copy');
    
            changeCopyRoomLinkStatus("Copied!", "success")
        } catch (err) {
            console.log("Failed copying room link: ", err);
    
            changeCopyRoomLinkStatus("Error!", "danger")
        }

        return;
    }

    // If browser supports clipboard
    navigator.clipboard.writeText(roomLinkInp.value).then(() => {
        changeCopyRoomLinkStatus("Copied!", "success")
    }, (err) => {
        console.log("Failed copying room link: ", err);
    
        changeCopyRoomLinkStatus("Error!", "danger")
    });
}

/**
 * Appends a chat message to DOM
 */
function appendChatMsg(profilePic, msg, username, myself, role) {
    const msgHTML = `
        <article class="msg-container ${myself ? "msg-self" : "msg-remote"} id="msg-0">
            <div class="msg-box">
                ${!myself ? `<img class="user-img" src="/assets/room/profile-${profilePic}.png" alt="" />` : ''}
                <div class="flr">
                    <div class="messages">
                        <p class="msg">
                            ${escapeHTML(msg)}
                        </p>
                    </div>
                    <span class="info">
                        <span class="username">
                            ${myself ? '<u>You</u>' : `${uppercaseFirstLetter(role)}-${username}`}
                        </span>
                    </span>
                </div>
                ${myself ? `<img class="user-img" src="/assets/room/profile-${profilePic}.png" alt="" />` : ''}
            </div>
        </article>
    `.trim();

    if (!chatEmptyMsg.hidden) {
        chatEmptyMsg.hidden = true;
    }

    chatContainer.insertAdjacentHTML('beforeend', msgHTML);

    // Scroll to bottom if chat container overflows
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Appends a user to the DOM
 */
function appendUser(profilePic, username, id, myself, userRole) {
    const userHTML = `
        <figure class="main__user" id=${`user-${id}`}>
            <img src="/assets/room/profile-${profilePic}.png" alt="" />
            <figcaption class="text-white">
                ${myself ? 
                    `<strong>You</strong> (${uppercaseFirstLetter(userRole)})` : 
                    `${uppercaseFirstLetter(userRole)}-${username}`
                }
            </figcaption>
            ${!myself && myRole === "owner" ? `<i class="bi bi-person-x user__left" title="Ban User" onClick="punishUser('${id}', 'ban')"></i>` : ''}
            ${userRole === "owner" ? `<i class="bi bi-star-fill user__mid" title="Owner"></i>` : ''}
            ${!myself && myRole === "owner" ? `<i class="bi bi-box-arrow-right user__right" title="Kick User" onClick="punishUser('${id}', 'kick')"></i>` : ''}
        </figure>
    `.trim();

    usersContainer.insertAdjacentHTML('beforeend', userHTML);
}

/**
 * Remove a user from the DOM
 */
function removeUser(id) {
    document.getElementById(`user-${id}`).remove();
}

/**
 * Check for playlist duplicate
 */
function checkPlaylistDuplicate(id) {
    let isDuplicate = false;

    playlist.map((video) => {
        if (JSON.stringify(video.id) === JSON.stringify(id)) {
            isDuplicate = true
        }
    })

    return isDuplicate;
}

/**
 * Update video source
 */
function updateVideoSrc() {
    const playingVideo = playlist[currentPlayingIndex]

    player.source = {
        type: 'video',
        sources: [
            {
                src: playingVideo.id,
                provider: 'youtube',
            }
        ],
    };
}

/**
 * Add video in playlist to DOM
 */
function addVideoToPlaylist(id, thumbnail, title, addedBy, myself) {
    playlist.push({
        id,
        thumbnail,
        title,
        addedBy
    });
    
    if (playlistEmptyMsg.hidden === false) {
        playlistEmptyMsg.hidden = true;
    }

    if (playlist.length === 1) {
        currentPlayingIndex = 0;
        updateVideoSrc()
    }

    const videoHTML = `
        <li class="playlist__item" id="playlist_video-${id}">
            <div class="playlist__item-left">
                <i class="bi bi-trash" onclick=removeVideoFromPlaylist("${id}") title="Remove from playlist" aria-label="Click here to remove this video from playlist"></i>
            </div>
            <div class="playlist__item-right ${playlist.length === 1 ? 'playlist__playing' : ''}" onclick=changePlayingIndex("${id}") title="Click to change playing video" aria-label="Click here to change playing video">
                <div class="post-thumb">
                    <img src="${thumbnail}" alt="">
                </div>
                <div class="post-content">
                    <h3 class="text-truncate" title="${title}" aria-label="${title}">${title}</h3>
                    <p class="text-truncate" aria-label="Video Added by">Added by: ${myself ? "<u>You</u>" : `User-${addedBy}`}</p>
                </div>
            </div>
        </li>
    `.trim();

    playlistContainer.insertAdjacentHTML('beforeend', videoHTML);
}

/**
 * Removes a video from DOM
 */
function removeVideo(id) {
    let isPlaying = false;

    playlist.map((video, i) => {
        // If found, splice it out from playlist
        if (JSON.stringify(video.id) === JSON.stringify(id)) {
            if (i === currentPlayingIndex) {
                isPlaying = true;
            }

            playlist.splice(i, 1)
        }
    })

    document.getElementById("playlist_video-" + id).remove();

    if (playlist.length === 0) {
        if (isPlaying) {
            currentPlayingIndex = -1;
        }

        playlistEmptyMsg.hidden = false
    } else if (playlist.length > 0) {
        // If not empty and isPlaying is removed, change playing video to the first video in playlist
        if (isPlaying) {
            currentPlayingIndex = 0;
            updateVideoSrc()
        }

        playlistContainer.children[1].children[1].classList.add('playlist__playing')
    }
}

/**
 * Changes the current playing video in DOM
 */
function changePlayingIndexFunction(i) {
    const index = Number(i)
        
    if (!isNaN(index)) {
        if (index > playlist.length - 1 || (playlist.length > 0 && index < 0)) {
            return;
        } else {
            playlistContainer.children[currentPlayingIndex + 1].children[1].classList.remove('playlist__playing')
            playlistContainer.children[index + 1].children[1].classList.add('playlist__playing')

            currentPlayingIndex = index;
            updateVideoSrc()
        }
    }
}




/**
   _____            _        _     _    _      _                     
  / ____|          | |      | |   | |  | |    | |                    
 | (___   ___   ___| | _____| |_  | |__| | ___| |_ __   ___ _ __ ___ 
  \___ \ / _ \ / __| |/ / _ \ __| |  __  |/ _ \ | '_ \ / _ \ '__/ __|
  ____) | (_) | (__|   <  __/ |_  | |  | |  __/ | |_) |  __/ |  \__ \
 |_____/ \___/ \___|_|\_\___|\__| |_|  |_|\___|_| .__/ \___|_|  |___/
                                                | |                  
                                                |_|                  
*/
/**
 * Punishes a user (kick or ban)
 */
function punishUser(id, type) {
    if (myRole === "owner") {
        socket.emit(`user-${type}`, id)
    }
}

/**
 * Emit a "remove video" event to socket
 */
function removeVideoFromPlaylist(id) {
    socket.emit('playlist-remove', id)
}

/**
 * Change current playing video and emit to socket
 */
function changePlayingIndex(id) {
    for (let i = 0; i < playlist.length; i++) {
        if (playlist[i].id === id) {
            if (currentPlayingIndex != i) {
                socket.emit('playlist-change-playing', i)
                break;
            }
        }
    }
}




/**
 __      ___     _              ______               _       
 \ \    / (_)   | |            |  ____|             | |      
  \ \  / / _  __| | ___  ___   | |____   _____ _ __ | |_ ___ 
   \ \/ / | |/ _` |/ _ \/ _ \  |  __\ \ / / _ \ '_ \| __/ __|
    \  /  | | (_| |  __/ (_) | | |___\ V /  __/ | | | |_\__ \
     \/   |_|\__,_|\___|\___/  |______\_/ \___|_| |_|\__|___/
*/
/**
 * When user plays the video
 */
player.on('play', () => {
    if (playerActionByMyself) {
        socket.emit('video-play', player.currentTime)
        
        player.currentTime = Number(player.currentTime.toFixed(4))

        seekAllowed = false
    } else {
        playerActionByMyself = true
    }
});

/**
 * When user pauses the video
 */
player.on('pause', () => {
    if (playerActionByMyself) {
        socket.emit('video-pause', player.currentTime)
        
        player.currentTime = Number(player.currentTime.toFixed(4))
        
        seekAllowed = false
    } else {
        playerActionByMyself = true
    }
});

/**
 * When user seeked the video
 */
player.on('seeked', () => {    
    if (seekAllowed) {
        player.pause()
    } else {
        seekAllowed = true
    }
})

/**
 * When user changed the playback rate of the video
 */
player.on('ratechange', () => {
    if (rateChangeAllowed) {
        socket.emit('video-ratechange', player.speed)
    } else {
        rateChangeAllowed = true
    }
})

/**
 * When video ended
 */
player.on('ended', () => {    
    if (playlist.length > 1) {
        const currentVideo = playlist[currentPlayingIndex]

        removeVideoFromPlaylist(currentVideo.id)
        checkAddVideoAvailability()
        updateVideoSrc()
    } else if (playlist.length === 1) {
        const currentVideo = playlist[currentPlayingIndex]
        removeVideoFromPlaylist(currentVideo.id)
        checkAddVideoAvailability()
    }
})
