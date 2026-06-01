const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const dbSource = fs.readFileSync(path.join(__dirname, '..', 'server', 'db.cjs'), 'utf8')
const schemaMatch = dbSource.match(/const schemaSql = `([\s\S]*?)`;\s*function migrate\(/)
const schemaSql = schemaMatch ? schemaMatch[1] : ''

test('schemaSql includes referral fields and referral_rewards table for fresh and remote databases', () => {
  assert.match(schemaSql, /referral_code TEXT/i)
  assert.match(schemaSql, /referred_by_user_id/i)
  assert.match(schemaSql, /referral_linked_at TEXT/i)
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS referral_rewards/i)
})
