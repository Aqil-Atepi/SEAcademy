async function main() {
    // Load environtment configuration
    const config = require('./config')
    config.loadConfig()
    
    // Initialize the app
    const logger = require('./logger')
    const fastify = require('fastify')({
        logger: logger
    })
    
    // Register all plugins
    const plugins = require('./plugins')
    await plugins.loadPlugins(fastify)

    // Check mysql connection and load the schema.sql
    const fs = require('fs')
    const SCHEMA_FILE = './schema/schema.sql'
    fs.readFile(SCHEMA_FILE, async (err, data) => {
        try {
            if (err) throw err

            const conn = await fastify.mysql.getConnection()
            fastify.log.info('Successfully connected to database')

            await conn.query(data.toString('utf8'))
            conn.release()
            fastify.log.info(`Successfully run the "${SCHEMA_FILE}" on database`)
        } catch (error) {
            fastify.log.error(error)   
        }
    })
    
    // Register all routes
    const API_VERSION = 'v' + process.env.API_VERSION
    fastify.register(require(`./api/${API_VERSION}/users`), { prefix: `/${API_VERSION}/users` })
    fastify.get('/', async (req, reply) => {
        return "Hello, World"
    })
    
    // Start the app
    fastify.listen({ port: process.env.PORT, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            fastify.log.error(err)
            process.exit(1)
        }

        fastify.log.info(`App listening on: ${address}`)
    })
}

main()