const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const EDITABLE = ['merchant', 'buyerName', 'buyerTaxNo', 'sellerTaxNo', 'invoiceNo', 'invoiceCode', 'invoiceType', 'date', 'amount', 'taxAmount', 'pretaxAmount', 'categoryId', 'department', 'departmentOwner', 'remark', 'confirmed']
const MAX_FILE_SIZE = 80 * 1024 * 1024

class Library {
  constructor(root, core) {
    this.root = root
    this.core = core
    this.dbPath = path.join(root, 'library.json')
    this.documentsPath = path.join(root, 'documents')
    this.data = fs.existsSync(this.dbPath)
      ? JSON.parse(fs.readFileSync(this.dbPath, 'utf8'))
      : { version: 1, documents: [], invoices: [], trash: [], batches: [] }
    if (this.data.version !== 1 || !Array.isArray(this.data.invoices) || !Array.isArray(this.data.documents) || !Array.isArray(this.data.trash)) {
      throw new Error('数据文件格式不正确。请保留数据目录，恢复备份后重试。')
    }
    if (this.data.batches == null) this.data.batches = []
    if (!Array.isArray(this.data.batches) || this.data.batches.some((batch) => !batch || typeof batch.id !== 'string' || !batch.id || typeof batch.name !== 'string' || !Array.isArray(batch.invoiceIds) || batch.invoiceIds.some((id) => typeof id !== 'string'))) throw new Error('报销批次数据格式不正确。请保留数据目录，恢复备份后重试。')
    fs.mkdirSync(this.documentsPath, { recursive: true })
  }

  static rebuildFromBackup(root, core, content) {
    const libraryRoot = path.resolve(root)
    const suffix = crypto.randomUUID()
    const stagingRoot = `${libraryRoot}.recovery-${suffix}`
    const preservedRoot = `${libraryRoot}.damaged-${new Date().toISOString().replace(/[:.]/g, '-')}-${suffix.slice(0, 8)}`
    let preserved = false

    try {
      const stagingLibrary = new Library(stagingRoot, core)
      const result = stagingLibrary.restoreBackup(content)
      if (fs.existsSync(libraryRoot)) {
        fs.renameSync(libraryRoot, preservedRoot)
        preserved = true
      }
      try {
        fs.renameSync(stagingRoot, libraryRoot)
      } catch (error) {
        if (preserved) {
          try { fs.renameSync(preservedRoot, libraryRoot); preserved = false } catch (rollbackError) {
            throw new Error(`恢复数据失败：${error.message}。损坏的数据目录仍保存在 ${preservedRoot}；回滚也失败：${rollbackError.message}`)
          }
        }
        throw error
      }
      return { ...result, preservedRoot: preserved ? preservedRoot : '' }
    } catch (error) {
      if (fs.existsSync(stagingRoot)) {
        try { fs.rmSync(stagingRoot, { recursive: true, force: true }) } catch {}
      }
      throw error
    }
  }

  persist() {
    this.persistData(this.data)
  }

  persistData(data) {
    const temporary = `${this.dbPath}.tmp`
    try {
      fs.writeFileSync(temporary, JSON.stringify(data, null, 2), 'utf8')
      fs.renameSync(temporary, this.dbPath)
    } catch (error) {
      try { fs.rmSync(temporary, { force: true }) } catch {}
      throw error
    }
  }

  snapshot() {
    return {
      invoices: this.data.invoices.map((item) => this.core.decorateInvoice(item)),
      categories: this.core.CATEGORIES,
      modes: this.core.REPORT_MODES,
      batches: this.listBatches(),
      canUndo: this.data.trash.length > 0,
      dataPath: this.root
    }
  }

  listBatches() {
    const invoicesById = new Map(this.data.invoices.map((item) => [item.id, item]))
    return this.data.batches.map((batch) => {
      const invoices = batch.invoiceIds.map((id) => invoicesById.get(id)).filter(Boolean)
      return {
        id: batch.id,
        name: batch.name,
        invoiceIds: [...batch.invoiceIds],
        createdAt: batch.createdAt,
        invoiceCount: invoices.length,
        amount: invoices.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      }
    })
  }

  createBatch(name, invoiceIds) {
    const cleanName = `${name || ''}`.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
    if (!cleanName) throw new Error('请填写批次名称。')
    if (!Array.isArray(invoiceIds) || !invoiceIds.length || invoiceIds.length > 10000) throw new Error('请选择要加入批次的记录。')
    const uniqueIds = [...new Set(invoiceIds)]
    if (uniqueIds.some((id) => typeof id !== 'string' || !this.data.invoices.some((item) => item.id === id))) throw new Error('批次包含不存在的发票记录，请刷新后重试。')
    if (this.data.batches.length >= 1000) throw new Error('批次数量已达到上限。')
    const batch = { id: crypto.randomUUID(), name: cleanName, invoiceIds: uniqueIds, createdAt: Date.now() }
    this.data.batches.unshift(batch)
    this.persist()
    return this.listBatches()[0]
  }

  deleteBatch(id) {
    const index = this.data.batches.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('报销批次不存在。')
    this.data.batches.splice(index, 1)
    this.persist()
  }

  createBatchPackage(batchId, mode, onlyConfirmed = true) {
    if (!this.core.REPORT_MODES.some((item) => item.id === mode)) throw new Error('报表类型不正确。')
    const batch = this.data.batches.find((item) => item.id === batchId)
    if (!batch) throw new Error('报销批次不存在。')
    const batchInvoiceIds = new Set(batch.invoiceIds)
    const candidates = this.data.invoices.filter((item) => batchInvoiceIds.has(item.id) && (!onlyConfirmed || item.confirmed))
    const rows = this.core.getReportInvoices(candidates, mode)
    if (!rows.length) throw new Error('当前核对状态和报表类型下没有可导出的记录。')

    const files = [{ name: '报销报表.xlsx', data: Buffer.from(this.core.buildXlsxWorkbook(rows, { mode })) }]
    const seenDocuments = new Set()
    let totalBytes = files[0].data.length
    for (const row of rows) {
      if (!row.documentId || seenDocuments.has(row.documentId)) continue
      const document = this.document(row.documentId)
      const bytes = fs.readFileSync(document.path)
      totalBytes += bytes.length
      if (totalBytes > 512 * 1024 * 1024) throw new Error('批次资料包超过 512 MB，请拆分批次后分别导出。')
      const originalName = path.basename(document.name)
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
        .replace(/^[. ]+|[. ]+$/g, '')
        .slice(0, 160) || `原件${document.ext}`
      const index = seenDocuments.size + 1
      files.push({ name: `原件/${String(index).padStart(3, '0')}_${originalName}`, data: bytes })
      seenDocuments.add(row.documentId)
    }
    files.push({
      name: '导出说明.txt',
      data: `报销帮帮批次资料包\n批次：${batch.name}\n记录：${rows.length} 条\n原件：${seenDocuments.size} 份（按归档原件去重）\n生成时间：${new Date().toLocaleString('zh-CN')}\n`
    })
    if (files.length > 65535) throw new Error('批次文件数量过多，请拆分批次后分别导出。')
    return { bytes: Buffer.from(this.core.createZip(files)), invoiceCount: rows.length, originalCount: seenDocuments.size }
  }

  ingest(name, bytes) {
    const ext = path.extname(name).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) throw new Error('仅支持 JPG、PNG 和 PDF。')
    if (!bytes.length || bytes.length > MAX_FILE_SIZE) throw new Error('文件为空或超过 80 MB。')
    const signature = bytes.subarray(0, 5).toString('ascii')
    const isPdf = signature === '%PDF-'
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const isJpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    if (!(ext === '.pdf' ? isPdf : ext === '.png' ? isPng : isJpg)) throw new Error('文件内容与扩展名不一致，或文件已损坏。')
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
    const existing = this.data.documents.find((doc) => doc.sha256 === sha256)
    if (existing && this.data.invoices.some((item) => item.documentId === existing.id)) return { ...existing, duplicate: true, pages: this.documentPages(existing.id) }
    if (existing) return { ...existing, duplicate: false }
    const id = crypto.randomUUID()
    fs.writeFileSync(path.join(this.documentsPath, `${id}${ext}`), bytes, { flag: 'wx' })
    const doc = { id, name: path.basename(name), ext, sha256, createdAt: Date.now() }
    this.data.documents.push(doc)
    this.persist()
    return { ...doc, duplicate: false }
  }

  documentPages(documentId) {
    return this.data.invoices
      .filter((item) => item.documentId === documentId)
      .map((item) => ({
        page: item.page,
        ocrStatus: item.ocrStatus,
        retryable: item.ocrStatus === '识别失败' && !item.updatedAt && !item.confirmed && !item.merchant && !item.date && !Number(item.amount)
      }))
  }

  document(id) {
    const doc = this.data.documents.find((item) => item.id === id)
    if (!doc) throw new Error('没有找到原件。')
    return { ...doc, path: path.join(this.documentsPath, `${doc.id}${doc.ext}`) }
  }

  addPage(documentId, page, text, engine, confidence) {
    const doc = this.document(documentId)
    if (!Number.isInteger(page) || page < 1 || page > 500) throw new Error('页码不正确。')
    const existing = this.data.invoices.find((item) => item.documentId === documentId && item.page === page)
    if (existing && !(existing.ocrStatus === '识别失败' && !existing.updatedAt && !existing.confirmed && !existing.merchant && !existing.date && !Number(existing.amount))) return existing
    const invoice = this.createPageInvoice(doc, page, text, engine, confidence)
    if (existing) Object.assign(existing, invoice, { id: existing.id, createdAt: existing.createdAt })
    else this.data.invoices.unshift(invoice)
    this.persist()
    return existing || invoice
  }

  addManual() {
    const category = this.core.CATEGORIES.at(-1)
    const item = { id: crypto.randomUUID(), documentId: '', page: 1, fileName: '手动录入', merchant: '', date: '', amount: 0, categoryId: category.id, categoryName: category.name, ocrStatus: '人工录入', confidence: 0, confirmed: false, createdAt: Date.now() }
    this.data.invoices.unshift(item)
    this.persist()
    return item
  }

  update(id, values) {
    const item = this.data.invoices.find((invoice) => invoice.id === id)
    if (!item) throw new Error('记录不存在。')
    const updates = this.prepareUpdates(item, values)
    const category = this.core.CATEGORIES.find((cat) => cat.id === updates.categoryId)
    Object.assign(item, updates, { categoryName: category.name, categoryIcon: category.icon, categoryColor: category.color, confirmed: Boolean(updates.confirmed), updatedAt: Date.now(), ocrError: updates.confirmed ? '' : item.ocrError })
    this.persist()
    return item
  }

  prepareUpdates(item, values) {
    const updates = Object.fromEntries(EDITABLE.filter((key) => Object.hasOwn(values, key)).map((key) => [key, values[key]]))
    for (const key of ['amount', 'taxAmount', 'pretaxAmount']) {
      if (!Object.hasOwn(updates, key)) continue
      if (key !== 'amount' && updates[key] === '') continue
      const value = Number(updates[key])
      if (updates[key] === '' || !Number.isFinite(value) || value < 0 || value > 1e12) throw new Error('金额须为有效的非负数字。')
      updates[key] = Math.round(value * 100) / 100
    }
    if (updates.date && (!/^\d{4}-\d{2}-\d{2}$/.test(updates.date) || new Date(`${updates.date}T00:00:00Z`).toISOString().slice(0, 10) !== updates.date)) throw new Error('请填写有效日期。')
    const next = { ...item, ...updates }
    if (next.confirmed && (!next.date || !`${next.merchant || ''}`.trim() || !Number.isFinite(Number(next.amount)))) throw new Error('核对完成前，请补齐日期、商家与金额。')
    const category = this.core.CATEGORIES.find((cat) => cat.id === next.categoryId)
    if (!category) throw new Error('费用分类不正确。')
    updates.categoryId = next.categoryId
    updates.confirmed = Boolean(next.confirmed)
    for (const key of EDITABLE.filter((key) => !['confirmed', 'amount', 'taxAmount', 'pretaxAmount'].includes(key))) {
      if (Object.hasOwn(updates, key)) updates[key] = `${updates[key] || ''}`.slice(0, 2000)
    }
    return updates
  }

  remove(ids) {
    if (!Array.isArray(ids)) throw new Error('请选择记录。')
    this.data.trash = this.data.invoices.filter((item) => ids.includes(item.id))
    this.data.invoices = this.data.invoices.filter((item) => !ids.includes(item.id))
    this.persist()
  }

  undo() {
    const existing = new Set(this.data.invoices.map((item) => item.id))
    this.data.invoices.unshift(...this.data.trash.filter((item) => !existing.has(item.id)))
    this.data.trash = []
    this.persist()
  }

  exportReport(mode, onlyConfirmed = true, invoiceIds = null) {
    if (!this.core.REPORT_MODES.some((item) => item.id === mode)) throw new Error('报表类型不正确。')
    if (invoiceIds !== null && !Array.isArray(invoiceIds)) throw new Error('导出范围不正确。')
    const selected = invoiceIds === null ? null : new Set(invoiceIds)
    const scoped = this.data.invoices.filter((item) => !selected || selected.has(item.id))
    const eligible = this.core.getReportInvoices(scoped, mode)
    const reportRows = onlyConfirmed ? eligible.filter((item) => item.confirmed) : eligible
    if (!reportRows.length) {
      if (onlyConfirmed && eligible.length) throw new Error('请先核对记录后再导出。')
      throw new Error('没有符合导出范围和报表类型的记录。')
    }
    return Buffer.from(this.core.buildXlsxWorkbook(reportRows, { mode }))
  }

  backup() {
    return JSON.stringify({ ...this.data, backupVersion: 1, originals: this.data.documents.map((doc) => ({ id: doc.id, content: fs.readFileSync(this.document(doc.id).path).toString('base64') })) }, null, 2)
  }

  restoreBackup(content) {
    const backup = JSON.parse(content)
    const backupBatches = backup.batches == null ? [] : backup.batches
    if (backup.backupVersion !== 1 || !Array.isArray(backup.invoices) || !Array.isArray(backup.documents) || !Array.isArray(backup.originals) || !Array.isArray(backupBatches) || backup.invoices.length > 10000 || backup.documents.length > 10000 || backup.originals.length !== backup.documents.length || backupBatches.length > 1000) throw new Error('不是有效的报销帮帮备份。')

    const originals = new Map()
    for (const original of backup.originals) {
      if (!original || typeof original.id !== 'string' || !original.id || typeof original.content !== 'string' || originals.has(original.id) || original.content.length > 112 * 1024 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(original.content)) throw new Error('备份中的原件数据不完整。')
      originals.set(original.id, Buffer.from(original.content, 'base64'))
    }

    const usedDocumentIds = new Set()
    const documentIds = new Map()
    const newDocuments = []
    for (const doc of backup.documents) {
      const bytes = doc && originals.get(doc.id)
      if (!doc || typeof doc.id !== 'string' || !doc.id || usedDocumentIds.has(doc.id) || typeof doc.name !== 'string' || !bytes) throw new Error('备份缺少原件，未进行恢复。')
      usedDocumentIds.add(doc.id)
      this.validateDocument(doc.name, bytes)
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
      const existing = this.data.documents.find((item) => item.sha256 === sha256) || newDocuments.find((item) => item.document.sha256 === sha256)?.document
      const restored = existing || { id: crypto.randomUUID(), name: path.basename(doc.name), ext: path.extname(doc.name).toLowerCase(), sha256, createdAt: Date.now() }
      if (!existing) newDocuments.push({ document: restored, bytes })
      documentIds.set(doc.id, restored.id)
    }

    const nextData = JSON.parse(JSON.stringify(this.data))
    for (const { document } of newDocuments) nextData.documents.push(document)
    const invoiceIdMap = new Map()
    let count = 0
    for (const source of backup.invoices) {
      if (!source || typeof source.id !== 'string' || !source.id || !Number.isFinite(Number(source.amount)) || Number(source.amount) < 0 || Number(source.amount) > 1e12 || (source.documentId && (!documentIds.has(source.documentId) || !Number.isInteger(source.page) || source.page < 1 || source.page > 500))) throw new Error('备份记录包含无效字段。')
      if (source.date && (!/^\d{4}-\d{2}-\d{2}$/.test(source.date) || Number.isNaN(Date.parse(`${source.date}T00:00:00Z`)) || new Date(`${source.date}T00:00:00Z`).toISOString().slice(0, 10) !== source.date)) throw new Error('备份记录包含无效日期。')
      if (source.ocrText != null && (typeof source.ocrText !== 'string' || source.ocrText.length > 200000)) throw new Error('备份记录包含无效识别文本。')
      const existing = nextData.invoices.find((row) => row.id === source.id || row.restoredFrom === source.id || (source.documentId && row.documentId === documentIds.get(source.documentId) && row.page === source.page))
      if (existing) {
        invoiceIdMap.set(source.id, existing.id)
        continue
      }

      const docId = source.documentId ? documentIds.get(source.documentId) : ''
      const doc = docId && nextData.documents.find((item) => item.id === docId)
      const row = doc
        ? this.createPageInvoice(doc, source.page, source.ocrText, source.ocrStatus || '备份恢复', source.confidence)
        : this.createManualInvoice()
      const updates = Object.fromEntries(EDITABLE.filter((key) => Object.hasOwn(source, key)).map((key) => [key, source[key]]))
      updates.categoryId = this.core.CATEGORIES.some((cat) => cat.id === source.categoryId) ? source.categoryId : 'other'
      updates.confirmed = Boolean(source.confirmed && source.date && source.merchant)
      const normalized = this.prepareUpdates(row, updates)
      const category = this.core.CATEGORIES.find((item) => item.id === normalized.categoryId)
      Object.assign(row, normalized, { categoryName: category.name, categoryIcon: category.icon, categoryColor: category.color, confirmed: Boolean(normalized.confirmed), updatedAt: Date.now() })
      row.restoredFrom = source.id
      nextData.invoices.unshift(row)
      invoiceIdMap.set(source.id, row.id)
      count++
    }

    const seenBatchIds = new Set()
    let batchCount = 0
    for (const source of backupBatches) {
      if (!source || typeof source.id !== 'string' || !source.id || seenBatchIds.has(source.id) || typeof source.name !== 'string' || !Array.isArray(source.invoiceIds) || source.invoiceIds.length > 10000 || source.invoiceIds.some((id) => typeof id !== 'string')) throw new Error('备份包含无效的报销批次。')
      seenBatchIds.add(source.id)
      if (nextData.batches.some((item) => item.id === source.id)) continue
      const invoiceIds = [...new Set(source.invoiceIds.map((id) => invoiceIdMap.get(id)).filter(Boolean))]
      if (!invoiceIds.length) continue
      const name = source.name.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || '未命名批次'
      nextData.batches.push({ id: source.id, name, invoiceIds, createdAt: Number.isFinite(source.createdAt) ? source.createdAt : Date.now() })
      batchCount++
    }

    const written = []
    try {
      for (const { document, bytes } of newDocuments) {
        const target = path.join(this.documentsPath, `${document.id}${document.ext}`)
        const handle = fs.openSync(target, 'wx')
        written.push(target)
        try { fs.writeFileSync(handle, bytes) } finally { fs.closeSync(handle) }
      }
      this.persistData(nextData)
      this.data = nextData
      return { count, batchCount }
    } catch (error) {
      for (const file of written) {
        try { fs.unlinkSync(file) } catch {}
      }
      throw error
    }
  }

  validateDocument(name, bytes) {
    const ext = path.extname(name).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext) || !bytes.length || bytes.length > MAX_FILE_SIZE) throw new Error('备份包含不支持的原件格式或大小。')
    const isPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-'
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const isJpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    if (!(ext === '.pdf' ? isPdf : ext === '.png' ? isPng : isJpg)) throw new Error('备份中的原件与文件名不匹配。')
  }

  createPageInvoice(doc, page, text, engine, confidence) {
    const cleanText = `${text || ''}`.slice(0, 200000).replace(/([\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])/g, '$1')
    // Never use the filename as OCR evidence. Only content read locally is parsed.
    const parsed = this.core.normalizePaddleOcrResult({ result: { layoutParsingResults: [{ markdown: { text: cleanText } }] } }, { fileName: '' })[0] || {}
    const category = this.core.CATEGORIES.find((item) => item.id === parsed.categoryId) || this.core.CATEGORIES.at(-1)
    return {
      ...parsed,
      id: crypto.randomUUID(), documentId: doc.id, page,
      fileName: doc.name, filePath: path.join(this.documentsPath, `${doc.id}${doc.ext}`), archivePath: path.join(this.documentsPath, `${doc.id}${doc.ext}`),
      categoryId: category.id, categoryName: category.name,
      categoryColor: category.color, categoryIcon: category.icon,
      merchant: parsed.merchant === '未知商家' ? '' : (parsed.merchant || ''),
      amount: Number(parsed.amount) || 0,
      ocrText: cleanText, ocrStatus: engine,
      confidence: Number(confidence) || 0,
      ocrError: engine === '识别失败' ? '未能读取原件内容，请手动补全后保存。' : '',
      confirmed: false, createdAt: Date.now()
    }
  }

  createManualInvoice() {
    const category = this.core.CATEGORIES.at(-1)
    return { id: crypto.randomUUID(), documentId: '', page: 1, fileName: '手动录入', merchant: '', date: '', amount: 0, categoryId: category.id, categoryName: category.name, ocrStatus: '人工录入', confidence: 0, confirmed: false, createdAt: Date.now() }
  }
}

module.exports = { Library }
