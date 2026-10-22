const { getInvoices, saveInvoices, decorateInvoice } = require('../../utils/invoice-store')
const { applyPairing } = require('../../utils/pairing')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')
const {
  RENAME_FIELD_OPTIONS,
  RENAME_SEPARATOR_OPTIONS,
  DEFAULT_RENAME_RULE,
  buildRenamePreview,
  renameInvoiceFiles
} = require('../../utils/invoice-rename')

function markRenameFieldOptions(selectedIds) {
  const selected = (selectedIds || []).reduce((map, id) => {
    map[id] = true
    return map
  }, {})

  return RENAME_FIELD_OPTIONS.map((item) => ({
    ...item,
    checked: Boolean(selected[item.id])
  }))
}

function getSeparatorByIndex(index) {
  return RENAME_SEPARATOR_OPTIONS[index] || RENAME_SEPARATOR_OPTIONS[0]
}

function getRenamableInvoices(invoices) {
  return (invoices || []).filter((item) => !item.ocrError)
}

Page({
  data: {
    renaming: false,
    renameFieldOptions: markRenameFieldOptions(DEFAULT_RENAME_RULE.fieldIds),
    renameSelectedFieldIds: DEFAULT_RENAME_RULE.fieldIds,
    renameSeparatorOptions: RENAME_SEPARATOR_OPTIONS,
    renameSeparatorIndex: 0,
    selectedRenameSeparator: RENAME_SEPARATOR_OPTIONS[0],
    renameShowIndex: DEFAULT_RENAME_RULE.showIndex,
    renameIncludeExpenseItem: DEFAULT_RENAME_RULE.includeExpenseItem,
    renameCustomText: DEFAULT_RENAME_RULE.customText,
    renameInvoiceCount: 0,
    renamePreviewRows: [],
    renamePreviewEmpty: true,
    renameActionDisabled: true,
    renameResultText: '',
    empty: true
  },

  onShow() {
    enableShareMenu()
    this.refreshRenamePreview()
  },

  buildRenameRule() {
    return {
      fieldIds: this.data.renameSelectedFieldIds,
      separator: this.data.selectedRenameSeparator.value,
      showIndex: this.data.renameShowIndex,
      includeExpenseItem: this.data.renameIncludeExpenseItem,
      customText: this.data.renameCustomText
    }
  },

  getCurrentInvoices() {
    return applyPairing(getInvoices().map(decorateInvoice)).invoices
  },

  refreshRenamePreview() {
    const invoices = getRenamableInvoices(this.getCurrentInvoices())
    const preview = buildRenamePreview(invoices, this.buildRenameRule())

    this.setData({
      renameInvoiceCount: invoices.length,
      renamePreviewRows: preview.rows,
      renamePreviewEmpty: preview.rows.length === 0,
      renameActionDisabled: preview.disabled,
      empty: invoices.length === 0
    })
  },

  changeRenameFields(event) {
    const renameSelectedFieldIds = event.detail.value || []

    this.setData({
      renameSelectedFieldIds,
      renameFieldOptions: markRenameFieldOptions(renameSelectedFieldIds),
      renameResultText: ''
    }, () => {
      this.refreshRenamePreview()
    })
  },

  changeRenameSeparator(event) {
    const renameSeparatorIndex = Number(event.detail.value)

    this.setData({
      renameSeparatorIndex,
      selectedRenameSeparator: getSeparatorByIndex(renameSeparatorIndex),
      renameResultText: ''
    }, () => {
      this.refreshRenamePreview()
    })
  },

  toggleRenameIndex(event) {
    this.setData({
      renameShowIndex: event.detail.value,
      renameResultText: ''
    }, () => {
      this.refreshRenamePreview()
    })
  },

  toggleRenameExpenseItem(event) {
    this.setData({
      renameIncludeExpenseItem: event.detail.value,
      renameResultText: ''
    }, () => {
      this.refreshRenamePreview()
    })
  },

  changeRenameCustomText(event) {
    this.setData({
      renameCustomText: event.detail.value,
      renameResultText: ''
    }, () => {
      this.refreshRenamePreview()
    })
  },

  renameInvoices() {
    const allInvoices = this.getCurrentInvoices()
    const invoices = getRenamableInvoices(allInvoices)
    const rule = this.buildRenameRule()

    if (!invoices.length) {
      wx.showToast({
        title: '暂无可命名文件',
        icon: 'none'
      })
      return Promise.resolve()
    }

    if (this.data.renameActionDisabled) {
      wx.showToast({
        title: '请先选择命名字段',
        icon: 'none'
      })
      return Promise.resolve()
    }

    this.setData({ renaming: true, renameResultText: '' })
    wx.showLoading({ title: '命名中' })

    return renameInvoiceFiles(invoices, rule)
      .then((result) => {
        const renamedMap = result.invoices.reduce((map, item) => {
          map[item.id] = item
          return map
        }, {})
        const nextInvoices = allInvoices.map((item) => renamedMap[item.id] || item)

        saveInvoices(applyPairing(nextInvoices).invoices)
        wx.hideLoading()

        const failedText = result.failedCount ? `，${result.failedCount} 张未处理` : ''
        this.setData({
          renaming: false,
          renameResultText: `已命名 ${result.successCount} 张${failedText}`
        }, () => {
          this.refreshRenamePreview()
        })

        wx.showToast({
          title: result.successCount ? '命名完成' : '未完成命名',
          icon: 'none'
        })
      })
      .catch(() => {
        wx.hideLoading()
        this.setData({ renaming: false })
        wx.showToast({
          title: '命名失败',
          icon: 'none'
        })
      })
  },

  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
