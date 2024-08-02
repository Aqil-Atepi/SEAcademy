const { BadRequest, InternalServerError } = require('http-errors')

function isDevMode() {
    return process.env.NODE_ENV === 'development'
}

function returnGeneralError(error, reply) {
    const statusCode = error.statusCode || 500
    return isDevMode() ?
        reply.code(statusCode).send(error) :
        reply.code(statusCode).send({
            400: BadRequest('Something went wrong with the request'),
            500: InternalServerError('Something went wrong with the server')
        }[statusCode] || error)
}

function generateJwtToken(fastify, user) {
    const payload = {
        id: user.id
    }
    const token = fastify.jwt.sign(payload)

    return token
}

function validateEmail(email) {
    const regex = new RegExp(/^.+([@][a-z]+.[a-z]+)$/)
    return regex.test(email ? email : '')
}

module.exports = {
    isDevMode,
    returnGeneralError,
    generateJwtToken,
    validateEmail
}