const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('vercel deploy rewrites SPA routes like /shop to index.html', () => {
  const configPath = path.join(__dirname, '..', 'vercel.json')
  assert.ok(fs.existsSync(configPath), 'vercel.json must exist for Vercel SPA routing')

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  assert.ok(Array.isArray(config.rewrites), 'vercel.json must define rewrites')
  assert.ok(
    config.rewrites.some((rule) => rule.destination === '/index.html'),
    'vercel.json must rewrite app routes to /index.html',
  )
})
