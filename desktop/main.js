const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron')
const fs = require('fs')
const path = require('path')
const { Library } = require('./lib/library')
const { LocalOcr } = require('./lib/ocr')

let window
let library
let ocr
const applicationRoot = __dirname
const sourceRoot = app.isPackaged ? path.join(process.resourcesPath, 'shared') : path.resolve(__dirname, '..')
const core = {
  ...require(path.join(sourceRoot, 'utils/categories')),
  ...require(path.join(sourceRoot, 'utils/invoice-store')),
  ...require(path.join(sourceRoot, 'utils/report')),
  ...require(app.isPackaged ? path.join(sourceRoot, 'normalizer') : path.join(sourceRoot, 'cloudfunctions/invoice-ocr/normalizer'))
}

app.setName('报销帮帮')
if (process.env.BAOXIAO_SMOKE_TEST === '1' && (!process.env.BAOXIAO_TEST_DATA || !process.env.BAOXIAO_SMOKE_FIXTURES)) throw new Error('自动验证需要独立测试数据目录和测试票据目录。')
if (process.env.BAOXIAO_TEST_DATA) app.setPath('userData', path.resolve(process.env.BAOXIAO_TEST_DATA))
if (!app.requestSingleInstanceLock()) app.exit(0)
app.on('second-instance', () => {
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }
})

function handler(name, fn) {
  ipcMain.handle(name, async (event, data) => {
    if (!window || event.sender !== window.webContents) throw new Error('请求来源不正确。')
    try { return await fn(data) } catch (error) { throw new Error(error.message || '操作失败。') }
  })
}

function setupHandlers() {
  handler('library:snapshot', () => library.snapshot())
  handler('library:create-batch', ({ name, invoiceIds }) => library.createBatch(name, invoiceIds))
  handler('library:delete-batch', (id) => library.deleteBatch(id))
  handler('files:choose', async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openFile', 'multiSelections'], filters: [{ name: '发票图片或 PDF', extensions: ['jpg', 'jpeg', 'png', 'pdf'] }] })
    if (result.canceled) return []
    return result.filePaths.map((file) => {
      try {
        if (fs.statSync(file).size > 80 * 1024 * 1024) throw new Error('超过 80 MB。')
        return library.ingest(path.basename(file), fs.readFileSync(file))
      } catch (error) { return { name: path.basename(file), error: error.message } }
    })
  })
  handler('files:import', ({ name, bytes }) => library.ingest(`${name}`, Buffer.from(bytes)))
  handler('files:read', (id) => new Uint8Array(fs.readFileSync(library.document(id).path)))
  handler('ocr:recognize', (bytes) => ocr.recognize(bytes))
  handler('library:add-page', (data) => library.addPage(data.documentId, data.page, data.text, data.engine, data.confidence))
  handler('library:add-manual', () => library.addManual())
  handler('library:update', ({ id, values }) => library.update(id, values))
  handler('library:remove', (ids) => library.remove(ids))
  handler('library:undo', () => library.undo())
  handler('library:open-data', () => shell.openPath(library.root))
  handler('report:export', async ({ mode, confirmed, invoiceIds }) => {
    const bytes = library.exportReport(mode, confirmed !== false, invoiceIds ?? null)
    const result = await dialog.showSaveDialog(window, { defaultPath: path.join(app.getPath('documents'), `报销报表-${new Date().toISOString().slice(0, 10)}.xlsx`), filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }] })
    if (result.canceled) return null
    fs.writeFileSync(result.filePath, bytes)
    return { path: result.filePath }
  })
  handler('report:export-batch', async ({ batchId, mode, confirmed }) => {
    const batch = library.data.batches.find((item) => item.id === batchId)
    if (!batch) throw new Error('报销批次不存在。')
    const safeName = batch.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 80) || '报销批次'
    const date = new Date().toISOString().slice(0, 10)
    const result = await dialog.showSaveDialog(window, { defaultPath: path.join(app.getPath('documents'), `${safeName}-${date}.zip`), filters: [{ name: '批次资料包', extensions: ['zip'] }] })
    if (result.canceled) return null
    const bundle = library.createBatchPackage(batchId, mode, confirmed !== false)
    fs.writeFileSync(result.filePath, bundle.bytes)
    return { path: result.filePath, invoiceCount: bundle.invoiceCount, originalCount: bundle.originalCount }
  })
  handler('library:backup', async () => {
    const result = await dialog.showSaveDialog(window, { defaultPath: `报销帮帮备份-${new Date().toISOString().slice(0, 10)}.json`, filters: [{ name: '含原件的备份', extensions: ['json'] }] })
    if (result.canceled) return null
    fs.writeFileSync(result.filePath, library.backup(), 'utf8')
    return { path: result.filePath }
  })
  handler('library:restore', async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openFile'], filters: [{ name: '报销帮帮备份', extensions: ['json'] }] })
    if (result.canceled) return null
    const file = result.filePaths[0]
    if (fs.statSync(file).size > 512 * 1024 * 1024) throw new Error('备份超过 512 MB，请保留原文件并联系维护者处理。')
    return library.restoreBackup(fs.readFileSync(file, 'utf8'))
  })
  handler('files:export', async (ids) => {
    const rows = library.data.invoices.filter((item) => ids.includes(item.id) && item.documentId)
    if (!rows.length) throw new Error('请选择含原件的记录。')
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled) return null
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      const doc = library.document(row.documentId)
      const safe = `${row.date || '未标日期'}_${row.merchant || '未填商家'}_${Number(row.amount).toFixed(2)}`.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 100)
      let target = path.join(result.filePaths[0], `${index + 1}_${safe}${doc.ext}`)
      if (fs.existsSync(target)) target = path.join(result.filePaths[0], `${index + 1}_${safe}_${row.id.slice(0, 8)}${doc.ext}`)
      fs.copyFileSync(doc.path, target, fs.constants.COPYFILE_EXCL)
    }
    return { count: rows.length }
  })
}

async function openLibraryWithRecovery(libraryRoot) {
  while (true) {
    try { return new Library(libraryRoot, core) } catch (error) {
      const choice = await dialog.showMessageBox({
        type: 'error',
        title: '无法打开本机发票库',
        message: '应用检测到数据文件无法读取。原数据目录不会被自动覆盖。',
        detail: `${error.message}\n\n选择“从备份恢复”可先验证备份，再用恢复后的数据重建发票库。损坏目录会另行保留。`,
        buttons: ['从备份恢复', '打开数据目录', '退出'],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      })
      if (choice.response === 2) return null
      if (choice.response === 1) {
        await shell.openPath(path.dirname(libraryRoot))
        continue
      }
      const selected = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: '报销帮帮备份', extensions: ['json'] }] })
      if (selected.canceled) continue
      try {
        if (fs.statSync(selected.filePaths[0]).size > 512 * 1024 * 1024) throw new Error('备份超过 512 MB。')
        const result = Library.rebuildFromBackup(libraryRoot, core, fs.readFileSync(selected.filePaths[0], 'utf8'))
        const preserved = result.preservedRoot ? `\n原损坏目录已保存在：${result.preservedRoot}` : ''
        await dialog.showMessageBox({ type: 'info', title: '发票库已恢复', message: `已恢复 ${result.count} 条记录和 ${result.batchCount || 0} 个批次。${preserved}`, buttons: ['继续'] })
      } catch (restoreError) {
        dialog.showErrorBox('恢复失败，原数据目录已保留', restoreError.message)
      }
    }
  }
}

app.whenReady().then(async () => {
  library = await openLibraryWithRecovery(path.join(app.getPath('userData'), 'library'))
  if (!library) { app.quit(); return }
  ocr = new LocalOcr(applicationRoot, path.join(app.getPath('userData'), 'ocr-cache'), (progress) => {
    if (window && !window.isDestroyed()) window.webContents.send('ocr:progress', progress)
  })
  setupHandlers()
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  // All runtime resources and models are bundled. No OCR file or request may leave the device.
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: /^https?:|^wss?:/.test(details.url) }))
  window = new BrowserWindow({ width: 1440, height: 940, minWidth: 1080, minHeight: 720, backgroundColor: '#f5f7f9', title: '报销帮帮 · 本地版', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.loadFile(path.join(__dirname, 'ui/index.html'))
  if (process.env.BAOXIAO_SMOKE_TEST === '1') {
    window.webContents.once('did-finish-load', () => {
      require('./scripts/smoke-runner')({ window, library, app }).catch((error) => {
        console.error(error)
        fs.writeFileSync(path.join(process.env.BAOXIAO_SMOKE_FIXTURES, 'desktop-smoke-error.txt'), error.stack)
        app.exit(1)
      })
    })
  }
}).catch((error) => {
  dialog.showErrorBox('报销帮帮启动失败', `${error.message}\n数据文件不会被自动覆盖。`)
  app.quit()
})
app.on('window-all-closed', () => { ocr?.stop().catch(() => {}); app.quit() })
