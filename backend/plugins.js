const { Forbidden, Unauthorized } = require('http-errors')

async function loadPlugins(fastify) {
    fastify.register(require('@fastify/cors'), {
        origin: process.env.ALLOWED_ORIGINS.split(' '),
        credentials: true,
        exposedHeaders: ['X-Ratelimit-Reset', 'Retry-After']
    })

    await fastify.register(require('@fastify/jwt'), {
        secret: process.env.JWT_SECRET_KEY
    })
    fastify.decorate('authenticate', async (req, reply) => {
        const token = req.cookies[process.env.JWT_COOKIE_NAME]
        if (!token) {
            return reply.send(Unauthorized("You still haven't login yet."))
        }

        const decoded = fastify.jwt.decode(token)
        const connection = await fastify.mysql.getConnection()
        const result = (await connection.query('SELECT username FROM users WHERE id = ?', [decoded.id]))[0][0]

        if (!result.username) {
            return reply.send(Unauthorized("Invalid authentication."))
        }
    })
    fastify.register(require('@fastify/cookie')), {
        secret: process.env.JWT_COOKIE_KEY,
        hook: 'preValidation'
    }

    await fastify.register(require('@fastify/rate-limit'), {
        max: Number(process.env.ALLOWED_REQUEST_PER_MINUTE),
        timeWindow: 60 * 1000,
        hook: 'preHandler',
        keyGenerator: (req) => req.cookies[process.env.JWT_COOKIE_NAME]
    })

    await fastify.register(require('@fastify/mysql'), {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        multipleStatements: true,
        promise: true
    })

    fastify.register(require('@fastify/formbody'))
    fastify.register(require('@fastify/compress'))
}

module.exports = {
    loadPlugins
}