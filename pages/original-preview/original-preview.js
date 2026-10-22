const { getInvoiceById } = require('../../utils/invoice-store')
const { enableShareMenu, getShareAppMessage, getShareTimeline } = require('../../utils/share')

const CACHE_DIR_NAME = 'original-preview-cache'

function isPdfFile(invoice, filePath) {
  const name = `${invoice.fileName || filePath || ''}`.toLowerCase()

  return invoice.fileType === 'pdf' || name.endsWith('.pdf')
}

function getExt(invoice, filePath) {
  const value = `${invoice.fileName || filePath || ''}`
  const match = value.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/)

  return match ? match[1].toLowerCase() : 'jpg'
}

function accessFile(filePath) {
  return new Promise((resolve) => {
    if (!filePath || filePath.indexOf('cloud://') === 0) {
      resolve('')
      return
    }

    wx.getFileSystemManager().access({
      path: filePath,
      success: () => resolve(filePath),
      fail: () => resolve('')
    })
  })
}

function ensureDir(dirPath) {
  return new Promise((resolve) => {
    wx.getFileSystemManager().mkdir({
      dirPath,
      recursive: true,
      success: resolve,
      fail: resolve
    })
  })
}

function copyFile(sourcePath, targetPath) {
  return new Promise((resolve) => {
    if (!sourcePath || sourcePath === targetPath) {
      resolve(sourcePath)
      return
    }

    wx.getFileSystemManager().copyFile({
      srcPath: sourcePath,
      destPath: targetPath,
      success: () => resolve(targetPath),
      fail: () => resolve(sourcePath)
    })
  })
}

function cachePreviewFile(sourcePath, invoice) {
  if (!sourcePath) {
    return Promise.resolve(sourcePath)
  }

  const cacheDir = `${wx.env.USER_DATA_PATH}/${CACHE_DIR_NAME}`
  const ext = getExt(invoice, sourcePath)
  const targetPath = `${cacheDir}/${invoice.id || Date.now()}.${ext}`

  return ensureDir(cacheDir).then(() => copyFile(sourcePath, targetPath))
}

function downloadCloudFile(fileID) {
  return new Promise((resolve) => {
    if (!fileID || !wx.cloud) {
      resolve('')
      return
    }

    wx.cloud.downloadFile({
      fileID,
      success: (result) => resolve(result.tempFilePath || ''),
      fail: () => resolve('')
    })
  })
}

function openDocumentFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.openDocument({
      filePath,
      fileType: 'pdf',
      showMenu: true,
      success: resolve,
      fail: reject
    })
  })
}

Page({
  data: {
    id: '',
    invoice: null,
    loading: true,
    missing: false,
    errorMessage: '',
    sourcePath: '',
    originalPath: '',
    displayPath: '',
    fileName: '',
    isImage: false,
    imageLoaded: false,
    imageError: '',
    triedCloudFallback: false,
    openingPdf: false,
    zoomPercent: 100,
    zoomStyle: 'width: 100%;'
  },

  onLoad(options) {
    this.loadOriginal(options.id)
  },

  onShow() {
    enableShareMenu()
  },

  loadOriginal(id) {
    const invoice = getInvoiceById(id)

    if (!invoice) {
      this.setData({
        loading: false,
        missing: true,
        errorMessage: '未找到这张发票记录。'
      })
      return
    }

    this.setData({
      id,
      invoice,
      fileName: invoice.fileName || '发票原件'
    })

    this.resolveOriginal(invoice)
  },

  resolveOriginal(invoice) {
    accessFile(invoice.archivePath)
      .then((archivePath) => archivePath || accessFile(invoice.filePath))
      .then((localPath) => {
        if (localPath) {
          return {
            originalPath: localPath,
            sourcePath: localPath
          }
        }

        return downloadCloudFile(invoice.cloudFileID).then((cloudPath) => ({
          originalPath: cloudPath,
          sourcePath: cloudPath
        }))
      })
      .then((paths) => {
        this.useResolvedPath(invoice, paths.originalPath, paths.sourcePath)
      })
  },

  useResolvedPath(invoice, originalPath, sourcePath) {
    if (!sourcePath) {
      this.setData({
        loading: false,
        missing: true,
        errorMessage: '本地归档和云端原件均不可访问。旧记录可能未保存云文件，请重新导入该发票。'
      })
      return
    }

    cachePreviewFile(sourcePath, invoice).then((previewPath) => {
      this.setData({
        loading: false,
        sourcePath: previewPath,
        originalPath,
        displayPath: previewPath,
        isImage: !isPdfFile(invoice, previewPath),
        imageLoaded: false,
        imageError: '',
        zoomPercent: 100,
        zoomStyle: 'width: 100%;'
      })
    })
  },

  setZoom(percent) {
    const next = Math.max(80, Math.min(240, percent))

    this.setData({
      zoomPercent: next,
      zoomStyle: `width: ${next}%;`
    })
  },

  zoomIn() {
    this.setZoom(this.data.zoomPercent + 20)
  },

  zoomOut() {
    this.setZoom(this.data.zoomPercent - 20)
  },

  resetZoom() {
    this.setZoom(100)
  },

  handleImageLoad() {
    this.setData({
      imageLoaded: true,
      imageError: ''
    })
  },

  handleImageError(error) {
    const invoice = this.data.invoice
    const message = error && error.detail && error.detail.errMsg
      ? error.detail.errMsg
      : '图片组件无法加载当前路径'

    if (invoice && invoice.cloudFileID && !this.data.triedCloudFallback) {
      this.setData({
        triedCloudFallback: true,
        imageError: '本地路径加载失败，正在尝试云端备份。'
      })

      downloadCloudFile(invoice.cloudFileID)
        .then((cloudPath) => {
          if (!cloudPath) {
            this.setData({ imageError: `${message}；云端备份下载失败。` })
            return
          }

          this.useResolvedPath(invoice, cloudPath, cloudPath)
        })
      return
    }

    this.setData({
      imageError: `${message}。可尝试重新导入该发票，或点击系统预览。`
    })
  },

  openSystemPreview() {
    const sourcePath = this.data.sourcePath

    if (!sourcePath) {
      return
    }

    const fallbackPath = this.data.originalPath

    wx.previewImage({
      urls: [sourcePath],
      current: sourcePath,
      fail: (error) => {
        if (fallbackPath && fallbackPath !== sourcePath) {
          wx.previewImage({
            urls: [fallbackPath],
            current: fallbackPath,
            fail: () => this.showOpenError(error)
          })
          return
        }

        this.showOpenError(error)
      }
    })
  },

  openPdf() {
    const sourcePath = this.data.sourcePath

    if (!sourcePath || this.data.openingPdf) {
      return
    }

    const originalPath = this.data.originalPath
    const invoice = this.data.invoice

    this.setData({ openingPdf: true })

    this.tryOpenPdfPaths([sourcePath, originalPath])
      .catch((error) => {
        if (!invoice || !invoice.cloudFileID) {
          return Promise.reject(error)
        }

        return downloadCloudFile(invoice.cloudFileID).then((cloudPath) => {
          if (!cloudPath) {
            return Promise.reject(error)
          }

          return cachePreviewFile(cloudPath, invoice).then((previewPath) => {
            this.setData({
              sourcePath: previewPath,
              originalPath: cloudPath,
              displayPath: previewPath
            })

            return this.tryOpenPdfPaths([previewPath, cloudPath])
          })
        })
      })
      .catch((error) => this.showOpenError(error))
      .finally(() => {
        this.setData({ openingPdf: false })
      })
  },

  tryOpenPdfPaths(paths) {
    const candidates = (paths || []).filter((item, index, source) => {
      return item && source.indexOf(item) === index
    })
    let lastError = null

    const openNext = (index) => {
      if (index >= candidates.length) {
        return Promise.reject(lastError || {})
      }

      return openDocumentFile(candidates[index]).catch((error) => {
        lastError = error
        return openNext(index + 1)
      })
    }

    return openNext(0)
  },

  showOpenError(error) {
    wx.showModal({
      title: '打开失败',
      content: error && error.errMsg ? error.errMsg : '系统查看器无法打开该原件，但图片原件仍可在当前页面查看。',
      showCancel: false
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
