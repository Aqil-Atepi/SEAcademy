const utils = require('./utils')
const date = require('date-and-time')
const LOG_DIR = 'logs'
const LOG_FILENAME = `${date.format(new Date(), 'DD-MM-YYYY')}.log`

module.exports = {
    transport: {
        targets: utils.isDevMode() ? [
            {
                target: '@fastify/one-line-logger',
                level: 'trace',
                options: {
                    destination: `./${LOG_DIR}/${LOG_FILENAME}`,
                    colorize: false,
                    append: false
                }
            },
            { target: '@fastify/one-line-logger', level: 'trace' }
        ] : [
            { target: '@fastify/one-line-logger' }
        ]
    }
}