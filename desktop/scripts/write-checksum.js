const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const output = path.join(root, 'dist')
const archive = path.join(output, `BaoxiaoBangbang-${require('../package.json').version}-win-x64.zip`)
if (!fs.existsSync(archive)) throw new Error(`Windows ZIP not found: ${archive}`)

async function writeChecksum() {
  const hash = crypto.createHash('sha256')
  for await (const chunk of fs.createReadStream(archive)) hash.update(chunk)
  const digest = hash.digest('hex')
  const sidecar = `${archive}.sha256`
  fs.writeFileSync(sidecar, `${digest}  ${path.basename(archive)}\n`, 'utf8')
  console.log(`SHA-256 written to ${sidecar}`)
}

writeChecksum().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
