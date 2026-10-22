function parseDate(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function dayGap(left, right) {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.abs(parseDate(left).getTime() - parseDate(right).getTime()) / oneDay
}

function amountGap(left, right) {
  const max = Math.max(Number(left) || 0, Number(right) || 0, 1)
  return Math.abs((Number(left) || 0) - (Number(right) || 0)) / max
}

function isTaxiPair(invoice, receipt) {
  if (invoice.categoryId !== 'taxi' || receipt.categoryId !== 'taxi') {
    return false
  }

  if (invoice.evidenceType === receipt.evidenceType) {
    return false
  }

  if (invoice.platform !== receipt.platform) {
    return false
  }

  return dayGap(invoice.date, receipt.date) <= 1 && amountGap(invoice.amount, receipt.amount) <= 0.05
}

function applyPairing(invoices) {
  const nextInvoices = (invoices || []).map((item) => ({
    ...item,
    pairId: '',
    pairLabel: '',
    folderName: ''
  }))
  const pairs = []
  const used = {}
  const taxiInvoices = nextInvoices.filter((item) => item.categoryId === 'taxi')

  taxiInvoices.forEach((item) => {
    if (used[item.id] || item.evidenceType !== '发票') {
      return
    }

    const match = taxiInvoices
      .filter((candidate) => !used[candidate.id] && candidate.evidenceType !== item.evidenceType)
      .map((candidate) => ({
        item: candidate,
        score: dayGap(item.date, candidate.date) + amountGap(item.amount, candidate.amount)
      }))
      .filter((candidate) => isTaxiPair(item, candidate.item))
      .sort((left, right) => left.score - right.score)[0]

    if (!match) {
      return
    }

    const pairId = `pair_${item.id}_${match.item.id}`
    const folderName = `${item.platform}-${item.date}-打车报销`
    item.pairId = pairId
    item.pairLabel = '已配对'
    item.folderName = folderName
    match.item.pairId = pairId
    match.item.pairLabel = '已配对'
    match.item.folderName = folderName
    used[item.id] = true
    used[match.item.id] = true
    pairs.push({
      id: pairId,
      platform: item.platform,
      date: item.date,
      amount: item.amount,
      amountText: item.amount.toFixed(2),
      folderName,
      invoiceId: item.id,
      receiptId: match.item.id
    })
  })

  return {
    invoices: nextInvoices,
    pairs
  }
}

module.exports = {
  applyPairing
}
