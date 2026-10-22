import * as pdfjs from './vendor/pdf.mjs'
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.mjs', import.meta.url).href
const api = window.invoiceApp
const $ = (id) => document.getElementById(id)
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const escape = (value) => `${value ?? ''}`.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
let state = { invoices: [], categories: [], modes: [], batches: [] }
let view = 'all'
let category = ''
let selected = new Set()
let editing = null
let busy = false
let previewUrl = null
let toastTimer

function toast(message) {
  clearTimeout(toastTimer)
  $('toast').textContent = `${message}`.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
  $('toast').hidden = false
  toastTimer = setTimeout(() => { $('toast').hidden = true }, 6000)
}

function filteredRows() {
  const query = $('search').value.toLowerCase().trim()
  return state.invoices.filter((item) => (view === 'all' || (view === 'pending' ? !item.confirmed : item.confirmed)) && (!category || item.categoryId === category) && (!query || [item.merchant, item.buyerName, item.invoiceNo, item.fileName].some((value) => `${value || ''}`.toLowerCase().includes(query))))
}

function reportRows() {
  const scope = $('report-scope').value
  let rows = scope === 'filtered'
    ? filteredRows()
    : scope === 'selected'
      ? state.invoices.filter((item) => selected.has(item.id))
      : state.invoices
  if ($('only-confirmed').checked) rows = rows.filter((item) => item.confirmed)
  if ($('report-mode').value === 'lodgingMeal') rows = rows.filter((item) => ['lodging', 'meal'].includes(item.categoryId))
  return rows
}

function renderExportPreview() {
  const rows = reportRows()
  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  $('export-preview').textContent = `将导出 ${rows.length} 张 · ¥${money(total)}`
  $('export').disabled = busy || rows.length === 0
}

function rowsForBatch(batchId) {
  const batch = state.batches.find((item) => item.id === batchId)
  if (!batch) return []
  const ids = new Set(batch.invoiceIds || [])
  let rows = state.invoices.filter((item) => ids.has(item.id))
  if ($('only-confirmed').checked) rows = rows.filter((item) => item.confirmed)
  if ($('report-mode').value === 'lodgingMeal') rows = rows.filter((item) => ['lodging', 'meal'].includes(item.categoryId))
  return rows
}

function renderBatchControls() {
  const select = $('batch-select')
  const current = state.batches.some((item) => item.id === select.value) ? select.value : ''
  select.innerHTML = `<option value="">${state.batches.length ? '选择批次' : '尚未创建批次'}</option>${state.batches.map((batch) => `<option value="${escape(batch.id)}">${escape(batch.name)}</option>`).join('')}`
  select.value = current
  const batch = state.batches.find((item) => item.id === current)
  const rows = batch ? rowsForBatch(current) : []
  $('batch-summary').textContent = batch
    ? `批次 ${batch.invoiceCount} 张 · 当前导出 ${rows.length} 张 · ¥${money(rows.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`
    : state.batches.length ? '请选择一个批次' : '尚未创建批次'
  $('batch-create').disabled = busy || selected.size === 0
  $('batch-export').disabled = busy || !batch || rows.length === 0
  $('batch-delete').disabled = busy || !batch
}

function findPotentialDuplicateIds(invoices) {
  const groups = new Map()
  for (const item of invoices) {
    const invoiceNo = `${item.invoiceNo || ''}`.replace(/[\s-]/g, '').toUpperCase()
    const merchant = `${item.merchant || ''}`.replace(/\s/g, '').toLowerCase()
    const taxNo = `${item.sellerTaxNo || ''}`.replace(/[\s-]/g, '').toUpperCase()
    if (!invoiceNo || /^(未知|无|未识别|-)$/i.test(invoiceNo)) continue
    const identities = [taxNo && `tax:${taxNo}`, merchant && `name:${merchant}`].filter(Boolean)
    for (const identity of identities) {
      const key = `${invoiceNo}:${identity}`
      const rows = groups.get(key) || []
      rows.push(item.id)
      groups.set(key, rows)
    }
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat())
}

function render() {
  const confirmed = state.invoices.filter((item) => item.confirmed)
  const pending = state.invoices.length - confirmed.length
  $('all-count').textContent = state.invoices.length
  $('pending-count').textContent = pending
  $('confirmed-count').textContent = confirmed.length
  $('total-count').innerHTML = `${state.invoices.length} <small>张</small>`
  $('review-count').innerHTML = `${pending} <small>张</small>`
  $('confirmed-total').innerHTML = `<small>¥</small>${money(confirmed.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`
  $('categories').innerHTML = state.categories.filter((cat) => state.invoices.some((item) => item.categoryId === cat.id)).map((cat) => `<button class="category-button ${category === cat.id ? 'active' : ''}" data-category="${escape(cat.id)}"><span class="category-dot"></span>${escape(cat.name)}<span>${state.invoices.filter((item) => item.categoryId === cat.id).length}</span></button>`).join('') || '<span class="category-button">导入后自动归类</span>'
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', !category && button.dataset.view === view))
  $('page-title').textContent = category ? state.categories.find((cat) => cat.id === category).name : ({ all: '全部发票', pending: '待核对', confirmed: '已核对' }[view])
  const rows = filteredRows()
  const possibleDuplicates = findPotentialDuplicateIds(state.invoices)
  $('visible-count').textContent = `${rows.length} 张`
  $('empty').hidden = rows.length > 0
  $('invoice-rows').innerHTML = rows.map((item) => `<tr data-id="${escape(item.id)}"><td class="checkbox-col"><input type="checkbox" aria-label="选择${escape(item.merchant || item.fileName)}" data-select="${escape(item.id)}" ${selected.has(item.id) ? 'checked' : ''}></td><td><strong>${escape(item.merchant || '待填写商家')}</strong><span class="file-meta">${escape(item.fileName)}${item.documentId ? ` · 第 ${item.page} 页` : ''}</span></td><td><span class="category-tag">${escape(item.categoryName)}</span></td><td>${escape(item.date || '待填写')}</td><td class="amount">¥ ${money(item.amount)}</td><td><span class="status ${item.confirmed ? 'done' : item.ocrError ? 'error' : ''}">${item.confirmed ? '已核对' : item.ocrError ? '需手动补全' : '待核对'}</span>${possibleDuplicates.has(item.id) ? '<span class="duplicate-warning" title="销售方和发票号码与其他记录相同，请对照原件确认">疑似重复</span>' : ''}</td><td class="last-col">›</td></tr>`).join('')
  $('selected-count').textContent = selected.size ? `已选择 ${selected.size} 张` : '未选择记录'
  $('select-all').checked = rows.length > 0 && rows.every((row) => selected.has(row.id))
  $('select-all').indeterminate = !rows.every((row) => selected.has(row.id)) && rows.some((row) => selected.has(row.id))
  $('delete').disabled = !selected.size || busy
  $('originals').disabled = !selected.size || busy
  $('undo').disabled = !state.canUndo || busy
  renderExportPreview()
  renderBatchControls()
}

async function refresh() {
  state = await api.snapshot()
  selected = new Set([...selected].filter((id) => state.invoices.some((item) => item.id === id)))
  render()
}

const pdfOptions = () => ({
  cMapUrl: new URL('./vendor/cmaps/', import.meta.url).href, cMapPacked: true,
  standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).href,
  wasmUrl: new URL('./vendor/wasm/', import.meta.url).href,
  isEvalSupported: false, useSystemFonts: true
})

async function renderPdfPage(page, scale = 2) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas
}

async function canvasBytes(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('无法读取图片内容。')
  return new Uint8Array(await blob.arrayBuffer())
}

async function prepareImage(bytes) {
  const bitmap = await createImageBitmap(new Blob([bytes]))
  try {
    const scale = Math.min(2, Math.max(1, 1800 / bitmap.width), 4000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvasBytes(canvas)
  } finally { bitmap.close() }
}

function pdfText(items) {
  let lastY = null
  return items.map((item) => {
    if (!item.str) return ''
    const y = item.transform?.[5]
    const prefix = lastY !== null && Math.abs(lastY - y) > 3 ? '\n' : ' '
    lastY = y
    return prefix + item.str
  }).join('')
}

async function processDocuments(documents) {
  if (!documents.length) return
  busy = true
  $('progress').hidden = false
  for (const id of ['import', 'manual', 'empty-import', 'backup', 'export', 'batch-create', 'batch-export', 'batch-delete']) $(id).disabled = true
  let count = 0
  let duplicates = 0
  const failures = []
  try {
    for (let index = 0; index < documents.length; index++) {
      const doc = documents[index]
      if (doc.error) { failures.push(`${doc.name}：${doc.error}`); continue }
      const pageStates = new Map((doc.pages || []).map((item) => [item.page, item]))
      const isComplete = (page) => {
        const existing = pageStates.get(page)
        return existing && (existing.ocrStatus !== '识别失败' || !existing.retryable)
      }
      $('progress-title').textContent = `正在处理 ${index + 1} / ${documents.length}：${doc.name}`
      try {
        const bytes = await api.readDocument(doc.id)
        if (doc.ext === '.pdf') {
          const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), ...pdfOptions() })
          const pdf = await loadingTask.promise
          try {
            if (pdf.numPages > 500) throw new Error('PDF 超过 500 页，请拆分后导入。')
            for (let number = 1; number <= pdf.numPages; number++) {
              if (isComplete(number)) { duplicates++; continue }
              $('progress-title').textContent = `${doc.name} · 第 ${number} / ${pdf.numPages} 页`
              try {
                const page = await pdf.getPage(number)
                const text = pdfText((await page.getTextContent()).items)
                if (text.replace(/\s/g, '').length >= 30 && /\d/.test(text)) {
                  await api.addPage({ documentId: doc.id, page: number, text, engine: 'PDF 文字提取', confidence: 0 })
                } else {
                  const canvas = await renderPdfPage(page, Math.min(2.4, 3400 / Math.max(page.getViewport({ scale: 1 }).width, page.getViewport({ scale: 1 }).height)))
                  const result = await api.recognize(await canvasBytes(canvas))
                  await api.addPage({ documentId: doc.id, page: number, text: result.text, engine: '本地 OCR', confidence: result.confidence })
                  canvas.width = 0
                }
                count++
              } catch (error) {
                await api.addPage({ documentId: doc.id, page: number, text: '', engine: '识别失败', confidence: 0 })
                failures.push(`${doc.name} 第 ${number} 页：${error.message}`)
              }
              await refresh()
            }
          } finally { await loadingTask.destroy() }
        } else {
          if (isComplete(1)) { duplicates++; continue }
          const result = await api.recognize(await prepareImage(bytes))
          await api.addPage({ documentId: doc.id, page: 1, text: result.text, engine: '本地 OCR', confidence: result.confidence })
          count++
        }
      } catch (error) {
        await api.addPage({ documentId: doc.id, page: 1, text: '', engine: '识别失败', confidence: 0 })
        failures.push(`${doc.name}：${error.message}`)
      }
      await refresh()
    }
    toast(`已读取 ${count} 页${duplicates ? `，跳过 ${duplicates} 页已有记录` : ''}${failures.length ? `；${failures.length} 项需手动补全。${failures[0]}` : '，请打开记录核对字段。'}`)
  } finally {
    busy = false
    $('progress').hidden = true
    for (const id of ['import', 'manual', 'empty-import', 'backup', 'export']) $(id).disabled = false
    await refresh()
  }
}

async function chooseFiles() {
  if (busy) return
  try { await processDocuments(await api.chooseFiles()) } catch (error) { toast(error.message) }
}

async function openEditor(id) {
  const item = state.invoices.find((row) => row.id === id)
  if (!item) return
  editing = item.id
  const form = $('edit-form')
  form.reset()
  form.elements.categoryId.innerHTML = state.categories.map((cat) => `<option value="${escape(cat.id)}">${escape(cat.name)}</option>`).join('')
  for (const element of form.elements) {
    if (!element.name) continue
    if (element.type === 'checkbox') element.checked = Boolean(item[element.name])
    else element.value = item[element.name] ?? ''
  }
  $('form-error').textContent = ''
  $('ocr-text').value = item.ocrText || '此记录没有可读取的原文。'
  $('source-status').textContent = `${item.ocrStatus || '本地记录'}${item.confidence ? ` · 文字识别置信度 ${Math.round(item.confidence)}%` : ''} · 请核对关键字段`
  $('source-name').textContent = item.fileName
  $('preview-page').textContent = item.documentId ? `第 ${item.page} 页` : ''
  $('preview').textContent = item.documentId ? '正在载入原件…' : '手动记录没有原件'
  $('editor').showModal()
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null }
  if (!item.documentId) return
  try {
    const bytes = await api.readDocument(item.documentId)
    if (editing !== id || !$('editor').open) return
    if (item.fileName.toLowerCase().endsWith('.pdf')) {
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), ...pdfOptions() })
      const pdf = await loadingTask.promise
      try {
        const canvas = await renderPdfPage(await pdf.getPage(item.page), 1)
        if (editing === id && $('editor').open) $('preview').replaceChildren(canvas)
      } finally { await loadingTask.destroy() }
    } else {
      previewUrl = URL.createObjectURL(new Blob([bytes]))
      const image = new Image()
      image.src = previewUrl
      image.alt = '发票原件'
      $('preview').replaceChildren(image)
    }
  } catch (error) { $('preview').textContent = `原件预览失败：${error.message}` }
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { view = button.dataset.view; category = ''; selected.clear(); render() }))
$('categories').addEventListener('click', (event) => { const button = event.target.closest('[data-category]'); if (button) { category = button.dataset.category; view = 'all'; selected.clear(); render() } })
$('search').addEventListener('input', render)
$('report-scope').addEventListener('change', renderExportPreview)
$('only-confirmed').addEventListener('change', () => { renderExportPreview(); renderBatchControls() })
$('report-mode').addEventListener('change', () => { renderExportPreview(); renderBatchControls() })
$('batch-select').addEventListener('change', renderBatchControls)
$('batch-create').addEventListener('click', () => {
  if (!selected.size || busy) return
  const date = new Date()
  const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  $('batch-create-detail').textContent = `将所选 ${selected.size} 条记录加入新批次。批次只做归集，不会移动或删除原件。`
  $('batch-name').value = `报销批次-${dateText}`
  $('batch-dialog').showModal()
  $('batch-name').focus()
})
$('cancel-batch').addEventListener('click', () => $('batch-dialog').close())
$('batch-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  try {
    const batch = await api.createBatch($('batch-name').value, [...selected])
    await refresh()
    $('batch-select').value = batch.id
    renderBatchControls()
    $('batch-dialog').close()
    toast(`已创建批次“${batch.name}”。`)
  } catch (error) { toast(error.message) }
})
$('batch-export').addEventListener('click', async () => {
  if (busy || !$('batch-select').value) return
  try {
    const result = await api.exportBatchPackage($('batch-select').value, $('report-mode').value, $('only-confirmed').checked)
    if (result) toast(`批次资料包已保存：${result.path}（${result.invoiceCount} 条记录、${result.originalCount} 份去重原件）`)
  } catch (error) { toast(error.message) }
})
$('batch-delete').addEventListener('click', () => {
  const batch = state.batches.find((item) => item.id === $('batch-select').value)
  if (!batch) return
  $('batch-delete-name').textContent = batch.name
  $('batch-delete-dialog').showModal()
})
$('cancel-batch-delete').addEventListener('click', () => $('batch-delete-dialog').close())
$('confirm-batch-delete').addEventListener('click', async () => {
  try {
    await api.deleteBatch($('batch-select').value)
    $('batch-delete-dialog').close()
    await refresh()
    toast('批次已删除，发票记录和原件仍保留。')
  } catch (error) { toast(error.message) }
})
$('invoice-rows').addEventListener('click', (event) => {
  if (event.target.matches('[data-select]')) { const id = event.target.dataset.select; event.target.checked ? selected.add(id) : selected.delete(id); render(); return }
  const row = event.target.closest('[data-id]')
  if (row) openEditor(row.dataset.id).catch((error) => toast(error.message))
})
$('select-all').addEventListener('change', (event) => { for (const row of filteredRows()) event.target.checked ? selected.add(row.id) : selected.delete(row.id); render() })
for (const id of ['import', 'empty-import']) $(id).addEventListener('click', chooseFiles)
$('dropzone').addEventListener('click', chooseFiles)
$('dropzone').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseFiles() } })
for (const type of ['dragenter', 'dragover']) $('dropzone').addEventListener(type, (event) => { event.preventDefault(); $('dropzone').classList.add('dragging') })
$('dropzone').addEventListener('dragleave', () => $('dropzone').classList.remove('dragging'))
document.addEventListener('dragover', (event) => event.preventDefault())
document.addEventListener('drop', (event) => event.preventDefault())
$('dropzone').addEventListener('drop', async (event) => {
  event.preventDefault()
  $('dropzone').classList.remove('dragging')
  if (busy) return
  const documents = []
  for (const file of event.dataTransfer.files) {
    try {
      if (file.size > 80 * 1024 * 1024) throw new Error('超过 80 MB。')
      documents.push(await api.importBytes(file.name, new Uint8Array(await file.arrayBuffer())))
    } catch (error) { documents.push({ name: file.name, error: error.message }) }
  }
  await processDocuments(documents)
})
$('manual').addEventListener('click', async () => { try { const row = await api.addManual(); await refresh(); await openEditor(row.id) } catch (error) { toast(error.message) } })
$('close-editor').addEventListener('click', () => { $('editor').close(); editing = null })
$('edit-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const values = Object.fromEntries(new FormData(event.currentTarget))
  values.confirmed = event.currentTarget.elements.confirmed.checked
  try { await api.update(editing, values); $('editor').close(); editing = null; await refresh(); toast('记录已保存。') } catch (error) { $('form-error').textContent = error.message }
})
$('delete').addEventListener('click', () => $('delete-dialog').showModal())
$('cancel-delete').addEventListener('click', () => $('delete-dialog').close())
$('confirm-delete').addEventListener('click', async () => { try { await api.remove([...selected]); selected.clear(); $('delete-dialog').close(); await refresh(); toast('已删除，可撤销上次操作。') } catch (error) { toast(error.message) } })
$('undo').addEventListener('click', async () => { try { await api.undo(); await refresh(); toast('已恢复最近删除的记录。') } catch (error) { toast(error.message) } })
$('export').addEventListener('click', async () => { try { const scope = $('report-scope').value; const ids = scope === 'all' ? null : reportRows().map((item) => item.id); const result = await api.exportReport($('report-mode').value, $('only-confirmed').checked, ids); if (result) toast(`报表已保存：${result.path}`) } catch (error) { toast(error.message) } })
$('originals').addEventListener('click', async () => { try { const result = await api.exportOriginals([...selected]); if (result) toast(`已导出 ${result.count} 份原件副本。多页 PDF 保留整份原件。`) } catch (error) { toast(error.message) } })
$('backup').addEventListener('click', async () => { try { const result = await api.backup(); if (result) toast(`含原件的数据备份已保存：${result.path}`) } catch (error) { toast(error.message) } })
$('open-data').addEventListener('click', () => api.openData().catch((error) => toast(error.message)))
$('restore').addEventListener('click', async () => { if (busy) return; try { const result = await api.restore(); if (result) { await refresh(); toast(`已恢复 ${result.count} 条记录，已有记录保持原样。`) } } catch (error) { toast(error.message) } })
api.onProgress(({ status, progress }) => {
  $('progress-bar').value = Math.round(progress * 100)
  $('progress-detail').textContent = status === 'recognizing text' ? `本地识别 ${Math.round(progress * 100)}%` : '正在载入本地模型'
})
await refresh().catch((error) => toast(error.message))

export { processDocuments, openEditor, refresh }
