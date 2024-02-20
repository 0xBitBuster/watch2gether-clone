/**
 * Escape HTML
 */
function escapeHTML (str) {
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };

    return String(str).replace(/[&<>]/g, (tag) => {
        return tagsToReplace[tag] || tag;
    });
};

/**
 * Returns the string but with the first letter uppercased
 */
function uppercaseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * Extract Video ID from Youtube URL
 */
function getVideoIDFromYTURL(url) {
    var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);

    if (match && match[2].length == 11) {
        return match[2];
    } else {
        return false
    }
}