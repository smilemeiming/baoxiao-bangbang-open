const { recognizeFilesAsync } = require('./invoice-recognition')
const { getInvoices, saveInvoices, decorateInvoice } = require('./invoice-store')
const { applyPairing } = require('./pairing')
const { archiveInvoices, archivePairedInvoices } = require('./file-archive')
const { splitUploadableInvoices } = require('./invoice-validation')

function importInvoiceFiles(files) {
  return recognizeFilesAsync(files)
    .then((rows) => {
      const split = splitUploadableInvoices(rows.map(decorateInvoice))

      return archiveInvoices(split.accepted).then((archivedRows) => ({
        archivedRows,
        rejectedResults: split.rejected
      }))
    })
    .then(({ archivedRows, rejectedResults }) => {
      const recognized = archivedRows.map(decorateInvoice)
      const recognizedIds = recognized.map((item) => item.id)
      const paired = applyPairing([...recognized, ...getInvoices().map(decorateInvoice)])

      return archivePairedInvoices(paired.invoices).then((organizedInvoices) => ({
        recognizedIds,
        recognizedCount: recognized.length,
        rejectedResults,
        paired,
        organizedInvoices
      }))
    })
    .then(({ recognizedIds, recognizedCount, rejectedResults, paired, organizedInvoices }) => {
      const saved = saveInvoices(organizedInvoices)

      return {
        saved,
        recognizedCount,
        rejectedCount: rejectedResults.length,
        rejectedResults,
        pairCount: paired.pairs.length,
        lastResults: saved.filter((item) => recognizedIds.indexOf(item.id) >= 0)
      }
    })
}

module.exports = {
  importInvoiceFiles
}
