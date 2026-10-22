const http = require('http')
const https = require('https')

const DEFAULT_ASYNC_JOB_URL = 'https://paddleocr.aistudio-app.com/api/v2/ocr/jobs'

function inferFileType(fileName) {
  return `${fileName || ''}`.toLowerCase().endsWith('.pdf') ? 0 : 1
}

function boolEnv(name) {
  const value = process.env[name]

  if (value == null || value === '') {
    return undefined
  }

  return value === '1' || value.toLowerCase() === 'true'
}

function paddleApiUrl() {
  if (process.env.PADDLEOCR_API_URL) {
    return process.env.PADDLEOCR_API_URL
  }

  if (!process.env.PADDLEOCR_BASE_URL) {
    return ''
  }

  const mode = (process.env.PADDLEOCR_MODE || 'ocr').toLowerCase()
  const endpoint = process.env.PADDLEOCR_ENDPOINT || (mode === 'layout' ? '/layout-parsing' : '/ocr')

  return `${process.env.PADDLEOCR_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
}

function requestJson(url, payload, headers, redirectCount = 0, retryCount = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const body = JSON.stringify(payload)
    const client = target.protocol === 'http:' ? http : https
    const req = client.request({
      method: 'POST',
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }, (res) => {
      const isRedirect = [301, 302, 303, 307, 308].indexOf(res.statusCode) >= 0

      if (isRedirect && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, target)

        res.resume()

        if (redirectCount >= 3) {
          reject(new Error(`HTTP ${res.statusCode}: too many redirects, last target ${redirectUrl.href}`))
          return
        }

        if (redirectUrl.hostname !== target.hostname) {
          reject(new Error(`HTTP ${res.statusCode}: API redirected to ${redirectUrl.href}; update PADDLEOCR_API_URL`))
          return
        }

        requestJson(redirectUrl.href, payload, headers, redirectCount + 1, retryCount).then(resolve, reject)
        return
      }

      const chunks = []

      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        let data

        try {
          data = raw ? JSON.parse(raw) : {}
        } catch (error) {
          reject(new Error(`PaddleOCR returned non-JSON response: ${raw.slice(0, 200)}`))
          return
        }

        if (res.statusCode < 200 || res.statusCode >= 300 || data.errorCode) {
          const configuredRetries = Number(process.env.PADDLEOCR_RETRY_COUNT)
          const maxRetries = Number.isFinite(configuredRetries) ? configuredRetries : 0
          const retryable = [500, 503, 504].indexOf(res.statusCode) >= 0

          if (retryable && retryCount < maxRetries) {
            setTimeout(() => {
              requestJson(url, payload, headers, redirectCount, retryCount + 1).then(resolve, reject)
            }, 1000 * (retryCount + 1))
            return
          }

          const message = data.errorMsg || data.message || raw.slice(0, 200) || 'Unknown error'
          const traceId = data.traceId ? `; traceId=${data.traceId}` : ''
          reject(new Error(`HTTP ${res.statusCode}: ${message}${traceId}`))
          return
        }

        resolve(data)
      })
    })

    req.on('error', reject)
    req.setTimeout(Number(process.env.PADDLEOCR_TIMEOUT_MS) || 10000, () => {
      req.destroy(new Error('PaddleOCR request timed out'))
    })
    req.write(body)
    req.end()
  })
}

function requestBuffer(url, options = {}, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const client = target.protocol === 'http:' ? http : https
    const body = options.body || null
    const req = client.request({
      method: options.method || 'GET',
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      headers: {
        ...(body ? { 'Content-Length': body.length } : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      const isRedirect = [301, 302, 303, 307, 308].indexOf(res.statusCode) >= 0

      if (isRedirect && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, target)

        res.resume()

        if (redirectCount >= 3) {
          reject(new Error(`HTTP ${res.statusCode}: too many redirects, last target ${redirectUrl.href}`))
          return
        }

        const nextHeaders = redirectUrl.hostname === target.hostname ? options.headers : {}
        requestBuffer(redirectUrl.href, {
          ...options,
          method: res.statusCode === 303 ? 'GET' : options.method,
          body: res.statusCode === 303 ? null : body,
          headers: nextHeaders
        }, redirectCount + 1).then(resolve, reject)
        return
      }

      const chunks = []

      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const result = {
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks)
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${result.body.toString('utf8').slice(0, 300) || 'Unknown error'}`))
          return
        }

        resolve(result)
      })
    })

    req.on('error', reject)
    req.setTimeout(Number(process.env.PADDLEOCR_ASYNC_REQUEST_TIMEOUT_MS) || 15000, () => {
      req.destroy(new Error('PaddleOCR request timed out'))
    })

    if (body) {
      req.write(body)
    }

    req.end()
  })
}

function parseJsonResponse(result) {
  const raw = result.body.toString('utf8')

  try {
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    throw new Error(`PaddleOCR returned non-JSON response: ${raw.slice(0, 200)}`)
  }
}

function buildMultipartBody(fileBuffer, fileName, model, optionalPayload) {
  const boundary = `----PaddleOCR${Date.now().toString(16)}`
  const safeFileName = `${fileName || 'invoice.jpg'}`.replace(/["\r\n]/g, '_')
  const parts = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="optionalPayload"\r\n\r\n${JSON.stringify(optionalPayload)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]

  return {
    boundary,
    body: Buffer.concat(parts)
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mergeJsonLines(text) {
  const results = []

  String(text || '').split(/\r?\n/).forEach((line) => {
    if (!line.trim()) {
      return
    }

    const parsed = JSON.parse(line)
    results.push(parsed.result || parsed)
  })

  return {
    result: {
      layoutParsingResults: results.reduce((rows, item) => {
        return rows.concat(item.layoutParsingResults || [])
      }, []),
      ocrResults: results.reduce((rows, item) => {
        return rows.concat(item.ocrResults || [])
      }, [])
    }
  }
}

function paddleToken() {
  return process.env.PADDLEOCR_ACCESS_TOKEN || process.env.PADDLEOCR_TOKEN
}

function paddleJobUrl() {
  return (process.env.PADDLEOCR_ASYNC_JOB_URL || DEFAULT_ASYNC_JOB_URL).replace(/\/+$/, '')
}

function assertJobId(jobId) {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(`${jobId || ''}`)) {
    throw new Error('Invalid PaddleOCR async job ID')
  }
}

async function submitPaddleOcrJob(fileBase64, fileName) {
  const token = paddleToken()
  const jobUrl = paddleJobUrl()

  if (!token) {
    throw new Error('PADDLEOCR_ACCESS_TOKEN is not configured')
  }

  const model = process.env.PADDLEOCR_MODEL || 'PaddleOCR-VL-1.5'
  const optionalPayload = model === 'PP-OCRv5'
    ? {
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useTextlineOrientation: false
      }
    : {
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false
      }
  const multipart = buildMultipartBody(Buffer.from(fileBase64, 'base64'), fileName, model, optionalPayload)
  const headers = {
    Authorization: `bearer ${token}`,
    'Content-Type': `multipart/form-data; boundary=${multipart.boundary}`
  }
  const submit = parseJsonResponse(await requestBuffer(jobUrl, {
    method: 'POST',
    headers,
    body: multipart.body
  }))
  const jobId = submit.data && submit.data.jobId

  if (!jobId) {
    throw new Error(`PaddleOCR async response missing jobId: ${JSON.stringify(submit).slice(0, 200)}`)
  }

  return {
    pending: true,
    jobId,
    pollIntervalMs: Number(process.env.PADDLEOCR_POLL_INTERVAL_MS) || 2000
  }
}

async function pollPaddleOcrJob(jobId) {
  assertJobId(jobId)

  const token = paddleToken()
  const jobUrl = paddleJobUrl()

  if (!token) {
    throw new Error('PADDLEOCR_ACCESS_TOKEN is not configured')
  }

  const status = parseJsonResponse(await requestBuffer(`${jobUrl}/${jobId}`, {
    headers: {
      Authorization: `bearer ${token}`
    }
  }))
  const data = status.data || {}
  const state = `${data.state || data.status || ''}`.toLowerCase()

  if (state === 'failed' || state === 'error') {
    throw new Error(`PaddleOCR async job failed: ${data.errorMsg || data.message || jobId}`)
  }

  if (state === 'done' || state === 'success' || state === 'completed') {
    const resultUrl = data.resultUrl || (data.extractResult && data.extractResult.resultUrl) || {}
    const jsonUrl = typeof resultUrl === 'string' ? resultUrl : resultUrl.jsonUrl

    if (!jsonUrl) {
      throw new Error(`PaddleOCR async result URL missing: jobId=${jobId}`)
    }

    const result = await requestBuffer(jsonUrl)

    return {
      pending: false,
      response: mergeJsonLines(result.body.toString('utf8'))
    }
  }

  return {
    pending: true,
    jobId,
    state: state || 'waiting',
    pollIntervalMs: Number(process.env.PADDLEOCR_POLL_INTERVAL_MS) || 2000
  }
}

async function callPaddleOcrAsync(fileBase64, fileName) {
  const submitted = await submitPaddleOcrJob(fileBase64, fileName)
  const timeoutMs = Number(process.env.PADDLEOCR_ASYNC_TIMEOUT_MS) || 45000
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await wait(submitted.pollIntervalMs)

    const polled = await pollPaddleOcrJob(submitted.jobId)

    if (!polled.pending) {
      return polled.response
    }
  }

  throw new Error(`PaddleOCR async job timed out: jobId=${submitted.jobId}`)
}

function buildPayload(fileBase64, fileName) {
  const payload = {
    file: fileBase64,
    fileType: inferFileType(fileName)
  }
  const optionalFlags = [
    'useDocOrientationClassify',
    'useDocUnwarping',
    'useTextlineOrientation',
    'useLayoutDetection',
    'useChartRecognition'
  ]

  optionalFlags.forEach((key) => {
    const value = boolEnv(`PADDLEOCR_${key.replace(/[A-Z]/g, (char) => `_${char}`).toUpperCase()}`)

    if (value !== undefined) {
      payload[key] = value
    }
  })

  if (process.env.PADDLEOCR_PROMPT_LABEL) {
    payload.promptLabel = process.env.PADDLEOCR_PROMPT_LABEL
  }

  return payload
}

async function callPaddleOcr(fileBase64, fileName) {
  const url = paddleApiUrl()
  const token = paddleToken()
  const headers = token ? { Authorization: `token ${token}` } : {}
  const asyncPreferred = process.env.PADDLEOCR_ASYNC_PREFERRED !== 'false'

  if (asyncPreferred && token) {
    return submitPaddleOcrJob(fileBase64, fileName)
  }

  if (!url) {
    return Promise.reject(new Error('PADDLEOCR_API_URL is not configured'))
  }

  try {
    return await requestJson(url, buildPayload(fileBase64, fileName), headers)
  } catch (error) {
    const asyncFallbackEnabled = process.env.PADDLEOCR_ASYNC_FALLBACK !== 'false'
    const serviceError = /^HTTP (500|503|504):/.test(error.message) || /timed out/i.test(error.message)

    if (!asyncFallbackEnabled || !serviceError || !token) {
      throw error
    }

    return submitPaddleOcrJob(fileBase64, fileName)
  }
}

module.exports = {
  callPaddleOcr,
  callPaddleOcrAsync,
  submitPaddleOcrJob,
  pollPaddleOcrJob,
  inferFileType,
  paddleApiUrl,
  requestJson,
  mergeJsonLines
}
