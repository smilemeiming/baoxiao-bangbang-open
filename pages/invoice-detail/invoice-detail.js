const { CATEGORIES, getCategoryById } = require('../../utils/categories')
const { getInvoiceById, getInvoices, saveInvoices, decorateInvoice, isRecognitionFailed } = require('../../utils/invoice-store')
const { applyPairing } = require('../../utils/pairing')
const { archivePairedInvoices } = require('../../utils/file-archive')
const { reRecognizeInvoice } = require('../../utils/invoice-recognition')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')

const SOURCE_TYPES = ['扫描件', '电子发票']
const EVIDENCE_TYPES = ['发票', '行程单']
const INVOICE_TYPES = [
  '电子发票（增值税专用发票）',
  '电子发票（普通发票）',
  '增值税专用发票',
  '增值税普通发票',
  '增值税电子普通发票',
  '增值税普通发票（卷票）',
  '定额发票',
  '通用机打发票',
  '机动车销售统一发票',
  '二手车销售统一发票',
  '通行费电子发票',
  '铁路电子客票',
  '航空运输电子客票行程单',
  '出租汽车发票',
  '客运电子客票',
  '农产品收购发票',
  '医疗收费票据',
  '财政电子票据'
]

function normalizeOptionalAmount(value) {
  if (value == null || value === '') {
    return ''
  }

  const number = Number(`${value}`.replace(/,/g, ''))
  return Number.isNaN(number) ? null : Number(number.toFixed(2))
}

Page({
  data: {
    id: '',
    form: null,
    categories: CATEGORIES,
    categoryIndex: 0,
    sourceTypes: SOURCE_TYPES,
    sourceTypeIndex: 0,
    evidenceTypes: EVIDENCE_TYPES,
    evidenceTypeIndex: 0,
    invoiceTypes: INVOICE_TYPES,
    invoiceTypeIndex: 0,
    missing: false,
    recognizing: false
  },

  onLoad(options) {
    this.loadInvoice(options.id)
  },

  onShow() {
    enableShareMenu()
  },

  loadInvoice(id) {
    const invoice = getInvoiceById(id)

    if (!invoice) {
      this.setData({ missing: true })
      return
    }

    const form = decorateInvoice(invoice)
    this.setData({
      id,
      form,
      categoryIndex: Math.max(0, CATEGORIES.findIndex((item) => item.id === form.categoryId)),
      sourceTypeIndex: Math.max(0, SOURCE_TYPES.indexOf(form.sourceType)),
      evidenceTypeIndex: Math.max(0, EVIDENCE_TYPES.indexOf(form.evidenceType)),
      invoiceTypeIndex: Math.max(0, INVOICE_TYPES.indexOf(form.invoiceType))
    })
  },

  updateField(event) {
    const key = event.currentTarget.dataset.key
    const patch = {
      [`form.${key}`]: event.detail.value
    }

    if (key === 'merchant') {
      patch['form.platform'] = event.detail.value
    }

    this.setData(patch)
  },

  changeCategory(event) {
    const categoryIndex = Number(event.detail.value)
    const category = CATEGORIES[categoryIndex]

    this.setData({
      categoryIndex,
      'form.categoryId': category.id,
      'form.categoryName': category.name,
      'form.categoryIcon': category.icon,
      'form.categoryColor': category.color
    })
  },

  changeSourceType(event) {
    const sourceTypeIndex = Number(event.detail.value)
    this.setData({
      sourceTypeIndex,
      'form.sourceType': SOURCE_TYPES[sourceTypeIndex]
    })
  },

  changeEvidenceType(event) {
    const evidenceTypeIndex = Number(event.detail.value)
    this.setData({
      evidenceTypeIndex,
      'form.evidenceType': EVIDENCE_TYPES[evidenceTypeIndex]
    })
  },

  changeInvoiceType(event) {
    const invoiceTypeIndex = Number(event.detail.value)
    this.setData({
      invoiceTypeIndex,
      'form.invoiceType': INVOICE_TYPES[invoiceTypeIndex]
    })
  },

  // 重新识别当前发票原件
  reRecognize() {
    const form = this.data.form
    if (!form || !form.filePath) {
      wx.showToast({
        title: '无法找到原件路径',
        icon: 'none'
      })
      return
    }

    this.setData({ recognizing: true })
    wx.showLoading({ title: '重新识别中', mask: true })

    reRecognizeInvoice(form)
      .then((results) => {
        wx.hideLoading()
        this.setData({ recognizing: false })

        if (!results.length) {
          wx.showToast({ title: '识别失败，请手动修改', icon: 'none' })
          return
        }

        const recognized = results[0]
        // 合并识别结果到表单
        const updates = {}
        if (recognized.merchant && recognized.merchant !== '待识别发票') {
          updates['form.merchant'] = recognized.merchant
          updates['form.platform'] = recognized.platform
        }
        if (recognized.amount > 0) updates['form.amount'] = recognized.amount
        if (recognized.date) updates['form.date'] = recognized.date
        if (recognized.invoiceNo) updates['form.invoiceNo'] = recognized.invoiceNo
        if (recognized.taxNo) updates['form.taxNo'] = recognized.taxNo
        if (recognized.buyerName) updates['form.buyerName'] = recognized.buyerName
        if (recognized.buyerTaxNo) updates['form.buyerTaxNo'] = recognized.buyerTaxNo
        if (recognized.remark) updates['form.remark'] = recognized.remark
        if (recognized.routeOrigin) updates['form.routeOrigin'] = recognized.routeOrigin
        if (recognized.routeDestination) updates['form.routeDestination'] = recognized.routeDestination
        if (recognized.categoryId) {
          updates['form.categoryId'] = recognized.categoryId
          updates['form.categoryName'] = recognized.categoryName
          updates['form.categoryIcon'] = recognized.categoryIcon
          updates['form.categoryColor'] = recognized.categoryColor
          const idx = Math.max(0, CATEGORIES.findIndex((item) => item.id === recognized.categoryId))
          updates.categoryIndex = idx
        }
        if (recognized.invoiceType) {
          updates['form.invoiceType'] = recognized.invoiceType
          updates.invoiceTypeIndex = Math.max(0, INVOICE_TYPES.indexOf(recognized.invoiceType))
        }

        this.setData(updates)
        wx.showToast({
          title: recognized.ocrStatus === 'PaddleOCR' ? '云端识别完成' : '本地识别完成',
          icon: 'success'
        })
      })
      .catch(() => {
        wx.hideLoading()
        this.setData({ recognizing: false })
        wx.showToast({ title: '重新识别失败', icon: 'none' })
      })
  },

  saveInvoice() {
    const form = this.data.form

    if (!form) {
      wx.showToast({
        title: '未找到发票记录',
        icon: 'none'
      })
      return
    }

    const amount = normalizeOptionalAmount(form.amount)
    const taxAmount = normalizeOptionalAmount(form.taxAmount)
    const pretaxAmount = normalizeOptionalAmount(form.pretaxAmount)
    const allocatedAmount = normalizeOptionalAmount(form.allocatedAmount)

    if (!form.merchant || !form.date || amount == null || amount === '') {
      wx.showToast({
        title: '请补全必填项',
        icon: 'none'
      })
      return
    }

    if (taxAmount == null || pretaxAmount == null || allocatedAmount == null) {
      wx.showToast({
        title: '金额字段需为数字',
        icon: 'none'
      })
      return
    }

    const category = getCategoryById(form.categoryId)
    const wasRecognitionFailed = isRecognitionFailed(form)
    const nextForm = decorateInvoice({
      ...form,
      amount,
      taxAmount,
      pretaxAmount,
      allocatedAmount,
      platform: form.platform || form.merchant,
      ocrError: '',
      ocrStatus: wasRecognitionFailed ? '人工录入' : form.ocrStatus,
      status: wasRecognitionFailed ? '已人工补全' : form.status,
      manualCompletedAt: wasRecognitionFailed ? Date.now() : form.manualCompletedAt,
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color
    })
    const nextInvoices = getInvoices().map((item) => {
      return item.id === nextForm.id ? nextForm : item
    })
    const paired = applyPairing(nextInvoices)

    archivePairedInvoices(paired.invoices)
      .then((organizedInvoices) => {
        saveInvoices(organizedInvoices)
        this.setData({ form: decorateInvoice(organizedInvoices.find((item) => item.id === nextForm.id)) })

        wx.showToast({
          title: '已保存',
          icon: 'success'
        })
      })
  },

  previewOriginal() {
    const form = this.data.form

    if (!form) {
      wx.showToast({
        title: '未找到发票记录',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/original-preview/original-preview?id=${form.id}`
    })
  },

  goBack() {
    wx.navigateBack()
  },

  onShareAppMessage() {
    return getShareAppMessage()
  },

  onShareTimeline() {
    return getShareTimeline()
  }
})
