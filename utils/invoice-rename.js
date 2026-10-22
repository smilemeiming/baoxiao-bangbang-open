const { getArchiveRoot, safeName } = require('./file-archive')

const RENAME_FIELD_OPTIONS = [
  { id: 'invoiceType', name: '发票类型' },
  { id: 'invoiceNo', name: '发票号码' },
  { id: 'date', name: '开票日期' },
  { id: 'buyerName', name: '购买方名称' },
  { id: 'buyerTaxNo', name: '购买方税号' },
  { id: 'sellerName', name: '销售方名称' },
  { id: 'sellerTaxNo', name: '销售方税号' },
  { id: 'pretaxAmount', name: '发票金额' },
  { id: 'taxAmount', name: '发票税额' },
  { id: 'totalAmount', name: '价税合计' },
  { id: 'remark', name: '备注' }
]

const RENAME_SEPARATOR_OPTIONS = [
  { name: '下划线 _', value: '_' },
  { name: '短横线 -', value: '-' },
  { name: '空格', value: ' ' },
  { name: '无', value: '' }
]

const DEFAULT_RENAME_RULE = {
  fieldIds: ['sellerName'],
  separator: '_',
  showIndex: true,
  includeExpenseItem: false,
  customText: ''
}

function getExt(value) {
  const match = `${value || ''}`.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : ''
}

function getInvoiceExt(invoice) {
  return getExt(invoice.fileName) || getExt(invoice.archivePath) || getExt(invoice.filePath) || 'dat'
}

function trimExt(value) {
  return `${value || ''}`.replace(/\.[a-zA-Z0-9]+$/, '')
}

function amountValue(value) {
  if (value == null || value === '') {
    return ''
  }

  const number = Number(value)
  return Number.isNaN(number) ? '' : number.toFixed(2)
}

function fieldValue(invoice, fieldId) {
  const source = invoice || {}

  switch (fieldId) {
    case 'invoiceType':
      return source.invoiceType || source.evidenceType || ''
    case 'invoiceCode':
      return source.invoiceCode || source.invoiceCodeNo || ''
    case 'invoiceNo':
      return source.invoiceNo || ''
    case 'date':
      return source.date || ''
    case 'buyerName':
      return source.buyerName || source.purchaserName || source.companyName || source.department || ''
    case 'buyerTaxNo':
      return source.buyerTaxNo || source.purchaserTaxNo || ''
    case 'sellerName':
      return source.sellerName || source.merchant || source.platform || ''
    case 'sellerTaxNo':
      return source.sellerTaxNo || source.taxNo || ''
    case 'pretaxAmount':
      return amountValue(source.pretaxAmount)
    case 'taxAmount':
      return amountValue(source.taxAmount)
    case 'totalAmount':
      return amountValue(source.amount)
    case 'amountInWords':
      return source.amountInWords || ''
    case 'remark':
      return source.remark || ''
    case 'payee':
      return source.payee || ''
    case 'reviewer':
      return source.reviewer || ''
    case 'drawer':
      return source.drawer || source.issuer || ''
    default:
      return ''
  }
}

function normalizeRule(rule) {
  return {
    ...DEFAULT_RENAME_RULE,
    ...(rule || {}),
    fieldIds: Array.isArray(rule && rule.fieldIds) ? rule.fieldIds : DEFAULT_RENAME_RULE.fieldIds
  }
}

function cleanPart(value) {
  if (value == null || `${value}`.trim() === '') {
    return ''
  }

  return safeName(value).replace(/^_+|_+$/g, '')
}

function hasRenameParts(rule) {
  const normalized = normalizeRule(rule)

  return normalized.fieldIds.length > 0 || Boolean(normalized.includeExpenseItem) || Boolean(`${normalized.customText || ''}`.trim())
}

function buildRenameBaseName(invoice, index, rule) {
  const normalized = normalizeRule(rule)
  const parts = normalized.fieldIds
    .map((fieldId) => cleanPart(fieldValue(invoice, fieldId)))
    .filter(Boolean)

  if (normalized.includeExpenseItem) {
    const item = cleanPart(invoice.expenseItem || invoice.categoryName)

    if (item) {
      parts.push(item)
    }
  }

  const customText = cleanPart(normalized.customText)

  if (customText) {
    parts.push(customText)
  }

  const joined = parts.join(normalized.separator)
  const serial = normalized.showIndex ? `${index + 1}.` : ''
  const fallback = cleanPart(trimExt(invoice.fileName) || invoice.id || 'invoice')

  return safeName(`${serial}${joined || fallback}`)
}

function buildRenameFileName(invoice, index, rule, usedNames) {
  const ext = getInvoiceExt(invoice)
  const baseName = buildRenameBaseName(invoice, index, rule)
  let fileName = `${baseName}.${ext}`
  let count = 2

  while (usedNames && usedNames[fileName.toLowerCase()]) {
    fileName = `${baseName}_${count}.${ext}`
    count += 1
  }

  if (usedNames) {
    usedNames[fileName.toLowerCase()] = true
  }

  return fileName
}

function buildTargetFolder(invoice) {
  if (invoice.archiveFolder) {
    return invoice.archiveFolder
  }

  const folderName = invoice.folderName || `${invoice.categoryName || '报表发票'}-${invoice.date || '未标日期'}`
  return `${getArchiveRoot()}/${safeName(folderName)}`
}

function buildRenameTarget(invoice, index, rule, usedPaths) {
  const folder = buildTargetFolder(invoice)
  const folderUsedNames = usedPaths[folder] || {}
  const fileName = buildRenameFileName(invoice, index, rule, folderUsedNames)

  usedPaths[folder] = folderUsedNames

  return {
    fileName,
    archiveFolder: folder,
    archivePath: `${folder}/${fileName}`
  }
}

function buildRenamePreview(invoices, rule, count) {
  const normalized = normalizeRule(rule)
  const source = invoices || []
  const usedPaths = {}
  const previewCount = count || 3

  return {
    disabled: !source.length || !hasRenameParts(normalized),
    totalCount: source.length,
    rows: source.slice(0, previewCount).map((invoice, index) => {
      const target = buildRenameTarget(invoice, index, normalized, usedPaths)

      return {
        id: invoice.id || `${index}`,
        name: target.fileName,
        source: invoice.fileName || target.fileName
      }
    })
  }
}

function ensureDir(dirPath) {
  return new Promise((resolve) => {
    wx.getFileSystemManager().mkdir({
      dirPath,
      recursive: true,
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

function copyFile(sourcePath, targetPath) {
  return new Promise((resolve) => {
    if (!sourcePath) {
      resolve(false)
      return
    }

    if (sourcePath === targetPath) {
      resolve(true)
      return
    }

    wx.getFileSystemManager().copyFile({
      srcPath: sourcePath,
      destPath: targetPath,
      success: () => resolve(true),
      fail: () => resolve(false)
    })
  })
}

function renameOne(invoice, index, rule, usedPaths) {
  const target = buildRenameTarget(invoice, index, rule, usedPaths)
  const sourcePath = invoice.archivePath || invoice.filePath || ''

  if (!sourcePath) {
    return Promise.resolve({
      invoice,
      success: false
    })
  }

  return ensureDir(target.archiveFolder)
    .then(() => copyFile(sourcePath, target.archivePath))
    .then((success) => ({
      invoice: success
        ? {
          ...invoice,
          fileName: target.fileName,
          filePath: target.archivePath,
          archiveFolder: target.archiveFolder,
          archivePath: target.archivePath,
          renamedAt: Date.now()
        }
        : invoice,
      success
    }))
}

function renameInvoiceFiles(invoices, rule) {
  const normalized = normalizeRule(rule)
  const usedPaths = {}

  if (!hasRenameParts(normalized)) {
    return Promise.resolve({
      invoices: invoices || [],
      successCount: 0,
      failedCount: invoices ? invoices.length : 0
    })
  }

  return Promise.all((invoices || []).map((invoice, index) => {
    return renameOne(invoice, index, normalized, usedPaths)
  })).then((results) => ({
    invoices: results.map((item) => item.invoice),
    successCount: results.filter((item) => item.success).length,
    failedCount: results.filter((item) => !item.success).length
  }))
}

module.exports = {
  RENAME_FIELD_OPTIONS,
  RENAME_SEPARATOR_OPTIONS,
  DEFAULT_RENAME_RULE,
  buildRenamePreview,
  buildRenameFileName,
  hasRenameParts,
  renameInvoiceFiles
}
