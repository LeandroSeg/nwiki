import { beforeAll } from 'vitest'
import { createUser } from '../src/lib/users.js'

beforeAll(async () => {
process.env.PAGES_DIR = './tests/fixtures/pages'
process.env.MEDIA_DIR = './tests/fixtures/media'
process.env.USERS_FILE = './tests/fixtures/test-users.json'
process.env.CONFIG_FILE = './tests/fixtures/test-config.json'
process.env.JWT_SECRET = 'test-secret'
process.env.JWT_EXPIRES_IN = '1h'
await createUser('testuser', 'testpass123')
})
