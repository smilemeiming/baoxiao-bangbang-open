const { getInvoices, saveInvoices, getInvoiceStats, decorateInvoice } = require('../../utils/invoice-store')
const { getDemoInvoices } = require('../../utils/mock-data')
const { applyPairing } = require('../../utils/pairing')
const { archivePairedInvoices } = require('../../utils/file-archive')
const { importInvoiceFiles } = require('../../utils/invoice-import')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')
const { isDesktopWechat } = require('../../utils/device')
const { showRejectedFiles } = require('../../utils/invoice-validation')

function withOcrDisplay(item) {
  const status = item.ocrStatus || '待识别'
  const success = status === 'PaddleOCR'
  const amount = Number(item.amount) || 0

  return {
    ...decorateInvoice(item),
    ocrStatusText: status,
    ocrStatusClass: success ? 'paddle' : 'fallback',
    ocrErrorText: item.ocrError || '',
    amountDisplay: amount > 0 ? `¥${amount.toFixed(2)}` : '待识别',
    dateDisplay: item.date || '待识别',
    invoiceNoDisplay: item.invoiceNo || '待识别'
  }
}

function summarizeOcrProvider(results) {
  const statuses = Array.from(new Set(results.map((item) => item.ocrStatusText)))

  if (!statuses.length) {
    return ''
  }

  return statuses.length === 1 ? statuses[0] : '混合识别'
}

Page({
  data: {
    categoryRows: [],
    lastResults: [],
    pairCount: 0,
    busy: false,
    recognitionProvider: '',
    failedCount: 0,
    retryingAll: false
  },

  onShow() {
    enableShareMenu()
    const app = getApp()
    const action = app.globalData.pendingImportAction

    this.refreshOverview()

    if (!action || this._importing) {
      return
    }

    app.globalData.pendingImportAction = ''
    clearTimeout(this._entryTimer)
    this._entryTimer = setTimeout(() => {
      if (action === 'scan') {
        this.chooseImages()
        return
      }

      if (action === 'file') {
        this.chooseFiles()
      }
    }, 80)
  },

  refreshOverview() {
    const invoices = getInvoices().map(decorateInvoice)
    const paired = applyPairing(invoices)
    const stats = getInvoiceStats(paired.invoices)

    this.setData({
      categoryRows: stats.categoryRows,
      pairCount: paired.pairs.length
    })
  },

  chooseFiles() {
    if (this._importing) {
      return
    }

    wx.chooseMessageFile({
      count: 20,
      type: 'file',
      extension: ['jpg', 'jpeg', 'png', 'pdf'],
      success: (result) => {
        this.importFiles(result.tempFiles || [])
      },
      fail: () => {}
    })
  },

  chooseImages() {
    if (this._importing) {
      return
    }

    if (isDesktopWechat()) {
      this.chooseFiles()
      return
    }

    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (result) => {
        const files = (result.tempFiles || []).map((item, index) => ({
          name: `扫描件_${Date.now()}_${index + 1}.jpg`,
          path: item.tempFilePath,
          size: item.size,
          type: 'image'
        }))

        this.importFiles(files)
      },
      fail: () => {}
    })
  },

  importFiles(files) {
    if (!files.length || this._importing) {
      return
    }

    this._importing = true
    clearTimeout(this._busyTimer)
    this._busyTimer = setTimeout(() => {
      this.setData({ busy: true })
    }, 250)

    importInvoiceFiles(files)
      .then(({ saved, recognizedCount, rejectedResults, pairCount, lastResults: importedResults }) => {
        const lastResults = importedResults.map(withOcrDisplay)
        const stats = getInvoiceStats(saved)
        const failedCount = lastResults.filter((item) => item.ocrErrorText).length

        clearTimeout(this._busyTimer)
        this._importing = false
        this.setData({
          lastResults,
          categoryRows: stats.categoryRows,
          pairCount,
          busy: false,
          failedCount,
          recognitionProvider: summarizeOcrProvider(lastResults)
        })

        if (rejectedResults.length) {
          showRejectedFiles(rejectedResults, recognizedCount)
          return
        }

        const failed = lastResults.every((item) => item.ocrErrorText)
        wx.showToast({
          title: failed
            ? '识别失败，请查看原因'
            : lastResults.every((item) => item.ocrStatusText === 'PaddleOCR')
            ? `PaddleOCR ${recognizedCount}张`
            : `已导入${recognizedCount}张`,
          icon: 'none'
        })
      })
      .catch(() => {
        clearTimeout(this._busyTimer)
        this._importing = false
        this.setData({ busy: false })
        wx.showToast({
          title: '导入失败',
          icon: 'none'
        })
      })
  },

  onUnload() {
    clearTimeout(this._busyTimer)
    clearTimeout(this._entryTimer)
  },

  loadDemoData() {
    if (this._importing) {
      return
    }

    const current = getInvoices().map(decorateInvoice)
    const currentNames = current.map((item) => item.fileName)
    const demo = getDemoInvoices().filter((item) => currentNames.indexOf(item.fileName) < 0)

    if (!demo.length) {
      wx.showToast({
        title: '示例已存在',
        icon: 'none'
      })
      return
    }

    const paired = applyPairing([...demo, ...current])
    const demoNames = demo.map((item) => item.fileName)

    archivePairedInvoices(paired.invoices).then((organizedInvoices) => {
      const saved = saveInvoices(organizedInvoices)
      const lastResults = saved
        .filter((item) => demoNames.indexOf(item.fileName) >= 0)
        .map((item) => withOcrDisplay({
          ...item,
          ocrStatus: '示例数据'
        }))
      const stats = getInvoiceStats(saved)

      this.setData({
        lastResults,
        categoryRows: stats.categoryRows,
        pairCount: paired.pairs.length,
        recognitionProvider: '示例数据'
      })

      wx.showToast({
        title: '示例已载入',
        icon: 'success'
      })
    })
  },

  openCategory(event) {
    const app = getApp()
    app.globalData.pendingInvoiceCategory = event.currentTarget.dataset.id

    wx.switchTab({
      url: '/pages/invoices/invoices'
    })
  },

  // 重试单张识别失败的发票
  retrySingle(event) {
    if (this._importing) return

    const id = event.currentTarget.dataset.id
    const item = this.data.lastResults.find((r) => r.id === id)
    if (!item || !item.filePath) {
      wx.showToast({ title: '无法找到原件', icon: 'none' })
      return
    }

    const file = {
      name: item.fileName,
      path: item.filePath,
      size: 0,
      extraText: item.merchant + ' ' + (item.remark || '')
    }

    this._importing = true
    wx.showLoading({ title: '重试识别', mask: true })

    importInvoiceFiles([file])
      .then(({ saved, lastResults: importedResults }) => {
        const updatedResults = importedResults.map(withOcrDisplay)
        const stats = getInvoiceStats(saved)

        // 用新结果替换旧结果
        const existingResults = this.data.lastResults.filter((r) => r.id !== id)
        const allResults = [...updatedResults, ...existingResults]
        const failedCount = allResults.filter((r) => r.ocrErrorText).length

        this._importing = false
        this.setData({
          lastResults: allResults,
          categoryRows: stats.categoryRows,
          failedCount,
          busy: false,
          recognitionProvider: summarizeOcrProvider(allResults)
        })

        wx.showToast({
          title: updatedResults[0] && !updatedResults[0].ocrErrorText ? '识别成功' : '识别失败',
          icon: 'none'
        })
      })
      .catch(() => {
        this._importing = false
        wx.showToast({ title: '重试失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  // 批量重试所有失败项
  retryAllFailed() {
    if (this._importing || this.data.retryingAll) return

    const failedItems = this.data.lastResults.filter((item) => item.ocrErrorText && item.filePath)
    if (!failedItems.length) {
      wx.showToast({ title: '没有需要重试的项目', icon: 'none' })
      return
    }

    this.setData({ retryingAll: true })
    wx.showLoading({ title: `重试 ${failedItems.length} 张`, mask: true })

    const files = failedItems.map((item) => ({
      name: item.fileName,
      path: item.filePath,
      size: 0,
      extraText: item.merchant + ' ' + (item.remark || '')
    }))

    importInvoiceFiles(files)
      .then(({ saved, lastResults: importedResults }) => {
        const updatedResults = importedResults.map(withOcrDisplay)
        const stats = getInvoiceStats(saved)

        // 合并：成功的保留（包括这次重试成功的），仍然失败的保留
        const failedIds = new Set(failedItems.map((r) => r.id))
        const otherResults = this.data.lastResults.filter((r) => !failedIds.has(r.id))
        const allResults = [...updatedResults, ...otherResults]
        const failedCount = allResults.filter((r) => r.ocrErrorText).length

        this.setData({
          lastResults: allResults,
          categoryRows: stats.categoryRows,
          failedCount,
          retryingAll: false,
          busy: false,
          recognitionProvider: summarizeOcrProvider(allResults)
        })

        const successCount = updatedResults.filter((r) => !r.ocrErrorText).length
        wx.showToast({
          title: successCount > 0 ? `成功 ${successCount} 张` : '全部识别失败',
          icon: successCount > 0 ? 'success' : 'none'
        })
      })
      .catch(() => {
        this.setData({ retryingAll: false })
        wx.showToast({ title: '批量重试失败', icon: 'none' })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  goInvoices() {
    wx.switchTab({
      url: '/pages/invoices/invoices'
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
