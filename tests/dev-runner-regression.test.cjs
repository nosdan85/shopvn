const assert = require('node:assert/strict')
const path = require('node:path')
const test = require('node:test')
const { spawn } = require('node:child_process')

test('dev runner does not crash immediately on vite package export resolution', async () => {
  const cwd = path.join(__dirname, '..')
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server/dev.cjs', '--host', '127.0.0.1'], {
      cwd,
      env: { ...process.env, PORT: '4100' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let settled = false

    const finish = (error) => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      if (error) reject(error)
      else resolve()
    }

    child.stdout.on('data', (chunk) => {
      output += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    child.on('exit', (code) => {
      if (settled) return
      finish(new Error(`dev runner exited early with code ${code}\n${output}`))
    })
    setTimeout(() => {
      try {
        assert.doesNotMatch(output, /ERR_PACKAGE_PATH_NOT_EXPORTED/)
        finish()
      } catch (error) {
        finish(error)
      }
    }, 1500)
  })
})
