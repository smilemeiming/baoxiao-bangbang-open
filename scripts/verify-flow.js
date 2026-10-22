const fs = require('fs')
const path = require('path')
const { getDemoInvoices } = require('../utils/mock-data')

const root = path.resolve(__dirname, '..')
const demoTemplates = getDemoInvoices()
const demoInvoiceCount = demoTemplates.length
const demoTotalText = demoTemplates.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2)
const storage = {}
const writes = []
const shares = []
const toasts = []
const modals = []
const openedDocuments = []
const previewedImages = []
const navigations = []
const switchedTabs = []
const importPickers = []
const appState = {
  appName: '报销帮帮',
  pendingImportAction: '',
  pendingInvoiceCategory: ''
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function isXlsxBuffer(value) {
  const bytes = new Uint8Array(value)

  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

function setByPath(target, key, value) {
  const parts = key.split('.')
  let cursor = target

  while (parts.length > 1) {
    const part = parts.shift()
    cursor[part] = cursor[part] || {}
    cursor = cursor[part]
  }

  cursor[parts[0]] = value
}

function installWxMock() {
  global.getApp = () => ({
    globalData: appState
  })
  global.wx = {
    env: {
      USER_DATA_PATH: '/mock-user-data'
    },
    getStorageSync(key) {
      return storage[key]
    },
    setStorageSync(key, value) {
      storage[key] = value
    },
    getFileSystemManager() {
      return {
        mkdir(options) {
          options.success && options.success()
        },
        copyFile(options) {
          options.success && options.success()
        },
        writeFile(options) {
          writes.push({
            filePath: options.filePath,
            data: options.data
          })
          options.success && options.success()
        },
        access(options) {
          options.success && options.success()
        }
      }
    },
    showToast(options) {
      toasts.push(options)
    },
    showModal(options) {
      modals.push(options)
      options.success && options.success({ confirm: true })
    },
    showLoading() {},
    hideLoading() {},
    openDocument(options) {
      openedDocuments.push(options)
      options.success && options.success()
    },
    previewImage(options) {
      previewedImages.push(options)
      options.success && options.success()
    },
    shareFileMessage(options) {
      shares.push(options)
      options.success && options.success()
    },
    chooseMedia() {
      importPickers.push('scan')
    },
    chooseMessageFile() {
      importPickers.push('file')
    },
    switchTab(options) {
      switchedTabs.push(options)
      options.success && options.success()
    },
    navigateTo(options) {
      navigations.push(options)
      options.success && options.success()
    }
  }
}

function loadPage(relativePath) {
  let pageConfig
  global.Page = (config) => {
    pageConfig = config
  }

  const pagePath = path.join(root, relativePath)
  delete require.cache[require.resolve(pagePath)]
  require(pagePath)
  assert(pageConfig, `${relativePath} registers Page`)

  pageConfig.data = JSON.parse(JSON.stringify(pageConfig.data || {}))
  pageConfig.setData = function setData(patch, callback) {
    Object.keys(patch).forEach((key) => {
      setByPath(this.data, key, patch[key])
    })

    if (callback) {
      callback()
    }
  }

  return pageConfig
}

function tick() {
  return new Promise((resolve) => setImmediate(resolve))
}

async function verifyDemoImportToReportFlow() {
  installWxMock()

  const indexPage = loadPage('pages/index/index.js')
  indexPage.startScan()
  assert(importPickers[0] === 'scan', 'home scan entry opens camera or album selection')
  assert(switchedTabs.length === 0, 'home scan entry stays on the home page')

  const uploadPage = loadPage('pages/upload/upload.js')

  indexPage.startUpload()
  assert(importPickers[1] === 'file', 'home upload entry opens file selection')
  assert(switchedTabs.length === 0, 'home upload entry stays on the home page')
  indexPage.goRename()
  assert(navigations[navigations.length - 1].url === '/pages/rename/rename', 'home rename entry opens the rename page')

  uploadPage.loadDemoData()
  await tick()
  await tick()

  let invoices = storage.invoice_reimbursement_items_v1 || []
  assert(invoices.length === demoInvoiceCount, `demo import saves ${demoInvoiceCount} invoices, got ${invoices.length}`)
  assert(uploadPage.data.lastResults.length === demoInvoiceCount, 'upload page shows imported demo results')
  assert(uploadPage.data.pairCount === 1, 'upload page reports one taxi pair')
  assert(uploadPage.data.categoryRows.some((item) => item.count > 0), 'recognition page shows category totals')
  assert(invoices.some((item) => item.categoryId === 'taxi' && item.folderName), 'paired taxi invoice has folder name')
  assert(invoices.every((item) => item.archiveFolder), 'all demo invoices have archive folder metadata')
  storage.invoice_reimbursement_items_v1 = invoices.map((item) => {
    if (item.filePath || item.archivePath) {
      return item
    }

    return {
      ...item,
      filePath: `/mock-user-data/demo-source/${item.id}.${item.fileType || 'dat'}`
    }
  })
  invoices = storage.invoice_reimbursement_items_v1 || []

  const renamePage = loadPage('pages/rename/rename.js')
  renamePage.onShow()
  assert(renamePage.data.renameInvoiceCount === demoInvoiceCount, 'rename page reads all recognized invoices')
  await renamePage.renameInvoices()
  invoices = storage.invoice_reimbursement_items_v1 || []
  assert(invoices.some((item) => item.renamedAt), 'rename page updates invoice file metadata')
  assert(renamePage.data.renameResultText.includes('已命名'), 'rename page shows naming result text')

  indexPage.onShow()
  assert(indexPage.data.recentInvoices.length > 0, 'home page lists recent invoices')
  const recentInvoice = indexPage.data.recentInvoices[0]
  const navigationCount = navigations.length
  indexPage.openInvoiceDetail({
    currentTarget: {
      dataset: { id: recentInvoice.id }
    }
  })
  assert(navigations.length === navigationCount + 1, 'home recent invoice tap navigates once')
  assert(
    navigations[navigations.length - 1].url === `/pages/invoice-detail/invoice-detail?id=${recentInvoice.id}`,
    'home recent invoice opens its detail page'
  )

  const reportPage = loadPage('pages/report/report.js')
  reportPage.onShow()
  assert(reportPage.data.totalCount === demoInvoiceCount, 'report page reads stored invoice count')
  assert(reportPage.data.totalAmountText === demoTotalText, `report total is ${demoTotalText}, got ${reportPage.data.totalAmountText}`)

  reportPage.generateReportFile({ shareAfterGenerate: true })
  await tick()
  await tick()

  const lastReport = storage.last_invoice_report_v1
  assert(lastReport && lastReport.filePath && lastReport.fileName, 'last report metadata is stored')
  assert(lastReport.fileName.endsWith('.xlsx'), 'generated report uses the real xlsx extension')
  assert(reportPage.data.lastReportPath === lastReport.filePath, 'report page stores latest report path in data')
  assert(writes.length === 1, 'report file is written once')
  assert(isXlsxBuffer(writes[0].data), 'written report is a real xlsx zip package')
  assert(shares.length === 1, 'report share is triggered')
  assert(shares[0].filePath === lastReport.filePath, 'shared file path matches generated report')
  assert(shares[0].fileName.endsWith('.xlsx'), 'shared report keeps the xlsx extension')
  assert(openedDocuments.length === 0, 'share path does not fall back to open document when share is available')

  reportPage.changeReportMode({
    detail: { value: 1 }
  })
  reportPage.generateReportFile({ openAfterGenerate: true })
  await tick()
  await tick()
  assert(writes.length === 2, 'detail report is written separately')
  assert(isXlsxBuffer(writes[1].data), 'detail report is a real xlsx zip package')
  assert(openedDocuments[0].fileType === 'xlsx', 'report page opens generated reports as xlsx')

  const taxiInvoice = invoices.find((item) => item.categoryId === 'taxi' && item.evidenceType === '发票')
  assert(taxiInvoice, 'demo data contains taxi invoice')
  storage.invoice_reimbursement_items_v1 = (storage.invoice_reimbursement_items_v1 || []).map((item) => {
    return item.id === taxiInvoice.id
      ? {
        ...item,
        ocrError: '模拟识别失败'
      }
      : item
  })

  const detailPage = loadPage('pages/invoice-detail/invoice-detail.js')
  detailPage.onLoad({ id: taxiInvoice.id })
  detailPage.updateField({
    currentTarget: { dataset: { key: 'merchant' } },
    detail: { value: '高德' }
  })
  detailPage.saveInvoice()
  await tick()
  await tick()

  const updatedInvoice = (storage.invoice_reimbursement_items_v1 || []).find((item) => item.id === taxiInvoice.id)
  assert(updatedInvoice.merchant === '高德', 'detail edit updates merchant')
  assert(updatedInvoice.platform === '高德', 'detail edit keeps platform in sync for pairing')
  assert(updatedInvoice.ocrError === '', 'manual detail completion clears recognition failure')
  assert(updatedInvoice.ocrStatus === '人工录入', 'manual detail completion records manual input status')

  detailPage.setData({
    'form.fileType': 'jpg',
    'form.fileName': 'invoice.jpg',
    'form.archivePath': '/mock-user-data/invoice-archive/taxi/invoice.jpg'
  })
  detailPage.previewOriginal()
  assert(navigations.some((item) => item.url.indexOf('/pages/original-preview/original-preview') === 0), 'invoice detail opens original preview page')

  storage.invoice_reimbursement_items_v1 = (storage.invoice_reimbursement_items_v1 || []).map((item) => {
    return item.id === taxiInvoice.id
      ? {
        ...item,
        fileType: 'jpg',
        fileName: 'invoice.jpg',
        archivePath: '/mock-user-data/invoice-archive/taxi/invoice.jpg'
      }
      : item
  })

  const previewPage = loadPage('pages/original-preview/original-preview.js')
  previewPage.onLoad({ id: taxiInvoice.id })
  await tick()
  await tick()
  assert(previewPage.data.sourcePath, 'original preview page resolves original file')
  assert(previewPage.data.sourcePath.indexOf('/original-preview-cache/') >= 0, 'original preview page uses short preview cache path')
  assert(previewPage.data.isImage, 'original preview page renders image files inline')
  previewPage.handleImageLoad()
  assert(previewPage.data.imageLoaded, 'original preview page marks image as loaded')
  previewPage.zoomIn()
  assert(previewPage.data.zoomPercent === 120, 'original preview page zooms in')
  previewPage.zoomOut()
  assert(previewPage.data.zoomPercent === 100, 'original preview page zooms out')
  previewPage.resetZoom()
  assert(previewPage.data.zoomStyle === 'width: 100%;', 'original preview page resets zoom')
  previewPage.openSystemPreview()
  assert(previewedImages[0].current.indexOf('/original-preview-cache/') >= 0, 'system preview uses short preview cache path')

  const pdfInvoice = (storage.invoice_reimbursement_items_v1 || []).find((item) => item.fileType === 'pdf' && item.id !== taxiInvoice.id)
  assert(pdfInvoice, 'demo data contains a pdf invoice')
  const pdfOriginalPath = '/mock-user-data/invoice-archive/pdf/示例乘客 上海-深圳 改签及补差额发票930元.pdf'
  storage.invoice_reimbursement_items_v1 = (storage.invoice_reimbursement_items_v1 || []).map((item) => {
    return item.id === pdfInvoice.id
      ? {
        ...item,
        fileType: 'pdf',
        fileName: '示例乘客 上海-深圳 改签及补差额发票930元.pdf',
        filePath: pdfOriginalPath,
        archivePath: pdfOriginalPath
      }
      : item
  })
  const pdfPreviewPage = loadPage('pages/original-preview/original-preview.js')
  pdfPreviewPage.onLoad({ id: pdfInvoice.id })
  await tick()
  await tick()
  assert(pdfPreviewPage.data.sourcePath.indexOf('/original-preview-cache/') >= 0, 'PDF original preview uses short cache path')
  assert(pdfPreviewPage.data.sourcePath.endsWith('.pdf'), 'PDF original preview keeps the pdf extension')
  assert(!pdfPreviewPage.data.isImage, 'PDF original preview uses document mode')
  pdfPreviewPage.openPdf()
  await tick()
  await tick()
  assert(openedDocuments[openedDocuments.length - 1].fileType === 'pdf', 'PDF original preview opens documents as pdf')
  assert(openedDocuments[openedDocuments.length - 1].filePath.indexOf('/original-preview-cache/') >= 0, 'PDF openDocument uses short cache path')

  const invoicesPage = loadPage('pages/invoices/invoices.js')
  uploadPage.openCategory({
    currentTarget: {
      dataset: { id: 'taxi' }
    }
  })
  assert(appState.pendingInvoiceCategory === 'taxi', 'category overview records the selected category')
  assert(switchedTabs[switchedTabs.length - 1].url === '/pages/invoices/invoices', 'category overview opens the invoice library')
  invoicesPage.onShow()
  assert(invoicesPage.data.activeCategory === 'taxi', 'invoice library applies the selected category')
  assert(invoicesPage.data.filteredInvoices.every((item) => item.categoryId === 'taxi'), 'invoice library only shows selected category invoices')
  invoicesPage.setFilter({
    currentTarget: {
      dataset: { id: 'all' }
    }
  })
  assert(invoicesPage.data.filteredInvoices.length === demoInvoiceCount, 'invoice library lists all demo invoices')

  invoicesPage.enterSelectionMode()
  assert(invoicesPage.data.selectionMode, 'invoice library enters selection mode')

  const selectedIds = invoicesPage.data.filteredInvoices.slice(0, 2).map((item) => item.id)
  selectedIds.forEach((id) => {
    invoicesPage.toggleSelect({
      currentTarget: {
        dataset: { id }
      }
    })
  })
  assert(invoicesPage.data.selectedCount === 2, 'invoice library selects two invoices')

  invoicesPage.removeSelected()
  assert(modals.some((item) => item.title === '删除所选发票'), 'bulk delete asks for confirmation')
  assert((storage.invoice_reimbursement_items_v1 || []).length === demoInvoiceCount - 2, 'bulk delete removes selected invoices')
  assert(invoicesPage.data.showUndo, 'bulk delete exposes undo action')
  assert(invoicesPage.data.lastDeletedCount === 2, 'bulk delete stores deleted count')

  invoicesPage.restoreDeleted()
  assert((storage.invoice_reimbursement_items_v1 || []).length === demoInvoiceCount, 'undo restores deleted invoices')
  assert(!invoicesPage.data.showUndo, 'undo hides restore action after completion')
}

verifyDemoImportToReportFlow()
  .then(() => {
    console.log('Flow verification passed: demo import, storage, detail edit, bulk delete restore, report generation, share')
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
