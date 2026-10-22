const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const root = path.resolve(__dirname, '..')
// Explicit publication boundary. Local documents, receipts and Git history are never copied.
const rootFiles = [
  '.gitignore', 'LICENSE', 'README.md', 'ACCEPTANCE.md', 'CONTRIBUTING.md',
  'SECURITY.md', 'THIRD_PARTY_NOTICES.md', 'app.js', 'app.json', 'app.wxss',
  'config.example.js', 'project.config.json', 'sitemap.json', 'package.json', 'package-lock.json'
]
const trees = {
  pages: /\.(js|json|wxml|wxss)$/,
  utils: /\.js$/,
  assets: /\.png$/,
  scripts: /\.js$/,
  docs: /\.(md|png)$/,
  '.github': /\.(md|yml|yaml)$/,
  desktop: /\.(js|json|html|css|md)$/
}
const cloudFiles = ['index.js', 'normalizer.js', 'paddleocr-client.js', 'package.json', 'package-lock.json', 'README.md', '.env.example']

function collectFiles(sourceRoot) {
  const files = [...rootFiles, ...cloudFiles.map((name) => `cloudfunctions/invoice-ocr/${name}`)]
  function walk(relative, pattern) {
    for (const entry of fs.readdirSync(path.join(sourceRoot, relative), { withFileTypes: true })) {
      if (['node_modules', '.git', '.local', 'release', 'dist', 'build', 'vendor', 'resources'].includes(entry.name)) continue
      const child = `${relative}/${entry.name}`
      if (entry.isSymbolicLink()) throw new Error(`Publication does not accept symlinks: ${child}`)
      if (entry.isDirectory()) walk(child, pattern)
      else if (pattern.test(entry.name) && !entry.name.endsWith('.local.js')) files.push(child)
    }
  }
  for (const [dir, pattern] of Object.entries(trees)) walk(dir, pattern)
  for (const file of files) {
    if (!fs.lstatSync(path.join(sourceRoot, file)).isFile()) throw new Error(`Not a regular source file: ${file}`)
  }
  return files.sort()
}

function checkPublicFile(file, bytes) {
  if (!/\.(js|json|md|yml|yaml|example)$/.test(file) && file !== 'LICENSE') return
  const source = bytes.toString('utf8')
  const checks = [
    /cloud\d-[a-z0-9]{8,}/i,
    /wx[a-f0-9]{16}/i,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /AKIA[A-Z0-9]{16}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /[A-Za-z]:\\Users\\[^\s\\]+/i
  ]
  if (checks.some((pattern) => pattern.test(source))) {
    // Never print the matching value, as it may be a credential.
    throw new Error(`Potential private identifier, credential or personal path in ${file}; inspect locally.`)
  }
}

function prepareRelease() {
  const files = collectFiles(root)
  const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'))
  project.appid = 'touristappid'
  const contents = files.map((file) => {
    const bytes = file === 'project.config.json'
      ? Buffer.from(JSON.stringify(project, null, 2) + '\n')
      : fs.readFileSync(path.join(root, file))
    checkPublicFile(file, bytes)
    return { file, bytes }
  })
  fs.mkdirSync(path.join(root, 'release'), { recursive: true })
  const destination = fs.mkdtempSync(path.join(root, 'release', 'baoxiao-bangbang-'))
  for (const { file, bytes } of contents) {
    const target = path.join(destination, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, bytes, { flag: 'wx' })
  }
  // Verify the actual clean copy, without relying on the author's private config or installed SDKs.
  try {
    for (const script of ['setup.js', 'verify.js', 'verify-flow.js', 'verify-release.js']) {
      execFileSync(process.execPath, [path.join(destination, 'scripts', script)], { cwd: destination, stdio: 'inherit' })
    }
  } finally {
    // setup is for verification only; publishing requires each user to create their own local config.
    const generatedConfig = path.join(destination, 'config.local.js')
    if (fs.existsSync(generatedConfig)) fs.unlinkSync(generatedConfig)
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    checks: 'Clean-copy setup, core verification, mocked page flow and release checks passed.',
    files: contents.map(({ file, bytes }) => ({
      path: file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    }))
  }
  fs.writeFileSync(path.join(destination, 'RELEASE_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' })
  console.log(`Release candidate verified: ${destination}`)
  console.log(`${files.length} public files; no Git history, personal configuration, original receipts or rea checkout.`)
}

if (require.main === module) prepareRelease()

module.exports = { collectFiles, checkPublicFile }
