const { CATEGORIES } = require('../../utils/categories')
const { getInvoices, saveInvoices, decorateInvoice } = require('../../utils/invoice-store')
const { applyPairing } = require('../../utils/pairing')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')

Page({
  data: {
    filters: [{ id: 'all', name: '全部', icon: '🧾' }, ...CATEGORIES],
    activeCategory: 'all',
    invoices: [],
    filteredInvoices: [],
    empty: true,
    selectionMode: false,
    selectedIds: [],
    selectedCount: 0,
    deleteDisabled: true,
    allFilteredSelected: false,
    toolbarTitle: '共 0 张',
    selectAllText: '全选',
    lastDeletedInvoices: [],
    lastDeletedCount: 0,
    showUndo: false
  },

  onShow() {
    enableShareMenu()
    const app = getApp()
    const pendingCategory = app.globalData.pendingInvoiceCategory

    if (pendingCategory && this.data.filters.some((item) => item.id === pendingCategory)) {
      this.setData({
        activeCategory: pendingCategory,
        selectionMode: false,
        selectedIds: [],
        selectedCount: 0,
        deleteDisabled: true,
        allFilteredSelected: false
      })
    }

    app.globalData.pendingInvoiceCategory = ''
    this.refreshList()
  },

  refreshList() {
    const paired = applyPairing(getInvoices().map(decorateInvoice))
    const invoices = saveInvoices(paired.invoices)
    const activeCategory = this.data.activeCategory
    const selectedIds = this.data.selectedIds.filter((id) => {
      return invoices.some((item) => item.id === id)
    })
    const selectedSet = new Set(selectedIds)
    const filteredInvoices = (activeCategory === 'all'
      ? invoices
      : invoices.filter((item) => item.categoryId === activeCategory))
      .map((item) => ({
        ...item,
        selected: selectedSet.has(item.id)
      }))
    const allFilteredSelected = filteredInvoices.length > 0 && filteredInvoices.every((item) => item.selected)
    const selectedCount = selectedIds.length

    this.setData({
      invoices,
      selectedIds,
      selectedCount,
      deleteDisabled: selectedCount === 0,
      filteredInvoices,
      empty: filteredInvoices.length === 0,
      allFilteredSelected,
      toolbarTitle: this.data.selectionMode ? `已选择 ${selectedCount} 张` : `共 ${filteredInvoices.length} 张`,
      selectAllText: allFilteredSelected ? '取消全选' : '全选'
    })
  },

  setFilter(event) {
    const activeCategory = event.currentTarget.dataset.id
    this.setData({
      activeCategory,
      selectionMode: false,
      selectedIds: [],
      selectedCount: 0,
      deleteDisabled: true,
      allFilteredSelected: false
    }, () => {
      this.refreshList()
    })
  },

  enterSelectionMode() {
    this.setData({
      selectionMode: true,
      selectedIds: [],
      selectedCount: 0,
      deleteDisabled: true,
      allFilteredSelected: false
    }, () => {
      this.refreshList()
    })
  },

  exitSelectionMode() {
    this.setData({
      selectionMode: false,
      selectedIds: [],
      selectedCount: 0,
      deleteDisabled: true,
      allFilteredSelected: false
    }, () => {
      this.refreshList()
    })
  },

  toggleSelect(event) {
    const id = event.currentTarget.dataset.id
    const selectedSet = new Set(this.data.selectedIds)

    if (selectedSet.has(id)) {
      selectedSet.delete(id)
    } else {
      selectedSet.add(id)
    }

    this.setData({
      selectedIds: Array.from(selectedSet)
    }, () => {
      this.refreshList()
    })
  },

  toggleSelectAll() {
    const filteredIds = this.data.filteredInvoices.map((item) => item.id)
    const selectedSet = new Set(this.data.selectedIds)

    if (this.data.allFilteredSelected) {
      filteredIds.forEach((id) => selectedSet.delete(id))
    } else {
      filteredIds.forEach((id) => selectedSet.add(id))
    }

    this.setData({
      selectedIds: Array.from(selectedSet)
    }, () => {
      this.refreshList()
    })
  },

  removeSelected() {
    if (!this.data.selectedIds.length) {
      wx.showToast({
        title: '请先选择发票',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '删除所选发票',
      content: `确认删除选中的 ${this.data.selectedIds.length} 张发票？`,
      confirmColor: '#dc2626',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        this.deleteInvoices(this.data.selectedIds)
      }
    })
  },

  removeInvoice(event) {
    const id = event.currentTarget.dataset.id
    const target = this.data.invoices.find((item) => item.id === id)

    wx.showModal({
      title: '删除发票',
      content: target ? target.fileName : '确认删除这张发票？',
      confirmColor: '#dc2626',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        this.deleteInvoices([id])
      }
    })
  },

  deleteInvoices(ids) {
    const selectedSet = new Set(ids)
    const deletedInvoices = this.data.invoices.filter((item) => selectedSet.has(item.id))
    const next = this.data.invoices.filter((item) => !selectedSet.has(item.id))

    if (!deletedInvoices.length) {
      return
    }

    saveInvoices(applyPairing(next).invoices)
    this.setData({
      selectionMode: false,
      selectedIds: [],
      selectedCount: 0,
      deleteDisabled: true,
      allFilteredSelected: false,
      lastDeletedInvoices: deletedInvoices,
      lastDeletedCount: deletedInvoices.length,
      showUndo: true
    }, () => {
      this.refreshList()
      wx.showToast({
        title: `已删除 ${deletedInvoices.length} 张`,
        icon: 'none'
      })
    })
  },

  restoreDeleted() {
    if (!this.data.lastDeletedInvoices.length) {
      return
    }

    const currentInvoices = getInvoices().map(decorateInvoice)
    const currentIds = new Set(currentInvoices.map((item) => item.id))
    const restoredInvoices = this.data.lastDeletedInvoices.filter((item) => !currentIds.has(item.id))

    saveInvoices(applyPairing([...restoredInvoices, ...currentInvoices]).invoices)
    this.setData({
      lastDeletedInvoices: [],
      lastDeletedCount: 0,
      showUndo: false
    }, () => {
      this.refreshList()
      wx.showToast({
        title: `已恢复 ${restoredInvoices.length} 张`,
        icon: 'none'
      })
    })
  },

  handleCardTap(event) {
    if (this.data.selectionMode) {
      this.toggleSelect(event)
      return
    }

    this.goDetail(event)
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/invoice-detail/invoice-detail?id=${event.currentTarget.dataset.id}`
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
