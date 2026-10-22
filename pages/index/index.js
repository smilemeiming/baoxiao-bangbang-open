const { getInvoices, saveInvoices, getInvoiceStats, decorateInvoice } = require('../../utils/invoice-store')
const { applyPairing } = require('../../utils/pairing')
const { importInvoiceFiles } = require('../../utils/invoice-import')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')
const { isDesktopWechat } = require('../../utils/device')
const { showRejectedFiles } = require('../../utils/invoice-validation')

Page({
  data: {
    successCount: 0,
    failedCount: 0,
    totalAmountText: '0.00',
    recentInvoices: [],
    empty: true,
    importBusy: false,
    desktopMode: false
  },

  onLoad() {
    this.setData({
      desktopMode: isDesktopWechat()
    })
  },

  onShow() {
    enableShareMenu()
    this.refreshDashboard()
  },

  refreshDashboard() {
    const invoices = getInvoices().map(decorateInvoice)
    const paired = applyPairing(invoices)
    const savedInvoices = saveInvoices(paired.invoices)
    const stats = getInvoiceStats(savedInvoices)

    this.setData({
      successCount: stats.successCount,
      failedCount: stats.failedCount,
      totalAmountText: stats.totalAmountText,
      recentInvoices: savedInvoices.slice(0, 4),
      empty: savedInvoices.length === 0
    })
  },

  startScan() {
    if (this._importing) {
      return
    }

    if (isDesktopWechat()) {
      this.chooseLocalFiles()
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

  startUpload() {
    if (this._importing) {
      return
    }

    this.chooseLocalFiles()
  },

  chooseLocalFiles() {
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

  importFiles(files) {
    if (!files.length || this._importing) {
      return
    }

    this._importing = true
    this.setData({ importBusy: true })
    wx.showLoading({
      title: '正在识别',
      mask: true
    })

    importInvoiceFiles(files)
      .then(({ recognizedCount, rejectedResults, lastResults }) => {
        this.refreshDashboard()
        if (rejectedResults.length) {
          showRejectedFiles(rejectedResults, recognizedCount)
          return
        }
        const failed = lastResults.every((item) => item.ocrError)

        wx.showToast({
          title: failed ? '识别失败，请查看总览' : `已识别 ${recognizedCount} 张`,
          icon: 'none'
        })
      })
      .catch(() => {
        wx.showToast({
          title: '识别失败',
          icon: 'none'
        })
      })
      .finally(() => {
        this._importing = false
        this.setData({ importBusy: false })
        wx.hideLoading()
      })
  },

  goInvoices() {
    wx.switchTab({
      url: '/pages/invoices/invoices'
    })
  },

  goReport() {
    wx.switchTab({
      url: '/pages/report/report'
    })
  },

  goRename() {
    if (this._importing) {
      return
    }

    wx.navigateTo({
      url: '/pages/rename/rename'
    })
  },

  openInvoiceDetail(event) {
    const id = event.currentTarget.dataset.id

    if (!id) {
      return
    }

    wx.navigateTo({
      url: `/pages/invoice-detail/invoice-detail?id=${id}`
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
