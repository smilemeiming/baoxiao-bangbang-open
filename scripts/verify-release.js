const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const vm = require('vm')
const { execFileSync } = require('child_process')
const { collectFiles, checkPublicFile } = require('./prepare-release')

const root = path.resolve(__dirname, '..')
const files = collectFiles(root)
assert(!files.some((file) => /^(rea|sample-invoices|\.local|\.git|release)\//.test(file)))
assert(!files.includes('config.local.js'))
assert(!files.includes('project.private.config.json'))
files.forEach((file) => {
  // prepare-release replaces a locally configured AppID with a public one.
  if (file !== 'project.config.json') checkPublicFile(file, fs.readFileSync(path.join(root, file)))
})
assert(fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').includes('2026 Baoxiao Bangbang contributors'))
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
for (const cloudEnvId of ['', 'test-environment']) {
  const calls = []
  let app
  vm.runInNewContext(appSource, {
    require(name) {
      if (name === './config.local') return { cloudEnvId }
      if (name === './utils/invoice-store') return { ensureInvoiceStore() {} }
      throw new Error(`Unexpected import: ${name}`)
    },
    App(value) { app = value },
    wx: { cloud: { init(options) { calls.push(options) } }, getStorageSync() {}, setStorageSync() {} }
  })
  app.onLaunch()
  assert.strictEqual(app.globalData.cloudEnabled, Boolean(cloudEnvId))
  assert.strictEqual(calls.length, cloudEnvId ? 1 : 0)
  if (cloudEnvId) assert.strictEqual(calls[0].env, cloudEnvId)
}

// No configured environment must mean no upload, even if wx.cloud exists.
async function verifyDisabledCloud() {
  const previousWx = global.wx
  const previousGetApp = global.getApp
  let uploadCount = 0
  try {
    global.wx = { cloud: { uploadFile() { uploadCount++ } } }
    global.getApp = () => ({ globalData: { cloudEnabled: false } })
    const { recognizeFilesAsync } = require('../utils/invoice-recognition')
    const rows = await recognizeFilesAsync([{ name: '发票_金额123.00_2026-06-01.jpg', path: '/test.jpg' }])
    assert.strictEqual(uploadCount, 0)
    assert.strictEqual(rows[0].amount, 0)
    assert(rows[0].ocrError)
    global.getApp = () => ({ globalData: { cloudEnabled: true } })
    for (const ocrStatus of ['未配置OCR', 'PaddleOCR失败', 'PaddleOCR无文本']) {
      global.wx.cloud.uploadFile = (options) => options.success({ fileID: 'cloud://test' })
      global.wx.cloud.callFunction = (options) => options.success({ result: { data: [{
        amount: 123, date: '2026-06-01', invoiceNo: 'filename-only', ocrStatus
      }] } })
      const result = await recognizeFilesAsync([{ name: '发票_金额123.00_2026-06-01.jpg', path: '/test.jpg' }])
      assert.strictEqual(result[0].amount, 0)
      assert.strictEqual(result[0].invoiceNo, '')
      assert.strictEqual(result[0].date, '')
      assert(result[0].ocrError)
    }
  } finally {
    if (previousWx === undefined) delete global.wx
    else global.wx = previousWx
    if (previousGetApp === undefined) delete global.getApp
    else global.getApp = previousGetApp
  }
}

// Setup must work in a fresh download and never overwrite the user's configuration.
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'invoice-setup-'))
try {
  fs.mkdirSync(path.join(sandbox, 'scripts'))
  fs.copyFileSync(path.join(root, 'scripts/setup.js'), path.join(sandbox, 'scripts/setup.js'))
  fs.copyFileSync(path.join(root, 'config.example.js'), path.join(sandbox, 'config.example.js'))
  const runSetup = () => execFileSync(process.execPath, [path.join(sandbox, 'scripts/setup.js')], { stdio: 'inherit' })
  runSetup()
  assert.strictEqual(require(path.join(sandbox, 'config.local.js')).cloudEnvId, '')
  fs.writeFileSync(path.join(sandbox, 'config.local.js'), 'personal configuration')
  runSetup()
  assert.strictEqual(fs.readFileSync(path.join(sandbox, 'config.local.js'), 'utf8'), 'personal configuration')
} finally {
  assert.strictEqual(path.dirname(sandbox), path.resolve(os.tmpdir()))
  assert(path.basename(sandbox).startsWith('invoice-setup-'))
  fs.rmSync(sandbox, { recursive: true, force: true })
}
assert.throws(() => checkPublicFile('config.js', Buffer.from('wx' + '1234567890abcdef')))
assert.throws(() => checkPublicFile('config.js', Buffer.from('cloud1-' + '1234567890abcdef')))

verifyDisabledCloud().then(() => {
  console.log('Release verification passed: public file boundary, configuration setup, cloud opt-in, license and identifier checks')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
