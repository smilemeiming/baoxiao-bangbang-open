const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('invoiceApp', {
  snapshot: () => ipcRenderer.invoke('library:snapshot'),
  createBatch: (name, invoiceIds) => ipcRenderer.invoke('library:create-batch', { name, invoiceIds }),
  deleteBatch: (id) => ipcRenderer.invoke('library:delete-batch', id),
  chooseFiles: () => ipcRenderer.invoke('files:choose'),
  importBytes: (name, bytes) => ipcRenderer.invoke('files:import', { name, bytes }),
  readDocument: (id) => ipcRenderer.invoke('files:read', id),
  recognize: (bytes) => ipcRenderer.invoke('ocr:recognize', bytes),
  addPage: (data) => ipcRenderer.invoke('library:add-page', data),
  addManual: () => ipcRenderer.invoke('library:add-manual'),
  update: (id, values) => ipcRenderer.invoke('library:update', { id, values }),
  remove: (ids) => ipcRenderer.invoke('library:remove', ids),
  undo: () => ipcRenderer.invoke('library:undo'),
  exportReport: (mode, confirmed, invoiceIds) => ipcRenderer.invoke('report:export', { mode, confirmed, invoiceIds }),
  exportBatchPackage: (batchId, mode, confirmed) => ipcRenderer.invoke('report:export-batch', { batchId, mode, confirmed }),
  exportOriginals: (ids) => ipcRenderer.invoke('files:export', ids),
  backup: () => ipcRenderer.invoke('library:backup'),
  restore: () => ipcRenderer.invoke('library:restore'),
  openData: () => ipcRenderer.invoke('library:open-data'),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('ocr:progress', listener)
    return () => ipcRenderer.removeListener('ocr:progress', listener)
  }
})
