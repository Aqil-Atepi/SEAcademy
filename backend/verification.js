const nodemailer = require('nodemailer')
const dateAndTime = require('date-and-time')
const crypto = require('crypto')
const axios = require('axios')
const { Unauthorized, Forbidden } = require('http-errors')

const StatusCode = {
    Success: 20,
    ClientError: 40,
    UserDoesntExists: 41,
    UserHasBeenVerified: 42,
    TokenIsInvalid: 43,
    TokenIsExpired: 44,
    ServerError: 50
}
const verification = {
    StatusCode: StatusCode,
    getOrCreateToken: getOrCreateTokenVerification,
    send: sendVerification,
    validate: validateVerification
}

function getException(code) {
    const exceptions = {
        41: Unauthorized("User doesn\'t exists"),
        42: Forbidden('User has been verified'),
        43: Unauthorized('Token is invalid'),
        44: Unauthorized('Token is expired')
    }

    return exceptions[code] || null
}

async function getOrCreateTokenVerification(mysqlConn, userEmail) {
    const result = (await mysqlConn.query(
        'SELECT verified, token, token_expiry FROM users WHERE email = ?',
        [userEmail]
    ))[0]

    if (result.length < 1 ) {
        return StatusCode.UserDoesntExists
    }
    
    const user = result[0]
    if (user.verified) {
        return StatusCode.UserHasBeenVerified
    }

    if (!user.token || user.token_expiry <= new Date(Date.now())) {
        const token = crypto.randomBytes(128).toString('hex')
        const tokenExpiry = dateAndTime.addHours(new Date(Date.now()), 3)
        
        await mysqlConn.query(
            'UPDATE users SET token = ?, token_expiry = ? WHERE email = ?',
            [token, tokenExpiry, userEmail]
        )
        
        return token
    }
    
    return user.token
}

async function sendVerification(fastify, req, userEmail, redirectTo, mysqlConn) {
    const token = await verification.getOrCreateToken(mysqlConn, userEmail)
    const url = new URL(`${req.protocol}://${req.hostname}/v${process.env.API_VERSION}/auth/verify`)
    
    url.searchParams.append('token', token)
    if (redirectTo) {
        url.searchParams.append('redirectTo', redirectTo)
    }

    const transport = nodemailer.createTransport({
        service: process.env.NODEMAILER_SERVICE,
        host: process.env.NODEMAILER_HOST,
        port: Number(process.env.NODEMAILER_PORT),
        secure: true,
        auth: {
            user: process.env.NODEMAILER_AUTH_USER,
            pass: process.env.NODEMAILER_AUTH_PASS
        }
    })

    transport.sendMail({
        from: process.env.NODEMAILER_SENDER,
        to: userEmail,
        subject: 'SEAcademy',
        text: `Click this link to verify your email in order to complete your account verification: \n${url}`
    }, function(err, info) {
        if (err) {
            fastify.log.error(`Nodemailer: ${err}`)
        } else {
            fastify.log.info(`Nodemailer: ${info.response}`)
        }
    })
}

async function validateVerification(token, mysqlConn) {
    const result = (await mysqlConn.query(
        'SELECT id, verified, token_expiry FROM users WHERE token = ?',
        [token]
    ))[0]

    if (result.length < 1) {
        return StatusCode.TokenIsInvalid
    }

    const user = result[0]
    const currentDate = new Date(Date.now())
    if (user.token_expiry <= currentDate) {
        return StatusCode.TokenIsExpired
    }

    if (user.verified) {
        return StatusCode.UserHasBeenVerified
    }

    return user
}

module.exports = {
    verification,
    StatusCode,
    getException
}