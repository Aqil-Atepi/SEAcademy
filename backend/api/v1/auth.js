const utils = require('../../utils')
const { Conflict, Unauthorized } = require('http-errors')
const crypto = require('crypto')
const dateAndTime = require('date-and-time')

module.exports = function (fastify, opts, done) {
    async function sendVerification(verifyUrl, mysqlConn, userId, userEmail) {
        const { client, sender } = fastify.mailtrap
        const token = crypto.randomBytes(128).toString('hex')
        const tokenExpiry = dateAndTime.addHours(new Date(Date.now()), 3)
        const url = new URL(verifyUrl)
        
        await mysqlConn.query(
            'UPDATE users SET token = ?, token_expiry = ? WHERE id = ?',
            [token, tokenExpiry, userId]
        )
        
        url.searchParams.append('token', token)
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
            'SELECT id, token_expiry FROM users WHERE token = ?',
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

        return user
    }

    fastify.post('/signup', async (req, reply) => {
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

            const conn = await fastify.mysql.getConnection()
            await conn.query(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [req.body.name, req.body.email, req.body.password]
            )
            const result = (await conn.query(
                'SELECT id FROM users WHERE email = ?', 
                [req.body.email]
            ))[0]

            if (result.length < 1) {
                throw Conflict('Failed to get user data')
            }

            const user = result[0]
            await sendVerification(`${req.protocol}://${req.hostname}/v1/auth/verify`, conn, user.id, req.body.email)
            conn.release()

            return reply.code(204).send()
        } catch (error) {
            if (conn) conn.release()
            return utils.returnGeneralError(error, reply)
        }
    })

    fastify.post('/signin', async (req, reply) => {
        try {
            if (!(utils.validateEmail(req.body.email) && req.body.password)) {
                throw Unauthorized('Input is invalid.')
            }
    
            const hmac = crypto.createHmac('sha256', req.body.password)
            req.body.password = hmac.digest('hex')
    
            const conn = await fastify.mysql.getConnection()
            const result = (await conn.query(
                'SELECT id, name, password FROM users WHERE email = ?',
                [req.body.email]
            ))[0]
            conn.release()
            
            const user = result.length > 0 ? result[0] : { password: '' }
            const isPasswordValid = crypto.timingSafeEqual(
                Buffer.from(req.body.password),
                Buffer.from(user.password)
            )
    
            if (!isPasswordValid) {
                return Unauthorized('Email or password is invalid.')
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
            if (conn) conn.release()
            return utils.returnGeneralError(error, reply)
        }
    })

    fastify.get('/verify', async (req, reply) => {
        try {
            if (!req.query.token) {
                throw Unauthorized('Verification is invalid')
            }

            const conn = await fastify.mysql.getConnection()
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

            return reply.code(204).send()
        } catch (error) {
            if (conn) conn.release()
            return utils.returnGeneralError(error, reply)
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