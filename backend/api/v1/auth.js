const utils = require('../../utils')
const { Conflict, Unauthorized, Forbidden } = require('http-errors')
const crypto = require('crypto')
const dateAndTime = require('date-and-time')

module.exports = function (fastify, opts, done) {
    async function getOrCreateTokenVerification(mysqlConn, userEmail) {
        const result = (await mysqlConn.query(
            'SELECT verified, token, token_expiry FROM users WHERE email = ?',
            [userEmail]
        ))[0]

        if (result.length < 1 ) {
            throw Unauthorized("User doesn\'t exists")
        }
        
        const user = result[0]
        if (user.verified) {
            throw Forbidden('User has been verified')
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

    async function sendVerification(req, userEmail, redirectTo, mysqlConn) {
        const { client, sender } = fastify.mailtrap
        const token = await getOrCreateTokenVerification(mysqlConn, userEmail)
        const url = new URL(`${req.protocol}://${req.hostname}/v${process.env.API_VERSION}/auth/verify`)
        
        url.searchParams.append('token', token)
        if (redirectTo) {
            url.searchParams.append('redirectTo', redirectTo)
        }

        client
            .send({
                from: { name: 'SEAcademy', email: sender },
                to: [{ email: userEmail }],
                subject: '-- SEAcademy | Email Verification --',
                text: `Click this link to verify your email in order to complete your account verification: \n${url}`
            })
            .then(() => fastify.log.info(`MAILTRAP: Successfully sending email to ${userEmail}`))
            .catch(err => fastify.log.error(`MAILTRAP: ${err}`))
    }

    async function validateVerification(token, mysqlConn) {
        const result = (await mysqlConn.query(
            'SELECT id, verified, token_expiry FROM users WHERE token = ?',
            [token]
        ))[0]

        if (result.length < 1) {
            throw Unauthorized('Token is invalid')
        }

        const user = result[0]
        const currentDate = new Date(Date.now())
        if (user.token_expiry <= currentDate) {
            throw Unauthorized('Token is expired')
        }

        if (user.verified) {
            throw Forbidden('User has been verified')
        }

        return user
    }

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

            await sendVerification(req, req.body.email, req.body.redirectTo, conn)
            conn.release()

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
                'SELECT id, name, password FROM users WHERE email = ?',
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
    
            if (!isPasswordValid) {
                return Unauthorized(ERR_MSG_INVALID)
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
            await sendVerification(req, req.body.email, req.body.redirectTo, conn)
            conn.release()

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
            const user = await validateVerification(req.query.token, conn)
            await conn.query(
                'UPDATE users SET verified = true WHERE id = ?',
                [user.id]
            )
            conn.release()

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