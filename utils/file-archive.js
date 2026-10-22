const ROOT_DIR_NAME = 'invoice-archive'

function getArchiveRoot() {
  return `${wx.env.USER_DATA_PATH}/${ROOT_DIR_NAME}`
}

function safeName(value) {
  return `${value || 'invoice'}`
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

function getExt(fileName) {
  const match = `${fileName || ''}`.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : 'dat'
}

function ensureDir(dirPath) {
  return new Promise((resolve) => {
    wx.getFileSystemManager().mkdir({
      dirPath,
      recursive: true,
      success: resolve,
      fail: resolve
    })
  })
}

function copyFile(sourcePath, targetPath) {
  return new Promise((resolve) => {
    if (!sourcePath || sourcePath === targetPath) {
      resolve('')
      return
    }

    wx.getFileSystemManager().copyFile({
      srcPath: sourcePath,
      destPath: targetPath,
      success: () => resolve(targetPath),
      fail: () => resolve('')
    })
  })
}

function buildInvoicePath(invoice, folderName) {
  const root = getArchiveRoot()
  const folder = safeName(folderName || `${invoice.categoryName || '其他'}-${invoice.date || '未标日期'}`)
  const ext = getExt(invoice.fileName)
  const baseName = safeName(`${invoice.date || 'date'}-${invoice.merchant || invoice.platform || 'merchant'}-${invoice.evidenceType || '发票'}-${invoice.invoiceNo || invoice.id}`)

  return {
    archiveFolder: `${root}/${folder}`,
    archivePath: `${root}/${folder}/${baseName}.${ext}`
  }
}

function archiveOne(invoice, folderName) {
  const paths = buildInvoicePath(invoice, folderName)

  if (!invoice.filePath) {
    return Promise.resolve({
      ...invoice,
      archiveFolder: paths.archiveFolder,
      archivePath: ''
    })
  }

  return ensureDir(paths.archiveFolder)
    .then(() => copyFile(invoice.filePath, paths.archivePath))
    .then((archivePath) => ({
      ...invoice,
      filePath: archivePath || invoice.filePath,
      archiveFolder: paths.archiveFolder,
      archivePath: archivePath || invoice.archivePath || ''
    }))
}

function archiveInvoices(invoices) {
  return Promise.all((invoices || []).map((item) => archiveOne(item)))
}

function archivePairedInvoices(invoices) {
  return Promise.all((invoices || []).map((item) => {
    return archiveOne(item, item.folderName || undefined)
  }))
}

module.exports = {
  getArchiveRoot,
  safeName,
  buildInvoicePath,
  archiveOne,
  archiveInvoices,
  archivePairedInvoices
}
