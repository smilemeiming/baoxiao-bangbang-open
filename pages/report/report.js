const { getInvoices, getInvoiceStats, decorateInvoice } = require('../../utils/invoice-store')
const { applyPairing } = require('../../utils/pairing')
const { REPORT_MODES, writeReportFile } = require('../../utils/report')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')

const LAST_REPORT_KEY = 'last_invoice_report_v1'

Page({
  data: {
    totalCount: 0,
    totalAmountText: '0.00',
    categoryRows: [],
    lastReportPath: '',
    lastReportName: '',
    lastReportModeName: '',
    reportModes: REPORT_MODES,
    reportModeIndex: 0,
    selectedReportMode: REPORT_MODES[0],
    exporting: false,
    empty: true
  },

  onShow() {
    enableShareMenu()
    this.refreshReport()
    this.loadLastReport()
  },

  refreshReport() {
    const paired = applyPairing(getInvoices().map(decorateInvoice))
    const invoices = paired.invoices
    const stats = getInvoiceStats(invoices)

    this.setData({
      totalCount: stats.totalCount,
      totalAmountText: stats.totalAmountText,
      categoryRows: stats.categoryRows.filter((item) => item.count > 0),
      empty: invoices.length === 0
    })
  },

  loadLastReport() {
    const lastReport = wx.getStorageSync(LAST_REPORT_KEY) || {}
    const validReport = lastReport.fileName && lastReport.fileName.endsWith('.xlsx') ? lastReport : {}

    this.setData({
      lastReportPath: validReport.filePath || '',
      lastReportName: validReport.fileName || '',
      lastReportModeName: validReport.modeName || ''
    })
  },

  changeReportMode(event) {
    const reportModeIndex = Number(event.detail.value)

    this.setData({
      reportModeIndex,
      selectedReportMode: REPORT_MODES[reportModeIndex] || REPORT_MODES[0]
    }, () => {
      this.refreshReport()
    })
  },

  exportExcel() {
    this.generateReportFile({ openAfterGenerate: true })
  },

  generateReportFile(options) {
    const invoices = applyPairing(getInvoices().map(decorateInvoice)).invoices
    const mode = this.data.selectedReportMode || REPORT_MODES[0]
    const shouldOpen = options && options.openAfterGenerate
    const shouldShare = options && options.shareAfterGenerate

    if (!invoices.length) {
      wx.showToast({
        title: '暂无发票',
        icon: 'none'
      })
      return
    }

    if (mode.id === 'lodgingMeal' && !invoices.some((item) => ['lodging', 'meal'].indexOf(item.categoryId) >= 0)) {
      wx.showToast({
        title: '暂无住宿餐补',
        icon: 'none'
      })
      return
    }

    this.setData({ exporting: true })
    wx.showLoading({ title: '生成中' })

    writeReportFile(invoices, { mode: mode.id })
      .then((report) => {
        wx.setStorageSync(LAST_REPORT_KEY, report)
        this.setData({
          lastReportPath: report.filePath,
          lastReportName: report.fileName,
          lastReportModeName: report.modeName,
          exporting: false
        })
        wx.hideLoading()

        if (shouldShare) {
          this.shareReportFile(report)
          return
        }

        if (shouldOpen) {
          this.openReportFile(report.filePath)
          return
        }

        wx.showToast({
          title: '已生成文件',
          icon: 'success'
        })
      })
      .catch(() => {
        this.setData({ exporting: false })
        wx.hideLoading()
        wx.showToast({
          title: '生成失败',
          icon: 'none'
        })
      })
  },

  openLastReport() {
    if (!this.data.lastReportPath) {
      this.exportExcel()
      return
    }

    this.openReportFile(this.data.lastReportPath)
  },

  openReportFile(filePath) {
    wx.openDocument({
      filePath,
      fileType: 'xlsx',
      showMenu: true,
      fail: () => {
        wx.showToast({
          title: '已生成文件',
          icon: 'success'
        })
      }
    })
  },

  shareReport() {
    if (!this.data.lastReportPath) {
      this.generateReportFile({ shareAfterGenerate: true })
      return
    }

    this.shareReportFile({
      filePath: this.data.lastReportPath,
      fileName: this.data.lastReportName || 'invoice-report.xlsx'
    })
  },

  shareReportFile(report) {
    if (!wx.shareFileMessage) {
      this.openReportFile(report.filePath)
      wx.showToast({
        title: '请用菜单转发',
        icon: 'none'
      })
      return
    }

    wx.shareFileMessage({
      filePath: report.filePath,
      fileName: report.fileName,
      success: () => {
        wx.showToast({
          title: '已调起分享',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '分享已取消',
          icon: 'none'
        })
      }
    })
  },

  goUpload() {
    wx.switchTab({
      url: '/pages/upload/upload'
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
