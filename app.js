const { ensureInvoiceStore } = require('./utils/invoice-store')

const { cloudEnvId } = require('./config.local')

App({
  onLaunch() {
    this.globalData.cloudEnabled = Boolean(wx.cloud && cloudEnvId)
    if (this.globalData.cloudEnabled) {
      wx.cloud.init({
        env: cloudEnvId,
        traceUser: true
      })
    }

    ensureInvoiceStore()

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

  },

  globalData: {
    appName: '报销帮帮',
    cloudEnabled: false,
    pendingImportAction: '',
    pendingInvoiceCategory: ''
  }
})
