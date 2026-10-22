const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Library } = require('../lib/library')
const core = {
  ...require('../../utils/categories'),
  ...require('../../utils/invoice-store'),
  ...require('../../utils/report'),
  ...require('../../cloudfunctions/invoice-ocr/normalizer')
}
const text = '电子发票（普通发票）\n发票号码：24442000000012345678\n开票日期：2026年06月18日\n销售方名称：测试办公用品有限公司\n购买方名称：示例人员\n项目名称：办公用品\n价税合计（小写）：￥108.00'
const image = Buffer.from([255, 216, 255, 0, 1, 2, 3])
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baoxiao-library-'))
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()))
    assert(path.basename(root).startsWith('baoxiao-library-'))
    fs.rmSync(root, { recursive: true, force: true })
  })
  return new Library(root, core)
}

test('import archives identical bytes and deduplicates confirmed document content', (t) => {
  const lib = fixture(t)
  const doc = lib.ingest('发票_金额9999.jpg', image)
  assert.deepEqual(fs.readFileSync(lib.document(doc.id).path), image)
  const invoice = lib.addPage(doc.id, 1, text, '本地 OCR', 81)
  assert.equal(invoice.amount, 108)
  assert.equal(invoice.invoiceNo, '24442000000012345678')
  assert.equal(invoice.merchant, '测试办公用品有限公司')
  assert.equal(invoice.buyerName, '示例人员')
  assert.equal(invoice.confirmed, false)
  assert.equal(invoice.ocrStatus, '本地 OCR')
  assert.equal(invoice.confidence, 81)
  assert.equal(lib.ingest('重命名的同一张.jpg', image).duplicate, true)
  assert.equal(lib.addPage(doc.id, 1, text, '本地 OCR', 81).id, invoice.id)
  const reloaded = new Library(lib.root, core)
  assert.equal(reloaded.snapshot().invoices.length, 1)
  assert.equal(reloaded.snapshot().invoices[0].amount, 108)
})

test('failed OCR cannot read amount or invoice number from filename', (t) => {
  const lib = fixture(t)
  const doc = lib.ingest('发票_金额9999_2026-06-01_24442000000012345678.jpg', image)
  const row = lib.addPage(doc.id, 1, '', '识别失败', 0)
  assert.equal(row.amount, 0)
  assert.equal(row.date, '')
  assert.equal(row.invoiceNo, '')
  assert.equal(row.confirmed, false)
  assert(row.ocrError)
  assert.throws(() => lib.exportReport('detail'), /先核对/)
})

test('validated edits persist and only confirmed invoices export by default', (t) => {
  const lib = fixture(t)
  const doc = lib.ingest('test.jpg', image)
  const row = lib.addPage(doc.id, 1, text, 'PDF 文字提取', 0)
  lib.addManual()
  assert.throws(() => lib.update(row.id, { amount: -10 }), /金额/)
  assert.equal(row.amount, 108)
  lib.update(row.id, { merchant: '测试商家', amount: 120.25, date: '2026-06-20', categoryId: 'office', invoiceNo: '0012345678', confirmed: true })
  const bytes = lib.exportReport('detail')
  assert.deepEqual([...bytes.subarray(0, 4)], [80, 75, 3, 4])
  assert(bytes.includes(Buffer.from('120.25')))
  assert(bytes.includes(Buffer.from('0012345678')))
  assert(!bytes.includes(Buffer.from('手动录入')))
  assert.equal(new Library(lib.root, core).snapshot().invoices[0].confirmed, false)
})

test('delete and restore preserve originals and survive restarts', (t) => {
  const lib = fixture(t)
  const doc = lib.ingest('test.jpg', image)
  const row = lib.addPage(doc.id, 1, text, '本地 OCR', 80)
  lib.remove([row.id])
  assert.equal(lib.snapshot().invoices.length, 0)
  assert(fs.existsSync(lib.document(doc.id).path))
  const restarted = new Library(lib.root, core)
  restarted.undo()
  assert.equal(restarted.snapshot().invoices[0].id, row.id)
  restarted.undo()
  assert.equal(restarted.snapshot().invoices.length, 1)
})

test('rejects unsupported, empty and mismatched files; corrupt library is never overwritten', (t) => {
  const lib = fixture(t)
  assert.throws(() => lib.ingest('file.exe', image), /仅支持/)
  assert.throws(() => lib.ingest('file.jpg', Buffer.alloc(0)), /为空/)
  assert.throws(() => lib.ingest('file.pdf', image), /不一致/)
  assert.throws(() => lib.document('../../outside'), /没有找到/)
  fs.writeFileSync(lib.dbPath, 'corrupt-existing-data')
  assert.throws(() => new Library(lib.root, core))
  assert.equal(fs.readFileSync(lib.dbPath, 'utf8'), 'corrupt-existing-data')
})

test('opens version-one libraries created before batch support', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baoxiao-legacy-library-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.writeFileSync(path.join(root, 'library.json'), JSON.stringify({ version: 1, documents: [], invoices: [], trash: [] }))
  const lib = new Library(root, core)
  assert.deepEqual(lib.data.batches, [])
  assert.deepEqual(lib.snapshot().batches, [])
})

test('backup includes original bytes and restore merges without overwriting or duplicates', (t) => {
  const source = fixture(t)
  const doc = source.ingest('test.jpg', image)
  const row = source.addPage(doc.id, 1, text, '本地 OCR', 88)
  source.update(row.id, { merchant: '已核对的测试商家', amount: 123.45, confirmed: true })
  source.createBatch('六月报销', [row.id])
  const target = fixture(t)
  const personal = target.addManual()
  const backup = source.backup()
  assert.deepEqual(target.restoreBackup(backup), { count: 1, batchCount: 1 })
  assert.equal(target.data.invoices.length, 2)
  assert(target.data.invoices.some((item) => item.id === personal.id))
  const restored = target.data.invoices.find((item) => item.documentId)
  assert.equal(restored.amount, 123.45)
  assert.equal(restored.confirmed, true)
  assert.deepEqual(fs.readFileSync(target.document(restored.documentId).path), image)
  assert.equal(target.snapshot().batches[0].invoiceCount, 1)
  assert.deepEqual(target.restoreBackup(backup), { count: 0, batchCount: 0 })
  assert.equal(target.data.invoices.length, 2)
})

test('failed backup validation leaves existing library and originals untouched', (t) => {
  const source = fixture(t)
  const first = source.ingest('first.jpg', image)
  source.addPage(first.id, 1, text, '本地 OCR', 80)
  const second = source.ingest('second.jpg', Buffer.from([255, 216, 255, 9, 8, 7]))
  source.addPage(second.id, 1, text, '本地 OCR', 80)
  const backup = JSON.parse(source.backup())
  backup.invoices[0].date = '2026-99-99'

  const target = fixture(t)
  const personal = target.addManual()
  const before = JSON.stringify(target.data)
  assert.throws(() => target.restoreBackup(JSON.stringify(backup)), /无效日期/)
  assert.equal(JSON.stringify(target.data), before)
  assert.equal(target.data.documents.length, 0)
  assert.deepEqual(fs.readdirSync(target.documentsPath), [])
  assert.equal(target.data.invoices[0].id, personal.id)
})

test('damaged library recovery preserves the old directory and rebuilds from a valid backup', (t) => {
  const lib = fixture(t)
  const doc = lib.ingest('test.jpg', image)
  lib.addPage(doc.id, 1, text, '本地 OCR', 80)
  const backup = lib.backup()
  fs.writeFileSync(lib.dbPath, 'corrupt-existing-data')

  const result = Library.rebuildFromBackup(lib.root, core, backup)
  t.after(() => fs.rmSync(result.preservedRoot, { recursive: true, force: true }))
  assert.equal(fs.readFileSync(path.join(result.preservedRoot, 'library.json'), 'utf8'), 'corrupt-existing-data')
  const recovered = new Library(lib.root, core)
  assert.equal(recovered.snapshot().invoices.length, 1)
  assert.deepEqual(fs.readFileSync(recovered.document(recovered.data.invoices[0].documentId).path), image)
})

test('invalid recovery backup never changes the damaged directory', (t) => {
  const lib = fixture(t)
  fs.writeFileSync(lib.dbPath, 'corrupt-existing-data')
  const before = fs.readFileSync(lib.dbPath, 'utf8')
  assert.throws(() => Library.rebuildFromBackup(lib.root, core, '{invalid'), /JSON|position/i)
  assert.equal(fs.readFileSync(lib.dbPath, 'utf8'), before)
  assert.deepEqual(fs.readdirSync(path.dirname(lib.root)).filter((name) => name.startsWith(`${path.basename(lib.root)}.recovery-`)), [])
})

test('batch package exports the chosen report and includes each archived original only once', (t) => {
  const lib = fixture(t)
  const doc = lib.ingest('same-original.jpg', image)
  const first = lib.addPage(doc.id, 1, text, '本地 OCR', 80)
  const second = lib.addPage(doc.id, 2, text, '本地 OCR', 80)
  lib.update(first.id, { invoiceNo: '0000000001', merchant: '测试商家', amount: 100, date: '2026-06-18', confirmed: true })
  lib.update(second.id, { invoiceNo: '0000000002', merchant: '测试商家', amount: 200, date: '2026-06-19', confirmed: true })
  const batch = lib.createBatch('六月差旅报销', [first.id, second.id, first.id])
  assert.equal(batch.invoiceCount, 2)
  assert.equal(batch.invoiceIds.length, 2)

  const bundle = lib.createBatchPackage(batch.id, 'detail', true)
  assert.equal(bundle.invoiceCount, 2)
  assert.equal(bundle.originalCount, 1)
  assert.deepEqual([...bundle.bytes.subarray(0, 4)], [80, 75, 3, 4])
  assert(bundle.bytes.includes(Buffer.from('0000000001')))
  assert(bundle.bytes.includes(Buffer.from('0000000002')))
  const names = zipEntryNames(bundle.bytes)
  assert.equal(names.filter((name) => name.startsWith('原件/')).length, 1)
  assert(names.includes('报销报表.xlsx'))
  assert(names.includes('导出说明.txt'))

  const selectedExport = lib.exportReport('detail', false, [second.id])
  assert(selectedExport.includes(Buffer.from('0000000002')))
  assert(!selectedExport.includes(Buffer.from('0000000001')))
  lib.deleteBatch(batch.id)
  assert.equal(lib.data.invoices.length, 2)
  assert.equal(lib.snapshot().batches.length, 0)
})

function zipEntryNames(bytes) {
  let end = bytes.length - 22
  while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end--
  assert(end >= 0, 'ZIP end record should exist')
  const count = bytes.readUInt16LE(end + 10)
  let offset = bytes.readUInt32LE(end + 16)
  const names = []
  for (let index = 0; index < count; index++) {
    assert.equal(bytes.readUInt32LE(offset), 0x02014b50)
    const nameLength = bytes.readUInt16LE(offset + 28)
    const extraLength = bytes.readUInt16LE(offset + 30)
    const commentLength = bytes.readUInt16LE(offset + 32)
    names.push(bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'))
    offset += 46 + nameLength + extraLength + commentLength
  }
  return names
}
