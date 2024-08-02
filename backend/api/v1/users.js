const utils = require('../../utils')
const { Conflict, Unauthorized } = require('http-errors')
const crypto = require('crypto')

module.exports = function (fastify, opts, done) {
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
            conn.release()
            
            if (result.length < 1) {
                throw Conflict('Failed to get user data')
            }

            const user = result[0]
            const token = utils.generateJwtToken(fastify, user)
            reply.setCookie(process.env.JWT_COOKIE_NAME, token, {
                path: '/',
                sameSite: 'none',
                secure: true,
                maxAge: (60 * 60 * 24 * 30) // 1 month
            })

            return reply.code(201).send({
                name: req.body.name,
                email: req.body.email
            })
        } catch (error) {
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

            const token = utils.generateJwtToken(fastify, user)
            reply.setCookie(process.env.JWT_COOKIE_NAME, token, {
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