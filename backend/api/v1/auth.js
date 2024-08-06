const utils = require('../../utils')
const { Conflict, Unauthorized } = require('http-errors')
const crypto = require('crypto')
const { verification, getException } = require('../../verification')

module.exports = function (fastify, opts, done) {
    fastify.post('/signup', async (req, reply) => {
        let conn
        try {
            if (!(
                req.body.name &&
                utils.validateEmail(req.body.email) &&
                req.body.password
            )) {
                return Unauthorized('Input is invalid.')
            }

            const hmac = crypto.createHmac('sha256', req.body.password)
            req.body.password = hmac.digest('hex')

            conn = await fastify.mysql.getConnection()
            const result = (await conn.query(
                'SELECT id FROM users WHERE email = ?',
                [req.body.email]
            ))[0]
            
            if (result.length > 0) {
                throw Conflict('User is exists')
            }

            await conn.query(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [req.body.name, req.body.email, req.body.password]
            )

            const verificationStatusCode = await verification.send(fastify, req, req.body.email, req.body.redirectTo, conn)
            conn.release()

            const verificationException = getException(verificationStatusCode)
            if (verificationException) {
                throw verificationException
            }

            return reply.code(204).send()
        } catch (error) {
            return utils.returnGeneralError(error, reply)
        } finally {
            if (conn) conn.release()
        }
    })

    fastify.post('/signin', async (req, reply) => {
        let conn
        try {
            if (!(utils.validateEmail(req.body.email) && req.body.password)) {
                throw Unauthorized('Input is invalid.')
            }
    
            const hmac = crypto.createHmac('sha256', req.body.password)
            req.body.password = hmac.digest('hex')
    
            conn = await fastify.mysql.getConnection()
            const result = (await conn.query(
                'SELECT id, name, password, verified FROM users WHERE email = ?',
                [req.body.email]
            ))[0]
            conn.release()

            const ERR_MSG_INVALID = "Email or password is invalid"
            if (result.length < 1) {
                throw Unauthorized(ERR_MSG_INVALID)
            }
            
            const user = result[0]
            const isPasswordValid = crypto.timingSafeEqual(
                Buffer.from(req.body.password),
                Buffer.from(user.password)
            )
    
            if (!user.verified || !isPasswordValid) {
                throw Unauthorized(ERR_MSG_INVALID)
            }

            const JwtToken = utils.generateJwtToken(fastify, user)
            reply.setCookie(process.env.JWT_COOKIE_NAME, JwtToken, {
                path: '/',
                sameSite: 'none',
                secure: true,
                maxAge: (60 * 60 * 24 * 30) // 1 month
            })

            return reply.code(200).send({
                name: user.name,
                email: req.body.email
            })
        } catch (error) {
            return utils.returnGeneralError(error, reply)
        } finally {
            if (conn) conn.release()
        }
    })

    fastify.post('/resend', async (req, reply) => {
        let conn
        try {
            if (!utils.validateEmail(req.body.email)) {
                throw Unauthorized('Input is invalid.')
            }
            
            conn = await fastify.mysql.getConnection()
            const verificationStatusCode = await verification.send(fastify, req, req.body.email, req.body.redirectTo, conn)
            conn.release()

            const verificationException = getException(verificationStatusCode)
            if (verificationException) {
                throw verificationException
            }

            return reply.code(204).send()
        } catch (error) {
            return utils.returnGeneralError(error, reply)
        } finally {
            if (conn) conn.release()
        }
    })

    fastify.get('/verify', async (req, reply) => {
        let conn
        try {
            if (!req.query.token) {
                throw Unauthorized('Verification is invalid')
            }

            conn = await fastify.mysql.getConnection()
            const user = await verification.validate(req.query.token, conn)
            
            if (user?.id) {
                await conn.query(
                    'UPDATE users SET verified = true WHERE id = ?',
                    [user.id]
                )
            }
            conn.release()

            const verificationException = getException(user)
            if (verificationException) {
                throw verificationException
            }

            const JwtToken = utils.generateJwtToken(fastify, user)
            reply.setCookie(process.env.JWT_COOKIE_NAME, JwtToken, {
                path: '/',
                sameSite: 'none',
                secure: true,
                maxAge: (60 * 60 * 24 * 30) // 1 month
            })

            if (req.query.redirectTo) {
                return reply.code(303).redirect(req.query.redirectTo)
            }

            return reply.code(204).send()
        } catch (error) {
            return utils.returnGeneralError(error, reply)
        } finally {
            if (conn) conn.release()
        }
    })

    fastify.post('/signout', async (req, reply) => {
        try {
            reply.clearCookie(process.env.JWT_COOKIE_NAME)
            return reply.code(204).send()
        } catch (error) {
            return utils.returnGeneralError(error, reply)
        }
    })

    done()
}