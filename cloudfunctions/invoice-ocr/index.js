const cloud = require('wx-server-sdk')
const { normalizeOcrResult, normalizePaddleOcrResult } = require('./normalizer')
const { callPaddleOcr, pollPaddleOcrJob } = require('./paddleocr-client')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

function createOcrClient() {
  const tencentcloud = require('tencentcloud-sdk-nodejs')
  const OcrClient = tencentcloud.ocr.v20181119.Client

  return new OcrClient({
    credential: {
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY
    },
    region: process.env.TENCENTCLOUD_REGION || 'ap-guangzhou',
    profile: {
      httpProfile: {
        endpoint: 'ocr.tencentcloudapi.com'
      }
    }
  })
}

function ocrProvider() {
  const provider = `${process.env.OCR_PROVIDER || ''}`.toLowerCase()

  if (provider === 'paddleocr' || provider === 'paddle') {
    return 'paddleocr'
  }

  if (provider === 'tencent') {
    return 'tencent'
  }

  if (process.env.PADDLEOCR_API_URL || process.env.PADDLEOCR_BASE_URL) {
    return 'paddleocr'
  }

  if (process.env.TENCENTCLOUD_SECRET_ID && process.env.TENCENTCLOUD_SECRET_KEY) {
    return 'tencent'
  }

  return ''
}

function fallbackRows(event, status) {
  return {
    data: event.fallback ? [{ ...event.fallback, ocrStatus: status }] : []
  }
}

function safeErrorMessage(error) {
  const message = `${error && error.message ? error.message : error || '未知错误'}`
    .replace(/token\s+[^\s]+/ig, 'token ***')
    .slice(0, 160)

  if (message.indexOf('HTTP 500') === 0) {
    return `PaddleOCR 服务内部错误，已自动重试，请稍后再试。${message.split(';').slice(1).join(';')}`
  }

  if (message.indexOf('HTTP 503') === 0 || message.indexOf('HTTP 504') === 0) {
    return `PaddleOCR 服务繁忙或超时，已自动重试，请稍后再试。${message.split(';').slice(1).join(';')}`
  }

  return message
}

function paddleFailureRows(event, error) {
  const message = safeErrorMessage(error)
  const result = fallbackRows(event, 'PaddleOCR\u5931\u8d25')

  result.data = result.data.map((item) => ({
    ...item,
    ocrError: message
  }))

  return result
}

async function pollPaddleJob(event) {
  try {
    const result = await pollPaddleOcrJob(event.jobId)

    if (result.pending) {
      return result
    }

    return {
      data: normalizePaddleOcrResult(result.response, {
        fileName: event.fileName,
        fileID: event.fileID,
        fallback: event.fallback
      })
    }
  } catch (error) {
    console.error('[invoice-ocr] PaddleOCR poll failed', {
      jobId: event.jobId || '',
      fileName: event.fileName || '',
      error: safeErrorMessage(error)
    })

    return paddleFailureRows(event, error)
  }
}

exports.main = async (event) => {
  if (event.action === 'pollPaddleJob') {
    return pollPaddleJob(event)
  }

  if (!event.fileID) {
    return {
      data: event.fallback ? [event.fallback] : []
    }
  }

  const file = await cloud.downloadFile({
    fileID: event.fileID
  })
  const fileBase64 = file.fileContent.toString('base64')
  const provider = ocrProvider()

  console.log('[invoice-ocr]', {
    provider: provider || 'unconfigured',
    fileName: event.fileName || '',
    fileSize: file.fileContent.length
  })

  if (provider === 'paddleocr') {
    try {
      const response = await callPaddleOcr(fileBase64, event.fileName)

      if (response && response.pending && response.jobId) {
        return response
      }

      return {
        data: normalizePaddleOcrResult(response, {
          fileName: event.fileName,
          fileID: event.fileID,
          fallback: event.fallback
        })
      }
    } catch (error) {
      const message = safeErrorMessage(error)

      console.error('[invoice-ocr] PaddleOCR failed', {
        fileName: event.fileName || '',
        apiUrl: process.env.PADDLEOCR_API_URL || process.env.PADDLEOCR_BASE_URL || '',
        hasToken: Boolean(process.env.PADDLEOCR_ACCESS_TOKEN || process.env.PADDLEOCR_TOKEN),
        error: message
      })

      return paddleFailureRows(event, error)
    }
  }

  if (provider !== 'tencent') {
    return fallbackRows(event, '未配置OCR')
  }

  const client = createOcrClient()
  const response = await client.RecognizeGeneralInvoice({
    ImageBase64: fileBase64,
    EnablePdf: true,
    EnableMultiplePage: true,
    EnableOther: true
  })

  return {
    data: normalizeOcrResult(response, {
      fileName: event.fileName,
      fileID: event.fileID,
      fallback: event.fallback
    })
  }
}
