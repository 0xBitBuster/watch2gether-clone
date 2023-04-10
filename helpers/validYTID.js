const regex = /^[a-zA-Z0-9_-]{11}$/;

module.exports = (str) => {
    return regex.test(str)
}