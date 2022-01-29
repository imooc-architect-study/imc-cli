const ora = require('ora')

function spinnerStart(message='loading') {
    return ora(message).start()
}

module.exports = spinnerStart