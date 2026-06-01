const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
)

test('npm run dev boots the full app instead of frontend-only vite', () => {
  assert.equal(packageJson.scripts.dev, 'node server/dev.cjs')
})
