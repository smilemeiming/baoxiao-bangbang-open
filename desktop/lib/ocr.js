const fs = require('fs')
const path = require('path')
const { createWorker } = require('tesseract.js')

class LocalOcr {
  constructor(root, cache, progress) {
    this.root = root
    this.cache = cache
    this.progress = progress
    this.workerPromise = null
  }

  async recognize(bytes) {
    if (!this.workerPromise) {
      const langPath = path.join(this.root, 'resources', 'tessdata')
      for (const lang of ['chi_sim', 'eng']) {
        if (!fs.existsSync(path.join(langPath, `${lang}.traineddata.gz`))) throw new Error('缺少本地识别模型，请重新下载完整应用包。')
      }
      fs.mkdirSync(this.cache, { recursive: true })
      this.workerPromise = createWorker('eng+chi_sim', 1, {
        langPath,
        cachePath: this.cache,
        gzip: true,
        logger: (message) => this.progress({ status: message.status, progress: message.progress || 0 }),
        errorHandler: () => {}
      }).catch((error) => { this.workerPromise = null; throw error })
    }
    const worker = await this.workerPromise
    const { data } = await worker.recognize(Buffer.from(bytes))
    return { text: data.text, confidence: data.confidence }
  }

  async stop() {
    if (this.workerPromise) await (await this.workerPromise).terminate()
  }
}

module.exports = { LocalOcr }
