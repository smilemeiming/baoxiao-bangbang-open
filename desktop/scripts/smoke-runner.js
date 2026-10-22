const fs = require('fs')
const path = require('path')
const assert = require('assert/strict')

module.exports = async function smoke({ window, library, app }) {
  const fixtures = process.env.BAOXIAO_SMOKE_FIXTURES
  if (!fixtures) throw new Error('A test fixture directory is required.')
  const documents = ['synthetic-invoice.png', 'synthetic-text.pdf', 'synthetic-scan.pdf'].map((name) => library.ingest(name, fs.readFileSync(path.join(fixtures, name))))
  const errors = []
  window.webContents.on('console-message', (event) => { if (/error|not allowed|failed/i.test(event.message)) errors.push(event.message) })
  const ready = await window.webContents.executeJavaScript("typeof window.invoiceApp === 'object'")
  assert.equal(ready, true, 'preload bridge is available')
  await window.webContents.executeJavaScript(`import('./app.js').then(module => module.processDocuments(${JSON.stringify(documents)}))`)
  const importMessage = await window.webContents.executeJavaScript("document.getElementById('toast').textContent")
  assert(!importMessage.includes('需手动补全'), importMessage)
  const rows = library.data.invoices
  assert.equal(rows.length, 4, 'one image, a two-page text PDF and one scanned PDF produce four records')
  assert.equal(rows.filter((row) => row.ocrStatus === 'PDF 文字提取').length, 2)
  assert.equal(rows.filter((row) => row.ocrStatus === '本地 OCR').length, 2)
  for (const row of rows) {
    assert(row.amount === 108 || row.amount === 66, `actual recognized amount: ${row.amount}`)
    assert.equal(row.date, '2026-06-18')
    assert.equal(row.invoiceNo, '24442000000012345678')
    assert.equal(row.merchant, '测试办公用品有限公司')
    assert.equal(row.confirmed, false)
    library.update(row.id, { confirmed: true })
  }
  fs.writeFileSync(path.join(fixtures, 'desktop-report.xlsx'), library.exportReport('detail'))
  await window.webContents.executeJavaScript("import('./app.js').then(module => module.refresh())")
  await new Promise((resolve) => setTimeout(resolve, 300))
  fs.writeFileSync(path.join(fixtures, 'desktop-library.png'), (await window.webContents.capturePage()).toPNG())
  await window.webContents.executeJavaScript(`import('./app.js').then(module => module.openEditor(${JSON.stringify(rows[0].id)}))`)
  assert.equal(await window.webContents.executeJavaScript("document.getElementById('preview').querySelectorAll('canvas').length"), 1, 'scanned PDF original renders in the editor')
  await new Promise((resolve) => setTimeout(resolve, 300))
  fs.writeFileSync(path.join(fixtures, 'desktop-detail.png'), (await window.webContents.capturePage()).toPNG())
  const result = { records: rows.map(({ fileName, page, amount, date, merchant, invoiceNo, ocrStatus }) => ({ fileName, page, amount, date, merchant, invoiceNo, ocrStatus })), consoleErrors: errors }
  fs.writeFileSync(path.join(fixtures, 'desktop-smoke-result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  if (!process.env.BAOXIAO_SMOKE_KEEP_OPEN) app.quit()
}
