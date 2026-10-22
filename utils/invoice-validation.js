function isAirItinerary(item) {
  const source = [
    item && item.invoiceProfile,
    item && item.invoiceType,
    item && item.fileName,
    item && item.merchant
  ].filter(Boolean).join(' ')

  return Boolean(
    item && item.invoiceProfile === 'air-itinerary' ||
    /航空运输电子客票行程单|电子客票行程单|(?:航空|航旅|客票).{0,10}行程单|行程单.{0,10}(?:航空|客票|航班)/i.test(source)
  )
}

function getNonInvoiceReason(item) {
  if (!item || isAirItinerary(item)) {
    return ''
  }

  if (item.nonInvoiceReason) {
    return item.nonInvoiceReason
  }

  const source = [
    item.fileName,
    item.invoiceType,
    item.evidenceType,
    item.merchant,
    item.remark
  ].filter(Boolean).join(' ')

  if (item.evidenceType === '行程单' || /行程单|行程报告|出行报告/.test(source)) {
    return '非航空行程单'
  }

  if (/(?:住宿|酒店|客房).{0,12}(?:结算单|账单|消费明细|费用明细|入住清单)|(?:结算单|账单|消费明细|费用明细|入住清单).{0,12}(?:住宿|酒店|客房)/.test(source)) {
    return '住宿结算或消费明细'
  }

  if (/结算单|对账单|账单|消费明细|费用明细|入住清单/.test(source)) {
    return '结算或消费明细'
  }

  if (/报销单|费用申请单|付款申请单|预订确认单|订单详情/.test(source)) {
    return '报销或订单辅助单据'
  }

  return ''
}

function splitUploadableInvoices(items) {
  return (items || []).reduce((result, item) => {
    const reason = getNonInvoiceReason(item)

    if (reason) {
      result.rejected.push({
        ...item,
        rejectionReason: reason
      })
    } else {
      result.accepted.push(item)
    }

    return result
  }, {
    accepted: [],
    rejected: []
  })
}

function showRejectedFiles(rejected, acceptedCount) {
  if (!rejected || !rejected.length) {
    return
  }

  const names = rejected
    .slice(0, 3)
    .map((item) => `${item.fileName || item.merchant || '未命名文件'}`.slice(0, 30))
    .join('、')
  const remaining = rejected.length > 3 ? `等 ${rejected.length} 个文件` : ''
  const accepted = acceptedCount > 0 ? `其余 ${acceptedCount} 张发票已正常导入。` : ''

  wx.showModal({
    title: '不能上传非发票文件',
    content: `${names}${remaining}属于行程单、结算单或其他辅助单据，未计入发票金额。航空运输电子客票行程单可以正常上传。${accepted}`,
    showCancel: false,
    confirmText: '知道了'
  })
}

module.exports = {
  getNonInvoiceReason,
  isAirItinerary,
  showRejectedFiles,
  splitUploadableInvoices
}
