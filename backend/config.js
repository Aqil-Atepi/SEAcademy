const dotenv = require('dotenv')
const minimist = require('minimist')
const toBoolean = require('to-boolean')
const ENV_DIR = './'

function loadConfig() {
    const localOption = minimist(process.argv.slice(2))['local']
    const isLocalMode = localOption ? toBoolean(localOption) : false

    dotenv.config({
        path: ENV_DIR + '.env' + (isLocalMode ? '.local' : ''),
        override: false
    })
}

module.exports = {
    loadConfig
}