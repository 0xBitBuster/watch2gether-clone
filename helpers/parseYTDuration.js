module.exports = (duration) => {
    var matches = duration.match(/[0-9]+[HMS]/g);

    var seconds = 0;

    matches.forEach((part) => {
        var unit = part.charAt(part.length-1);
        var amount = parseInt(part.slice(0,-1));

        switch (unit) {
            case 'H':
                seconds += amount*60*60;
                break;
            case 'M':
                seconds += amount*60;
                break;
            case 'S':
                seconds += amount;
                break;
            default:
                break;
        }
    });

    return seconds;
}