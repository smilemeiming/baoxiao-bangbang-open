const { CATEGORIES, getCategoryById } = require('./categories')

const STORAGE_KEY = 'invoice_reimbursement_items_v1'

function ensureInvoiceStore() {
  const value = wx.getStorageSync(STORAGE_KEY)

  if (!Array.isArray(value)) {
    wx.setStorageSync(STORAGE_KEY, [])
  }
}

function getInvoices() {
  ensureInvoiceStore()
  return wx.getStorageSync(STORAGE_KEY) || []
}

function saveInvoices(invoices) {
  const sorted = (invoices || []).slice().sort((left, right) => {
    return (right.createdAt || 0) - (left.createdAt || 0)
  })

  wx.setStorageSync(STORAGE_KEY, sorted)
  return sorted
}

function addInvoices(invoices) {
  return saveInvoices([...(invoices || []), ...getInvoices()])
}

function getInvoiceById(id) {
  return getInvoices().find((item) => item.id === id)
}

function updateInvoice(id, updates) {
  const next = getInvoices().map((item) => {
    if (item.id !== id) {
      return item
    }

    return decorateInvoice({
      ...item,
      ...updates,
      updatedAt: Date.now()
    })
  })

  return saveInvoices(next)
}

function removeInvoice(id) {
  return saveInvoices(getInvoices().filter((item) => item.id !== id))
}

function clearInvoices() {
  wx.setStorageSync(STORAGE_KEY, [])
}

function isRecognitionFailed(item) {
  return Boolean(item && (
    item.ocrError ||
    item.status === '待识别' ||
    item.ocrStatus === '云端OCR失败'
  ))
}

function getInvoiceStats(invoices) {
  const source = invoices || getInvoices()
  const failedCount = source.filter(isRecognitionFailed).length
  const totalAmount = source.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const categoryRows = CATEGORIES.map((category) => {
    const rows = source.filter((item) => item.categoryId === category.id)
    const amount = rows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      count: rows.length,
      amount,
      amountText: amount.toFixed(2)
    }
  })

  return {
    totalCount: source.length,
    successCount: source.length - failedCount,
    failedCount,
    totalAmount,
    totalAmountText: totalAmount.toFixed(2),
    categoryRows,
    categoryMap: categoryRows.reduce((map, item) => {
      map[item.id] = item
      return map
    }, {})
  }
}

function resolveBuyerDisplayName(item) {
  const source = item || {}

  return source.buyerName ||
    source.purchaserName ||
    source.passengerName ||
    source.travelerName ||
    source.riderName ||
    source.customerName ||
    source.clientName ||
    source.payerName ||
    ''
}

function decorateInvoice(item) {
  const category = getCategoryById(item.categoryId)
  const amount = Number(item.amount) || 0
  const formatOptionalAmount = (value) => {
    if (value == null || value === '') {
      return ''
    }

    const number = Number(value)
    return Number.isNaN(number) ? '' : number.toFixed(2)
  }

  return {
    ...item,
    recognitionFailed: isRecognitionFailed(item),
    categoryName: item.categoryName || category.name,
    categoryIcon: item.categoryIcon || category.icon,
    categoryColor: item.categoryColor || category.color,
    amountText: amount.toFixed(2),
    taxAmountText: formatOptionalAmount(item.taxAmount),
    pretaxAmountText: formatOptionalAmount(item.pretaxAmount),
    allocatedAmountText: formatOptionalAmount(item.allocatedAmount),
    buyerDisplayName: resolveBuyerDisplayName(item)
  }
}

module.exports = {
  STORAGE_KEY,
  ensureInvoiceStore,
  getInvoices,
  saveInvoices,
  addInvoices,
  getInvoiceById,
  updateInvoice,
  removeInvoice,
  clearInvoices,
  isRecognitionFailed,
  getInvoiceStats,
  resolveBuyerDisplayName,
  decorateInvoice
}
