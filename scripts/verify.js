const fs = require('fs')
const http = require('http')
const path = require('path')

const root = path.resolve(__dirname, '..')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), 'utf8'))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message}: expected ${expected}, got ${actual}`)
}

function verifyJsonAndPages() {
  const app = readJson('app.json')
  const projectConfig = readJson('project.config.json')
  readJson('sitemap.json')

  assertEqual(projectConfig.cloudfunctionRoot, 'cloudfunctions/', 'cloud function root is configured')
  assert(/^\d+\.\d+\.\d+$/.test(projectConfig.libVersion), 'project debug base library version is configured')
  assertEqual(app.networkTimeout.uploadFile, 60000, 'file upload timeout is configured')
  assertEqual(app.networkTimeout.request, 60000, 'request timeout is configured')
  assert(app.permission && app.permission['scope.camera'], 'camera permission is configured')
  assert(app.permission['scope.camera'].desc.includes('发票'), 'camera permission explains invoice capture')
  assert(app.pages.includes('pages/index/index'), 'index page is registered')
  assert(app.pages.includes('pages/upload/upload'), 'upload page is registered')
  assert(app.pages.includes('pages/invoices/invoices'), 'invoices page is registered')
  assert(app.pages.includes('pages/invoice-detail/invoice-detail'), 'invoice detail page is registered')
  assert(app.pages.includes('pages/report/report'), 'report page is registered')
  assert(app.pages.includes('pages/rename/rename'), 'rename page is registered')

  assert(app.tabBar && Array.isArray(app.tabBar.list), 'tab bar is configured')
  app.tabBar.list.forEach((item) => {
    assert(item.iconPath, `${item.text} tab has icon`)
    assert(item.selectedIconPath, `${item.text} tab has selected icon`)

    ;[item.iconPath, item.selectedIconPath].forEach((iconPath) => {
      const filePath = path.join(root, iconPath)
      assert(fs.existsSync(filePath), `${iconPath} exists`)
      assert(fs.statSync(filePath).size < 40 * 1024, `${iconPath} is smaller than 40KB`)
    })
  })

  app.pages.forEach((page) => {
    ;['js', 'json', 'wxml', 'wxss'].forEach((ext) => {
      const filePath = path.join(root, `${page}.${ext}`)
      assert(fs.existsSync(filePath), `${page}.${ext} exists`)
    })
  })

  app.pages.forEach((page) => {
    const wxss = fs.readFileSync(path.join(root, `${page}.wxss`), 'utf8')
    const fontSizes = [...wxss.matchAll(/font-size:\s*(\d+)rpx/g)].map((match) => Number(match[1]))
    assert(fontSizes.every((size) => size >= 22), `${page} keeps readable in-page font sizes`)
  })

  app.pages.forEach((page) => {
    const js = fs.readFileSync(path.join(root, `${page}.js`), 'utf8')

    assert(js.includes('onShareAppMessage'), `${page} enables WeChat menu forwarding`)
    assert(js.includes('onShareTimeline'), `${page} enables WeChat menu sharing`)
  })

  const cloudPackage = readJson('cloudfunctions/invoice-ocr/package.json')
  const cloudReadme = fs.readFileSync(path.join(root, 'cloudfunctions/invoice-ocr/README.md'), 'utf8')
  const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8')
  const uploadPageJs = fs.readFileSync(path.join(root, 'pages/upload/upload.js'), 'utf8')
  const uploadPageWxml = fs.readFileSync(path.join(root, 'pages/upload/upload.wxml'), 'utf8')
  const uploadPageWxss = fs.readFileSync(path.join(root, 'pages/upload/upload.wxss'), 'utf8')
  const indexPageWxml = fs.readFileSync(path.join(root, 'pages/index/index.wxml'), 'utf8')
  const indexPageWxss = fs.readFileSync(path.join(root, 'pages/index/index.wxss'), 'utf8')
  const renamePageJs = fs.readFileSync(path.join(root, 'pages/rename/rename.js'), 'utf8')
  const renamePageWxml = fs.readFileSync(path.join(root, 'pages/rename/rename.wxml'), 'utf8')
  const reportPageWxml = fs.readFileSync(path.join(root, 'pages/report/report.wxml'), 'utf8')
  const detailPageWxml = fs.readFileSync(path.join(root, 'pages/invoice-detail/invoice-detail.wxml'), 'utf8')
  const detailPageWxss = fs.readFileSync(path.join(root, 'pages/invoice-detail/invoice-detail.wxss'), 'utf8')
  const detailPageJs = fs.readFileSync(path.join(root, 'pages/invoice-detail/invoice-detail.js'), 'utf8')
  const invoicesPageWxml = fs.readFileSync(path.join(root, 'pages/invoices/invoices.wxml'), 'utf8')
  const invoicesPageWxss = fs.readFileSync(path.join(root, 'pages/invoices/invoices.wxss'), 'utf8')
  const invoiceValidationJs = fs.readFileSync(path.join(root, 'utils/invoice-validation.js'), 'utf8')
  const invoiceImportJs = fs.readFileSync(path.join(root, 'utils/invoice-import.js'), 'utf8')
  assert(cloudPackage.dependencies['tencentcloud-sdk-nodejs'], 'OCR cloud function keeps Tencent Cloud SDK fallback')
  assert(cloudPackage.dependencies['wx-server-sdk'], 'OCR cloud function has WeChat cloud SDK')
  assert(appJs.includes("require('./config.local')"), 'mini program reads the local cloud configuration')
  assert(fs.readFileSync(path.join(root, 'utils/share.js'), 'utf8').includes('showShareMenu'), 'shared helper exposes WeChat share menu')
  assert(cloudReadme.includes('PADDLEOCR_API_URL'), 'OCR cloud function README documents PaddleOCR URL')
  assert(cloudReadme.includes('PADDLEOCR_ACCESS_TOKEN'), 'OCR cloud function README documents PaddleOCR token')
  assert(cloudReadme.includes('上传并部署'), 'OCR cloud function README documents deployment')
  assert(!uploadPageWxml.includes('loading="{{busy}}"'), 'upload page avoids native button loading flicker')
  assert(uploadPageWxml.includes('recognition-status'), 'upload page has stable recognition status area')
  assert(uploadPageWxml.includes('ocrStatusText'), 'upload page displays actual OCR provider')
  assert(uploadPageWxml.includes('ocrErrorText'), 'upload page displays PaddleOCR failure reason')
  assert(uploadPageWxss.includes('.ocr-status.paddle'), 'upload page highlights successful PaddleOCR results')
  assert(uploadPageWxss.includes('.recognition-status.visible'), 'recognition status expands only while recognition is active')
  assert(!indexPageWxml.includes('wx:for="{{categoryRows}}"'), 'home page does not duplicate the category overview')
  assert(!indexPageWxml.includes('{{appName}}'), 'home page does not repeat the mini program name')
  assert(indexPageWxml.includes('/assets/actions/camera-blue.png'), 'home scan entry uses a blue camera icon')
  assert(indexPageWxml.includes('/assets/actions/file-upload-green.png'), 'home upload entry uses a file upload icon')
  assert(indexPageWxml.includes('选择电脑中的图片或 PDF 文档'), 'home desktop entry explains local image and PDF selection')
  assert(indexPageWxml.indexOf('拍照识别') < indexPageWxml.indexOf('上传识别'), 'home recognition actions are vertically ordered')
  assert(indexPageWxml.indexOf('上传识别') < indexPageWxml.indexOf('一键命名已识别文件'), 'home rename entry is below recognition actions')
  assert(indexPageWxss.includes('.entry-stack'), 'home recognition actions use a vertical stack')
  assert(!indexPageWxss.includes('.entry-grid'), 'home recognition actions no longer use a two-column grid')
  assert(!indexPageWxml.includes('entry-heading'), 'home recognition labels are contained inside the buttons')
  assert(indexPageWxml.includes('entry-button-title'), 'home recognition buttons contain their action text')
  assert(indexPageWxss.includes('height: 156rpx'), 'home recognition buttons use a larger touch target')
  assert(!indexPageWxml.includes('<button'), 'home recognition actions avoid native button width constraints')
  assert(indexPageWxml.includes('hover-class="entry-button-active"'), 'home recognition actions keep touch feedback')
  assert(indexPageWxss.includes('min-width: 100%'), 'home recognition actions fill the available width')
  assert(indexPageWxml.includes("{{importBusy ? 'disabled' : ''}}"), 'home import entries show their recognition state')
  assert(indexPageWxml.includes('{{successCount}}'), 'home summary displays successful recognition count')
  assert(indexPageWxml.includes('{{failedCount}}'), 'home summary displays failed recognition count')
  assert(indexPageWxml.includes('识别成功'), 'home summary labels successful recognition')
  assert(indexPageWxml.includes('识别失败'), 'home summary labels failed recognition')
  assert(indexPageWxml.includes('invoice-row-failed'), 'home recent invoices mark recognition failures')
  assert(indexPageWxml.includes('invoice-buyer'), 'home recent invoices display the recognized buyer or person')
  assert(indexPageWxml.includes('点击进入并手动补全'), 'home failed invoices explain the manual completion action')
  assert(indexPageWxss.includes('.invoice-row-failed'), 'home failed invoices use a visible error style')
  assert(indexPageWxss.includes('border: 2rpx solid #2563eb'), 'home scan entry keeps a blue border')
  assert(indexPageWxss.includes('background: #ffffff'), 'home scan entry uses a white background')
  assert(indexPageWxss.includes('#176b5b'), 'home upload entry uses the green primary color')
  assert(app.window.navigationBarBackgroundColor === '#176b5b', 'navigation bar uses the green primary color')
  assert(app.tabBar.selectedColor === '#176b5b', 'selected tab uses the green primary color')
  ;['assets/actions/camera-blue.png', 'assets/actions/file-upload-green.png'].forEach((iconPath) => {
    const filePath = path.join(root, iconPath)
    assert(fs.existsSync(filePath), `${iconPath} exists`)
    assert(fs.statSync(filePath).size < 40 * 1024, `${iconPath} is smaller than 40KB`)
  })
  assert(uploadPageWxml.includes('wx:for="{{categoryRows}}"'), 'recognition page displays the category overview')
  assert(!uploadPageWxml.includes('组配对'), 'recognition overview hides the pairing count')
  assert(!uploadPageWxss.includes('.pair-count'), 'recognition overview removes obsolete pairing count styles')
  assert(uploadPageWxml.includes('bindtap="openCategory"'), 'category overview cards open filtered invoices')
  assert(uploadPageWxml.includes('hover-class="category-card-active"'), 'category overview cards provide touch feedback without native button sizing')
  assert(uploadPageWxss.includes('.category-grid'), 'recognition page styles the category overview')
  assert(uploadPageWxss.includes('overflow: hidden'), 'category overview prevents text from crossing card boundaries')
  assert(uploadPageJs.includes('pendingInvoiceCategory'), 'recognition page passes the selected category to the invoice library')
  assert(invoicesPageWxml.includes('✓ 批量选择'), 'invoice library exposes a prominent bulk selection entry')
  assert(invoicesPageWxml.includes('select-all-button'), 'invoice library highlights the select-all action')
  assert(invoicesPageWxml.includes('cancel-selection-button'), 'invoice library exposes a clear selection cancel action')
  assert(invoicesPageWxss.includes('min-width: 220rpx'), 'invoice library bulk selection entry uses a large touch target')
  assert(invoicesPageWxss.includes('height: 72rpx'), 'invoice library bulk action buttons use a large touch target')
  assert(invoicesPageWxss.includes('width: 54rpx'), 'invoice library selection control is easy to tap')
  assert(invoicesPageWxml.includes('compact-meta'), 'invoice library uses compact invoice rows')
  assert(invoicesPageWxml.includes('compact-buyer'), 'invoice library compact rows display who the invoice was issued to')
  assert(!invoicesPageWxml.includes('detail-grid'), 'invoice library removes expanded invoice details')
  assert(!invoicesPageWxml.includes('card-actions'), 'invoice library opens compact rows instead of inline actions')
  assert(invoicesPageWxss.includes('min-height: 96rpx'), 'invoice library keeps compact rows readable')
  assert(app.tabBar.list[0].text === '识别', 'first tab is named recognition')
  assert(app.tabBar.list[1].text === '总览', 'second tab is named overview')
  assert(uploadPageJs.includes('setTimeout(() =>'), 'recognition status uses delayed display')
  assert(uploadPageJs.includes('importInvoiceFiles'), 'recognition page uses the shared invoice import flow')
  const indexPageJs = fs.readFileSync(path.join(root, 'pages/index/index.js'), 'utf8')
  assert(indexPageJs.includes('wx.chooseMedia'), 'home scan entry opens camera or album directly')
  assert(indexPageJs.includes('wx.chooseMessageFile'), 'home upload entry opens the file picker directly')
  assert(indexPageJs.includes('isDesktopWechat()'), 'home scan entry switches to local files on desktop WeChat')
  assert(indexPageJs.includes('showRejectedFiles'), 'home import displays rejected non-invoice files')
  assert(uploadPageJs.includes('showRejectedFiles'), 'recognition page displays rejected non-invoice files')
  assert(invoiceValidationJs.includes("title: '不能上传非发票文件'"), 'non-invoice upload uses a clear modal title')
  assert(invoiceImportJs.includes('splitUploadableInvoices'), 'invoice import filters supporting documents before saving')
  assert(indexPageJs.includes('importInvoiceFiles'), 'home entries recognize files without changing tabs')
  assert(!indexPageJs.includes("openImport('scan')"), 'home scan entry does not switch to the overview tab')
  assert(indexPageWxml.includes('bindtap="goRename"'), 'home page links to the rename page')
  assert(indexPageJs.includes('/pages/rename/rename'), 'home rename entry navigates to the rename page')
  assert(detailPageJs.includes("ocrError: ''"), 'manual invoice completion clears the OCR failure state')
  assert(detailPageJs.includes("ocrStatus: wasRecognitionFailed ? '人工录入'"), 'manual invoice completion records its source')
  assert(detailPageJs.includes("recognized.buyerName"), 'invoice detail re-recognition syncs buyer name')
  assert(detailPageJs.includes("recognized.buyerTaxNo"), 'invoice detail re-recognition syncs buyer tax number')
  assert(renamePageWxml.includes('一键命名已识别文件'), 'rename page exposes one-click naming')
  assert(renamePageWxml.includes('bindtap="renameInvoices"'), 'rename page has the one-click naming action')
  assert(renamePageJs.includes('renameInvoiceFiles'), 'rename page uses the shared rename utility')
  assert(!reportPageWxml.includes('rename-card'), 'report page no longer renders rename UI')
  assert(!reportPageWxml.includes('一键重命名报表发票'), 'report page removes the report rename button')
  assert(indexPageWxml.includes('bindtap="openInvoiceDetail"'), 'home recent invoices open detail on tap')
  assert(indexPageWxml.includes('data-id="{{item.id}}"'), 'home recent invoices pass their ID to the detail page')
  assert(indexPageJs.includes('/pages/invoice-detail/invoice-detail?id='), 'home recent invoices navigate to detail page')
  assert(!uploadPageJs.includes('金额88.00'), 'camera import does not inject a fake amount into the file name')
  ;['购买方/人员', '购买方税号', '发票类型', '税额', '不含税金额', '承担部门', '承担部门负责人', '承担金额', '备注'].forEach((label) => {
    assert(detailPageWxml.includes(label), `invoice detail page exposes ${label}`)
  })
  assert(detailPageWxml.includes('data-key="buyerName"'), 'invoice detail buyer/person is manually editable')
  assert(detailPageWxml.includes('data-key="buyerTaxNo"'), 'invoice detail buyer tax number is manually editable')
  assert(detailPageWxml.includes('data-key="department"'), 'invoice detail department is manually editable')
  assert(detailPageWxml.includes('data-key="departmentOwner"'), 'invoice detail department owner is manually editable')
  assert(!detailPageWxml.includes('bindchange="changeDepartment"'), 'invoice detail no longer uses department picker')
  assert(!detailPageWxml.includes('bindchange="changeDeptOwner"'), 'invoice detail no longer uses department owner picker')
  assert(detailPageWxml.includes('placeholder-class="field-placeholder"'), 'invoice detail placeholders use a dedicated hint class')
  assert(detailPageWxss.includes('.field-placeholder'), 'invoice detail styles placeholder hints')
  assert(detailPageWxss.includes('#60a5fa'), 'invoice detail placeholder hints use light blue')
}

function verifyRecognitionStats() {
  const { getInvoiceStats } = require('../utils/invoice-store')
  const stats = getInvoiceStats([
    { amount: 100, ocrError: '' },
    { amount: 0, ocrError: 'OCR timeout' },
    { amount: 50 },
    { amount: 0, status: '待识别' }
  ])

  assertEqual(stats.successCount, 2, 'invoice stats count successful recognition')
  assertEqual(stats.failedCount, 2, 'invoice stats count failed and pending recognition')
}

function verifyDeviceDetection() {
  const { isDesktopPlatform } = require('../utils/device')

  assert(isDesktopPlatform('windows'), 'Windows WeChat is treated as desktop')
  assert(isDesktopPlatform('mac'), 'macOS WeChat is treated as desktop')
  assert(!isDesktopPlatform('ios'), 'iOS WeChat keeps camera selection')
  assert(!isDesktopPlatform('android'), 'Android WeChat keeps camera selection')
}

function verifyInvoiceUploadValidation() {
  const { showRejectedFiles, splitUploadableInvoices } = require('../utils/invoice-validation')
  const result = splitUploadableInvoices([
    {
      id: 'didi-invoice',
      fileName: '滴滴电子发票.pdf',
      evidenceType: '发票',
      invoiceType: '电子发票（普通发票）'
    },
    {
      id: 'didi-trip',
      fileName: '滴滴出行行程单.pdf',
      evidenceType: '行程单'
    },
    {
      id: 'hotel-settlement',
      fileName: '酒店住宿结算单.pdf',
      evidenceType: '发票'
    },
    {
      id: 'air-itinerary',
      fileName: '航空运输电子客票行程单.pdf',
      evidenceType: '行程单',
      invoiceProfile: 'air-itinerary',
      invoiceType: '航空运输电子客票行程单'
    },
    {
      id: 'railway-ticket',
      fileName: '铁路电子客票.pdf',
      evidenceType: '发票',
      invoiceProfile: 'railway',
      invoiceType: '铁路电子客票'
    }
  ])

  assertEqual(result.accepted.length, 3, 'upload validation accepts invoices and reimbursable electronic tickets')
  assertEqual(result.rejected.length, 2, 'upload validation rejects duplicate supporting documents')
  assert(result.accepted.some((item) => item.id === 'air-itinerary'), 'air itinerary remains uploadable')
  assert(result.rejected.some((item) => item.id === 'didi-trip'), 'ride-hailing trip receipt is rejected')
  assert(result.rejected.some((item) => item.id === 'hotel-settlement'), 'hotel settlement sheet is rejected')

  let modalOptions = null
  global.wx = {
    showModal(options) {
      modalOptions = options
    }
  }
  showRejectedFiles(result.rejected, result.accepted.length)
  delete global.wx

  assertEqual(modalOptions.title, '不能上传非发票文件', 'rejected files display the required modal')
  assert(modalOptions.content.includes('航空运输电子客票行程单可以正常上传'), 'rejection modal explains the air itinerary exception')
}

function verifySyntax() {
  const ignoredDirectories = new Set(['.git', '.agents', '.claude', 'node_modules'])

  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const filePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return ignoredDirectories.has(entry.name) ? [] : walk(filePath)
      }

      return filePath.endsWith('.js') ? [filePath] : []
    })
  }

  const files = ['app.js', 'config.example.js'].map((file) => path.join(root, file))
  ;['pages', 'utils', 'scripts', 'cloudfunctions'].forEach((dir) => files.push(...walk(path.join(root, dir))))
  files.forEach((filePath) => {
    try {
      new Function(fs.readFileSync(filePath, 'utf8'))
    } catch (error) {
      throw new Error(`${path.relative(root, filePath)}: ${error.message}`)
    }
  })
}

function verifyRecognition() {
  const { recognizeFiles } = require('../utils/invoice-recognition')
  const rows = recognizeFiles([
    { name: '滴滴发票_金额86.50_2026-06-08.pdf', size: 1000 },
    { name: '12306火车票_金额553.00_2026-06-05.jpg', size: 1000 },
    { name: '亚朵酒店住宿费_金额458.00_2026-06-03.png', size: 1000 },
    { name: '美团餐费_金额128.60_2026-06-02.jpg', size: 1000 },
    { name: '办公用品发票_金额66.00_2026-06-01.pdf', size: 1000 }
  ])

  assertEqual(rows[0].fileType, 'pdf', 'PDF file type is recognized')
  assertEqual(rows[1].fileType, 'jpg', 'JPG file type is recognized')
  assertEqual(rows[2].fileType, 'png', 'PNG file type is recognized')
  assertEqual(rows[0].sourceType, '电子发票', 'PDF is treated as electronic invoice')
  assertEqual(rows[1].sourceType, '扫描件', 'image is treated as scan')
  assertEqual(rows[0].categoryId, 'taxi', 'taxi category is recognized')
  assertEqual(rows[1].categoryId, 'travel', 'travel category is recognized')
  assertEqual(rows[2].categoryId, 'lodging', 'lodging category is recognized')
  assertEqual(rows[3].categoryId, 'meal', 'meal category is recognized')
  assertEqual(rows[4].categoryId, 'office', 'office category is recognized')
  assertEqual(rows[0].amount, 86.5, 'amount is extracted')
  assertEqual(rows[0].date, '2026-06-08', 'date is extracted')
  assertEqual(rows[0].invoiceType, '电子发票（普通发票）', 'local fallback displays the Didi electronic invoice type')
  assertEqual(rows[0].invoiceNo, '', 'local fallback does not fabricate an invoice number')
  assertEqual(rows[0].taxNo, '', 'local fallback does not fabricate a tax number')

  const unknown = recognizeFiles([
    { name: '扫描件_1781328000000_1.jpg', size: 1000 }
  ])[0]

  assertEqual(unknown.amount, 0, 'local fallback does not fabricate an amount')
  assertEqual(unknown.date, '', 'local fallback does not fabricate a date')
  assertEqual(unknown.confidence, 0, 'local fallback does not claim OCR confidence')

  const expenseRows = recognizeFiles([
    { name: '收支项目_长途交通费10201_承担金额1,420.jpg', size: 1000 },
    { name: '收支项目_市内交通费10202_承担金额289.30.jpg', size: 1000 },
    { name: '收支项目_差旅住宿费10203_报销金额670.00.jpg', size: 1000 },
    { name: '客户招待费_金额888.00.jpg', size: 1000 }
  ])

  assertEqual(expenseRows[0].categoryId, 'travel', 'long-distance transportation item is recognized')
  assertEqual(expenseRows[0].amount, 1420, 'comma expense amount is extracted')
  assertEqual(expenseRows[1].categoryId, 'taxi', 'local transportation item is recognized')
  assertEqual(expenseRows[2].categoryId, 'lodging', 'travel lodging item is recognized')
  assertEqual(expenseRows[3].categoryId, 'entertainment', 'entertainment item is recognized')

  const ticketRows = recognizeFiles([
    {
      name: '出租车发票.jpg',
      size: 1000,
      extraText: [
        '100000000001',
        '000001',
        '监督电话 0000000',
        '电话 00000000',
        '车号 K0000001',
        '日期 2026-06-14',
        '金额',
        '12.0000',
        '元'
      ].join('\n')
    }
  ])
  const noisyNumberRows = recognizeFiles([
    { name: '100000000001_000001_0000000.jpg', size: 1000 }
  ])

  assertEqual(ticketRows[0].amount, 12, 'local fallback extracts amount near amount and yuan labels')
  assertEqual(noisyNumberRows[0].amount, 0, 'local fallback ignores unrelated leading numbers')

  const airlinePdfText = [
    '项目名称 规格型号 单 位 数 量 单 价 金 额 税率/征收率 税 额',
    '*运输服务*变更手续费 个 1 504.58715596 504.59 9% 45.41',
    '*运输服务*客票款 个 1 348.62385321 348.62 9% 31.38',
    '合 计 ¥853.21 ¥76.79',
    '价税合计(大写) 玖佰叁拾元整 (小写) ¥930.00'
  ].join('\n')
  const airlineRows = recognizeFiles([
    {
      name: '示例乘客 上海-深圳 改签及补差额发票930元.pdf',
      size: 1000,
      extraText: airlinePdfText
    }
  ])

  assertEqual(airlineRows[0].amount, 930, 'local fallback extracts airline PDF tax-inclusive amount')
  assertEqual(airlineRows[0].pretaxAmount, 853.21, 'local fallback extracts airline PDF pretax amount from table total')
  assertEqual(airlineRows[0].taxAmount, 76.79, 'local fallback extracts airline PDF tax amount from table total')
}

function verifyCloudRecognitionFlow() {
  let cloudCallCount = 0

  global.wx = {
    cloud: {
      uploadFile(options) {
        options.success && options.success({
          fileID: 'cloud://invoice.pdf'
        })
      },
      callFunction(options) {
        assertEqual(options.name, 'invoice-ocr', 'cloud OCR function name is used')
        cloudCallCount += 1

        if (cloudCallCount === 1) {
          options.success && options.success({
            result: {
              pending: true,
              jobId: 'job-1',
              pollIntervalMs: 0
            }
          })
          return
        }

        assertEqual(options.data.action, 'pollPaddleJob', 'pending OCR uses the poll action')
        assertEqual(options.data.jobId, 'job-1', 'pending OCR keeps the same job ID')

        if (cloudCallCount === 2) {
          options.success && options.success({
            result: {
              pending: true,
              jobId: 'job-1',
              pollIntervalMs: 0
            }
          })
          return
        }

        options.success && options.success({
          result: {
            data: [
              {
                id: 'ocr-row-1',
                merchant: '亚朵酒店',
                platform: '亚朵酒店',
                categoryId: 'lodging',
                categoryName: '差旅住宿费',
                amount: 458,
                amountText: '458.00',
                date: '2026-06-03',
                invoiceNo: 'OCR123456',
                taxNo: '91110000123456789X'
              }
            ]
          }
        })
      }
    }
  }

  const { recognizeFilesAsync } = require('../utils/invoice-recognition')

  return recognizeFilesAsync([
    {
      name: '亚朵酒店发票.pdf',
      path: '/tmp/atour.pdf',
      size: 1000
    }
  ]).then((rows) => {
    assertEqual(rows.length, 1, 'cloud recognition returns one row')
    assertEqual(rows[0].ocrStatus, '云端OCR', 'cloud recognition marks OCR status')
    assertEqual(rows[0].merchant, '亚朵酒店', 'cloud recognition uses OCR merchant')
    assertEqual(rows[0].amount, 458, 'cloud recognition uses OCR amount')
    assertEqual(rows[0].filePath, '/tmp/atour.pdf', 'cloud recognition keeps local file path for archiving')
    assertEqual(rows[0].cloudFileID, 'cloud://invoice.pdf', 'cloud recognition stores cloud file ID for preview fallback')
    assertEqual(cloudCallCount, 3, 'cloud recognition submits once and polls twice')
  })
}

function verifyCloudFailureFlow() {
  global.wx = {
    cloud: {
      uploadFile(options) {
        options.success && options.success({
          fileID: 'cloud://failed-invoice.jpg'
        })
      },
      callFunction(options) {
        options.fail && options.fail({
          errMsg: 'cloud.callFunction:fail Error: timeout'
        })
      }
    }
  }

  const { recognizeFilesAsync } = require('../utils/invoice-recognition')

  return recognizeFilesAsync([
    {
      name: '扫描件_1781328000000_1.jpg',
      path: '/tmp/invoice.jpg',
      size: 1000
    }
  ]).then((rows) => {
    assertEqual(rows.length, 1, 'failed cloud recognition still returns the imported file')
    assertEqual(rows[0].ocrStatus, '云端OCR失败', 'failed cloud recognition exposes the real status')
    assert(rows[0].ocrError.includes('超时'), 'failed cloud recognition exposes the timeout reason')
    assertEqual(rows[0].amount, 0, 'failed cloud recognition does not show a fake amount')
    assertEqual(rows[0].invoiceNo, '', 'failed cloud recognition does not show a fake invoice number')
    assertEqual(rows[0].confidence, 0, 'failed cloud recognition does not show fake confidence')
  })
}

function makeTaxi(id, evidenceType, date, amount) {
  return {
    id,
    categoryId: 'taxi',
    evidenceType,
    platform: '滴滴',
    date,
    amount
  }
}

function verifyPairing() {
  const { applyPairing } = require('../utils/pairing')
  const positive = applyPairing([
    makeTaxi('invoice', '发票', '2026-06-08', 100),
    makeTaxi('receipt', '行程单', '2026-06-09', 104.9)
  ])

  assertEqual(positive.pairs.length, 1, 'taxi invoice and trip receipt are paired')
  assert(positive.invoices.every((item) => item.folderName === '滴滴-2026-06-08-打车报销'), 'paired files share one folder')

  const farDate = applyPairing([
    makeTaxi('invoice', '发票', '2026-06-08', 100),
    makeTaxi('receipt', '行程单', '2026-06-10', 100)
  ])
  assertEqual(farDate.pairs.length, 0, 'taxi files outside one day are not paired')

  const farAmount = applyPairing([
    makeTaxi('invoice', '发票', '2026-06-08', 100),
    makeTaxi('receipt', '行程单', '2026-06-08', 106)
  ])
  assertEqual(farAmount.pairs.length, 0, 'taxi files outside five percent are not paired')
}

function verifyReport() {
  const { buildExcelWorkbook, buildXlsxWorkbook, buildReportFileName, REPORT_MODES } = require('../utils/report')
  const reportPageJs = fs.readFileSync(path.join(root, 'pages/report/report.js'), 'utf8')
  const reportPageWxml = fs.readFileSync(path.join(root, 'pages/report/report.wxml'), 'utf8')
  const reportPageWxss = fs.readFileSync(path.join(root, 'pages/report/report.wxss'), 'utf8')
  const invoices = [
    {
      date: '2026-06-08',
      categoryId: 'taxi',
      categoryName: '市内交通费',
      evidenceType: '发票',
      merchant: '滴滴',
      amount: 86.5,
      taxAmount: 6.54,
      pretaxAmount: 79.96,
      department: '示例项目',
      departmentOwner: '示例负责人',
      allocatedAmount: 86.5,
      remark: '市内交通',
      buyerName: '张三',
      buyerTaxNo: '91440300MA5TEST01X',
      invoiceNo: 'FP202606080001',
      taxNo: '91110105MA00000001',
      fileName: '滴滴发票.pdf',
      folderName: '滴滴-2026-06-08-打车报销',
      archivePath: '/invoice-archive/滴滴/滴滴发票.pdf'
    },
    {
      date: '2026-06-03',
      categoryId: 'lodging',
      categoryName: '差旅住宿费',
      evidenceType: '发票',
      merchant: '亚朵酒店',
      amount: 458,
      invoiceNo: 'FP202606030003',
      taxNo: '91110000123456789X',
      fileName: '亚朵酒店发票.pdf',
      archivePath: '/invoice-archive/差旅住宿费/亚朵酒店发票.pdf'
    },
    {
      date: '2026-06-02',
      categoryId: 'meal',
      categoryName: '餐补',
      evidenceType: '发票',
      merchant: '美团',
      amount: 128.6,
      invoiceNo: 'FP202606020004',
      taxNo: 'TAX000000000004',
      fileName: '美团餐费.png',
      archivePath: '/invoice-archive/餐补/美团餐费.png'
    }
  ]
  const summaryWorkbook = buildExcelWorkbook(invoices, { mode: 'summary' })
  const summaryXlsx = new Uint8Array(buildXlsxWorkbook(invoices, { mode: 'summary' }))
  const detailWorkbook = buildExcelWorkbook(invoices, { mode: 'detail' })
  const categoryWorkbook = buildExcelWorkbook(invoices, { mode: 'category' })
  const lodgingMealWorkbook = buildExcelWorkbook(invoices, { mode: 'lodgingMeal' })
  const airRouteWorkbook = buildExcelWorkbook([{
    date: '2026-06-17',
    categoryId: 'travel',
    categoryName: '长途交通费',
    evidenceType: '行程单',
    merchant: '深圳航空',
    amount: 930,
    remark: '行程：深圳宝安 → 昆明长水'
  }], { mode: 'detail' })

  assert(summaryWorkbook.includes('Worksheet ss:Name="汇总表"'), 'summary workbook contains summary sheet')
  assert(!summaryWorkbook.includes('Worksheet ss:Name="明细表"'), 'summary workbook does not contain detail sheet')
  assert(summaryWorkbook.includes('发票报销汇总表'), 'summary workbook contains summary title')
  assert(summaryWorkbook.includes('生成时间：'), 'summary workbook contains generated time')
  assert(summaryWorkbook.includes('总计'), 'summary workbook contains total row')
  assert(summaryWorkbook.includes('673.10'), 'summary workbook contains total amount')
  assert(detailWorkbook.includes('Worksheet ss:Name="明细表"'), 'detail workbook contains detail sheet')
  assert(!detailWorkbook.includes('Worksheet ss:Name="汇总表"'), 'detail workbook does not contain summary sheet')
  assert(detailWorkbook.includes('发票报销明细表'), 'detail workbook contains detail title')
  assert(detailWorkbook.includes('ss:ID="Header"'), 'detail workbook contains header style')
  assert(detailWorkbook.includes('ss:ID="Money"'), 'detail workbook contains money style')
  assert(detailWorkbook.includes('<Column ss:Width="240"/>'), 'detail workbook contains detail archive path column width')
  assert(detailWorkbook.includes('归档路径'), 'detail workbook contains archive path column')
  assert(detailWorkbook.includes('收支项目'), 'detail workbook uses reimbursement item header')
  assert(detailWorkbook.includes('购买方/人员'), 'detail workbook contains buyer/person column')
  assert(detailWorkbook.includes('购买方税号'), 'detail workbook contains buyer tax number column')
  assert(detailWorkbook.includes('税额'), 'detail workbook contains tax amount column')
  assert(detailWorkbook.includes('不含税金额'), 'detail workbook contains pretax amount column')
  assert(detailWorkbook.includes('承担部门'), 'detail workbook contains department column')
  assert(detailWorkbook.includes('承担部门负责人'), 'detail workbook contains department owner column')
  assert(detailWorkbook.includes('承担金额'), 'detail workbook contains allocated amount column')
  assert(detailWorkbook.includes('市内交通费'), 'detail workbook contains local transportation item')
  assert(detailWorkbook.includes('差旅住宿费'), 'detail workbook contains lodging item')
  assert(detailWorkbook.includes('示例项目'), 'detail workbook contains department value')
  assert(detailWorkbook.includes('张三'), 'detail workbook contains buyer/person value')
  assert(detailWorkbook.includes('91440300MA5TEST01X'), 'detail workbook contains buyer tax number value')
  assert(detailWorkbook.includes('86.50'), 'detail workbook contains taxi detail amount')
  assert(detailWorkbook.includes('458.00'), 'detail workbook contains lodging detail amount')
  assert(airRouteWorkbook.includes('行程：深圳宝安 → 昆明长水'), 'detail report exports the recognized air route in remarks')
  assert(detailWorkbook.indexOf('市内交通费') < detailWorkbook.indexOf('差旅住宿费'), 'detail workbook sorts rows by reimbursement item')
  assert(REPORT_MODES.some((item) => item.id === 'summary'), 'report modes include summary workbook')
  assert(REPORT_MODES.some((item) => item.id === 'detail'), 'report modes include detail workbook')
  assert(REPORT_MODES.some((item) => item.id === 'category'), 'report modes include category worksheets')
  assert(REPORT_MODES.some((item) => item.id === 'lodgingMeal'), 'report modes include lodging and meal set')
  assert(!categoryWorkbook.includes('Worksheet ss:Name="汇总表"'), 'category workbook does not contain summary sheet')
  assert(!categoryWorkbook.includes('Worksheet ss:Name="明细表"'), 'category workbook does not contain combined detail sheet')
  assert(categoryWorkbook.includes('Worksheet ss:Name="差旅住宿费"'), 'category workbook contains lodging worksheet')
  assert(categoryWorkbook.includes('Worksheet ss:Name="餐补"'), 'category workbook contains meal worksheet')
  assert(!lodgingMealWorkbook.includes('Worksheet ss:Name="汇总表"'), 'lodging meal workbook does not contain summary sheet')
  assert(lodgingMealWorkbook.includes('Worksheet ss:Name="差旅住宿费"'), 'lodging meal workbook contains lodging worksheet')
  assert(lodgingMealWorkbook.includes('Worksheet ss:Name="餐补"'), 'lodging meal workbook contains meal worksheet')
  assert(!lodgingMealWorkbook.includes('滴滴发票.pdf'), 'lodging meal workbook excludes taxi invoices')
  assert(reportPageJs.includes('LAST_REPORT_KEY'), 'report page persists latest report metadata')
  assert(reportPageJs.includes('REPORT_MODES'), 'report page exposes report mode options')
  assert(reportPageJs.includes('shareReport'), 'report page has share action')
  assert(reportPageJs.includes('wx.shareFileMessage'), 'report page uses WeChat file sharing when available')
  assert(reportPageJs.includes("fileType: 'xlsx'"), 'report page opens reports as real xlsx files')
  assert(buildReportFileName({ mode: 'summary' }).endsWith('.xlsx'), 'report file name uses the xlsx extension')
  assert(summaryXlsx[0] === 0x50 && summaryXlsx[1] === 0x4b && summaryXlsx[2] === 0x03 && summaryXlsx[3] === 0x04, 'xlsx workbook is a valid zip package')
  assert(reportPageWxml.includes('导出类型'), 'report page exposes export type picker')
  assert(reportPageWxml.includes('mode-label'), 'report page highlights export type label')
  assert(reportPageWxml.indexOf('mode-row') < reportPageWxml.indexOf('total-row'), 'report page shows export type before totals')
  assert(reportPageWxss.includes('border-left-width: 8rpx'), 'report page makes export type selector prominent')
  assert(!reportPageJs.includes('detailRows'), 'report page no longer keeps detail preview rows')
  assert(!reportPageWxml.includes('detail-list'), 'report page no longer renders the detail preview list')
  assert(!reportPageWxml.includes('<view class="section-title">明细表</view>'), 'report page only keeps summary preview below controls')
  assert(reportPageWxml.includes('分享给财务') || reportPageWxml.includes('生成并分享'), 'report page exposes finance sharing button')
}

function verifyArchive() {
  global.wx = {
    env: {
      USER_DATA_PATH: '/mock-user-data'
    },
    getFileSystemManager() {
      return {
        mkdir(options) {
          options.success && options.success()
        },
        copyFile(options) {
          options.success && options.success()
        }
      }
    }
  }

  const { archivePairedInvoices, buildInvoicePath } = require('../utils/file-archive')
  const pairFolder = '滴滴-2026-06-08-打车报销'
  const invoices = [
    {
      id: 'invoice',
      fileName: '滴滴发票.pdf',
      filePath: '/tmp/invoice.pdf',
      categoryName: '市内交通费',
      merchant: '滴滴',
      evidenceType: '发票',
      invoiceNo: 'FP001',
      date: '2026-06-08',
      folderName: pairFolder
    },
    {
      id: 'receipt',
      fileName: '滴滴行程单.pdf',
      filePath: '/tmp/receipt.pdf',
      categoryName: '市内交通费',
      merchant: '滴滴',
      evidenceType: '行程单',
      invoiceNo: 'TRIP001',
      date: '2026-06-08',
      folderName: pairFolder
    }
  ]
  const expected = buildInvoicePath(invoices[0], pairFolder)

  return archivePairedInvoices(invoices).then((archived) => {
    assert(archived.every((item) => item.archiveFolder === expected.archiveFolder), 'paired files share one archive folder')
    assert(archived.every((item) => item.archivePath.indexOf(expected.archiveFolder) === 0), 'paired files archive under shared folder')
    assert(archived[0].filePath === archived[0].archivePath, 'invoice file path points to archived copy')
    assert(archived[1].filePath === archived[1].archivePath, 'receipt file path points to archived copy')
  })
}

function verifyOcrNormalizer() {
  const { normalizeOcrResult, normalizePaddleOcrResult } = require('../cloudfunctions/invoice-ocr/normalizer')
  const { recognizeFiles } = require('../utils/invoice-recognition')
  const rows = normalizeOcrResult({
    MixedInvoiceItems: [
      {
        SingleInvoiceInfos: {
          VatSpecialInvoice: {
            Seller: '亚朵酒店',
            Total: '458.00',
            Date: '2026年06月03日',
            Number: '12345678',
            SellerTaxID: '91110000123456789X'
          }
        }
      }
    ]
  }, {
    fileName: '亚朵酒店发票.pdf'
  })

  assertEqual(rows.length, 1, 'OCR normalizer returns one invoice')
  assertEqual(rows[0].categoryId, 'lodging', 'OCR normalizer classifies lodging')
  assertEqual(rows[0].categoryName, '差旅住宿费', 'OCR normalizer uses reimbursement item name')
  assertEqual(rows[0].amount, 458, 'OCR normalizer extracts amount')
  assertEqual(rows[0].date, '2026-06-03', 'OCR normalizer extracts date')
  assertEqual(rows[0].invoiceNo, '12345678', 'OCR normalizer extracts invoice number')
  assertEqual(rows[0].taxNo, '91110000123456789X', 'OCR normalizer extracts tax number')

  const paddleRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '销售方名称：亚朵酒店',
              '价税合计（小写） ¥458.00',
              '开票日期：2026年06月03日',
              '发票号码：12345678',
              '销售方纳税人识别号：91110000123456789X'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '亚朵酒店发票.pdf'
  })

  assertEqual(paddleRows.length, 1, 'PaddleOCR normalizer returns one invoice')
  assertEqual(paddleRows[0].ocrStatus, 'PaddleOCR', 'PaddleOCR normalizer marks provider')
  assertEqual(paddleRows[0].categoryId, 'lodging', 'PaddleOCR normalizer classifies lodging')
  assertEqual(paddleRows[0].categoryName, '差旅住宿费', 'PaddleOCR normalizer uses reimbursement item name')
  assertEqual(paddleRows[0].merchant, '亚朵酒店', 'PaddleOCR normalizer extracts merchant')
  assertEqual(paddleRows[0].amount, 458, 'PaddleOCR normalizer extracts amount')
  assertEqual(paddleRows[0].date, '2026-06-03', 'PaddleOCR normalizer extracts date')
  assertEqual(paddleRows[0].invoiceNo, '12345678', 'PaddleOCR normalizer extracts invoice number')
  assertEqual(paddleRows[0].taxNo, '91110000123456789X', 'PaddleOCR normalizer extracts tax number')

  const electronicInvoiceRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '<table>',
              '<tr><td>电子发票（普通发票）</td><td>发票号码：26412000000000000001</td></tr>',
              '<tr><td>开票日期：2026年05月19日</td></tr>',
              '<tr><td>购买方信息</td><td>名称：示例甲</td></tr>',
              '<tr><td>销售方信息</td><td colspan="3">名称：测试示例电子商务有限公司</td></tr>',
              '<tr><td>统一社会信用代码/纳税人识别号：911100000000000001</td></tr>',
              '<tr><td>项目名称：椰果类食品</td><td>金额</td><td>7.47</td><td>税额</td><td>0.97</td></tr>',
              '<tr><td>合计</td><td>¥7.47</td><td>¥0.97</td></tr>',
              '<tr><td>价税合计（大写）捌圆肆角肆分</td><td>（小写）¥8.44</td></tr>',
              '</table>'
            ].join('')
          }
        }
      ]
    }
  }, {
    fileName: 'synthetic-food-invoice.jpg'
  })

  assertEqual(electronicInvoiceRows[0].merchant, '测试示例电子商务有限公司', 'PaddleOCR strips HTML and extracts seller')
  assertEqual(electronicInvoiceRows[0].amount, 8.44, 'PaddleOCR prefers tax-inclusive invoice total')
  assertEqual(electronicInvoiceRows[0].date, '2026-05-19', 'PaddleOCR extracts electronic invoice date')
  assertEqual(electronicInvoiceRows[0].invoiceNo, '26412000000000000001', 'PaddleOCR extracts electronic invoice number')
  assertEqual(electronicInvoiceRows[0].taxNo, '911100000000000001', 'PaddleOCR extracts electronic invoice tax number')
  assertEqual(electronicInvoiceRows[0].buyerName, '示例甲', 'PaddleOCR extracts electronic invoice buyer name')
  assertEqual(electronicInvoiceRows[0].categoryId, 'meal', 'PaddleOCR classifies food invoice as meal')

  const sameProductZhang = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '电子发票（普通发票）',
            '购买方名称：张三',
            '销售方名称：测试示例电子商务有限公司',
            '项目名称：椰果类食品',
            '价税合计（小写）：¥8.44'
          ].join('\n')
        }
      }]
    }
  }, { fileName: '椰果类食品-张三.pdf' })
  const sameProductLi = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '电子发票（普通发票）',
            '购买方名称：李四',
            '销售方名称：测试示例电子商务有限公司',
            '项目名称：椰果类食品',
            '价税合计（小写）：¥8.44'
          ].join('\n')
        }
      }]
    }
  }, { fileName: '椰果类食品-李四.pdf' })

  assertEqual(sameProductZhang[0].buyerName, '张三', 'same product invoice keeps the first buyer')
  assertEqual(sameProductLi[0].buyerName, '李四', 'same product invoice keeps the second buyer')

  const didiInvoiceRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '数电发票（普通发票）',
            '发票号码：24442000000012345680',
            '销售方名称：滴滴出行科技有限公司',
            '项目名称：*运输服务*客运服务费',
            '价税合计（小写）：￥86.50'
          ].join('\n')
        }
      }]
    }
  }, { fileName: '滴滴电子发票.pdf' })

  assertEqual(didiInvoiceRows[0].categoryId, 'taxi', 'PaddleOCR always classifies Didi invoices as local transportation')
  assertEqual(didiInvoiceRows[0].categoryName, '市内交通费', 'Didi invoice displays the local transportation expense item')
  assertEqual(didiInvoiceRows[0].invoiceType, '电子发票（普通发票）', 'Didi digital invoice displays its invoice type')

  const airlineCarrierRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '航空运输电子客票行程单',
            '客票号：784-1234567890',
            '填开单位：深圳市某某航空票务代理有限公司',
            '承运人：中国南方航空股份有限公司',
            '旅客姓名：张三',
            '合计：￥930.00'
          ].join('\n')
        }
      }]
    }
  }, { fileName: '航空电子行程单.pdf' })

  assertEqual(airlineCarrierRows[0].merchant, '深圳市某某航空票务代理有限公司', 'air itinerary supplier uses the issuing office instead of the operating airline')
  assertEqual(airlineCarrierRows[0].buyerName, '张三', 'air itinerary uses passenger name as buyer/person')

  const shenzhenAirRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '电子发票（航空运输电子客票行程单）',
            '发票号码：26958000000000000002',
            '自：昆明 长水',
            '至：深圳 宝安 T3',
            '承运人 深航',
            '航班号 ZH9456',
            '填开单位：深圳航空有限责任公司',
            '增值税税额：CNY 57.80',
            '合计：CNY 750.00'
          ].join('\n')
        }
      }]
    }
  }, { fileName: '航空电子客票行程单.png' })

  assertEqual(shenzhenAirRows[0].merchant, '深圳航空有限责任公司', 'airport terminal T3 does not override Shenzhen Airlines')
  assertEqual(shenzhenAirRows[0].categoryId, 'travel', 'airport terminal T3 remains long-distance transportation')
  assertEqual(shenzhenAirRows[0].taxAmount, 57.8, 'air itinerary extracts VAT amount')
  assertEqual(shenzhenAirRows[0].pretaxAmount, 692.2, 'air itinerary derives pretax amount from total minus VAT')

  const secondAirPretaxRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '电子发票（航空运输电子客票行程单）',
            '承运人：深航',
            '航班号：ZH9457',
            '填开单位：深圳航空有限责任公司',
            '增值税税额：CNY 51.20',
            '合计：CNY 670.00'
          ].join('\n')
        }
      }]
    }
  }, { fileName: '第二张航空电子客票行程单.png' })

  assertEqual(secondAirPretaxRows[0].pretaxAmount, 618.8, 'second air itinerary derives the missing pretax amount')

  const calculatedAmountCases = [
    {
      name: 'missing pretax',
      info: { Total: '108.00', TaxAmount: '8.00' },
      expected: { amount: 108, taxAmount: 8, pretaxAmount: 100 }
    },
    {
      name: 'missing tax',
      info: { Total: '108.00', PretaxAmount: '100.00' },
      expected: { amount: 108, taxAmount: 8, pretaxAmount: 100 }
    },
    {
      name: 'missing total',
      info: { TaxAmount: '8.00', PretaxAmount: '100.00' },
      expected: { amount: 108, taxAmount: 8, pretaxAmount: 100 }
    }
  ]

  calculatedAmountCases.forEach((item) => {
    const result = normalizeOcrResult({
      MixedInvoiceItems: [item.info]
    }, { fileName: `${item.name}.pdf` })[0]

    Object.keys(item.expected).forEach((key) => {
      assertEqual(result[key], item.expected[key], `OCR calculates ${item.name} ${key}`)
    })
  })

  const localAirline = recognizeFiles([{
    name: '航空电子客票行程单.png',
    size: 1000,
    extraText: '至 深圳宝安 T3 承运人 深航 航班号 ZH9456'
  }])[0]

  assertEqual(localAirline.merchant, '深圳航空', 'local fallback ignores terminal T3 and recognizes Shenzhen Airlines')
  assertEqual(localAirline.categoryId, 'travel', 'local fallback keeps airline tickets in long-distance transportation')

  const localAirIssuer = recognizeFiles([{
    name: '航空电子客票行程单.png',
    size: 1000,
    extraText: '承运人 深航 航班号 ZH9457 填开单位 深圳航空有限责任公司'
  }])[0]

  assertEqual(localAirIssuer.merchant, '深圳航空有限责任公司', 'local fallback uses the air itinerary issuing office as supplier')

  const localSameProduct = recognizeFiles([{
    name: '同商品发票.pdf',
    size: 1000,
    extraText: '电子发票（普通发票） 购买方名称：王五 销售方名称：测试示例电子商务有限公司 项目名称：椰果类食品 价税合计：8.44'
  }])[0]

  assertEqual(localSameProduct.buyerName, '王五', 'local fallback extracts buyer/person for same product invoices')

  const taxiTicketRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '100000000001',
              '000001',
              '监督电话 0000000',
              '电话 00000000',
              '车号 K0000001',
              '证号 000000080',
              '日期 2026-06-14',
              '上车 11:18',
              '下车 11:21',
              '金额',
              '12.0000',
              '元'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '出租车发票.jpg'
  })

  assertEqual(taxiTicketRows[0].amount, 12, 'PaddleOCR extracts amount near amount and yuan labels instead of leading numbers')

  const airlinePdfRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '电子发票（增值税专用发票）',
              '发票号码：24447000000000000003',
              '项目名称 规格型号 单 位 数 量 单 价 金 额 税率/征收率 税 额',
              '*运输服务*变更手续费 个 1 504.58715596 504.59 9% 45.41',
              '*运输服务*客票款 个 1 348.62385321 348.62 9% 31.38',
              '合 计 ¥853.21 ¥76.79',
              '价税合计(大写) 玖佰叁拾元整 (小写) ¥930.00'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '示例乘客 上海-深圳 改签及补差额发票930元.pdf'
  })

  assertEqual(airlinePdfRows[0].amount, 930, 'PaddleOCR extracts airline PDF tax-inclusive amount')
  assertEqual(airlinePdfRows[0].pretaxAmount, 853.21, 'PaddleOCR extracts airline PDF pretax amount from table total')
  assertEqual(airlinePdfRows[0].taxAmount, 76.79, 'PaddleOCR extracts airline PDF tax amount from table total')
  assertEqual(airlinePdfRows[0].routeOrigin, '上海', 'PaddleOCR extracts air route origin from filename')
  assertEqual(airlinePdfRows[0].routeDestination, '深圳', 'PaddleOCR extracts air route destination from filename')
  assertEqual(airlinePdfRows[0].remark, '行程：上海 → 深圳', 'PaddleOCR adds filename air route to remark')

  const longDistanceRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '分摊明细 1',
              '收支项目 长途交通费10201',
              '发票类型 增值税专用发票',
              '税额 51.20',
              '不含税金额 618.8',
              '承担部门 示例项目',
              '承担部门负责人 示例负责人',
              '承担金额 1,420',
              '备注 深圳--昆明机票'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '报销单-机票.jpg'
  })

  assertEqual(longDistanceRows[0].categoryId, 'travel', 'PaddleOCR classifies long-distance transportation item')
  assertEqual(longDistanceRows[0].amount, 1420, 'PaddleOCR extracts comma amount from reimbursement item')
  assertEqual(longDistanceRows[0].expenseItem, '长途交通费10201', 'PaddleOCR extracts reimbursement item detail')
  assertEqual(longDistanceRows[0].invoiceType, '增值税专用发票', 'PaddleOCR extracts invoice type')
  assertEqual(longDistanceRows[0].taxAmount, 51.2, 'PaddleOCR extracts tax amount')
  assertEqual(longDistanceRows[0].pretaxAmount, 618.8, 'PaddleOCR extracts pretax amount')
  assertEqual(longDistanceRows[0].department, '示例项目', 'PaddleOCR extracts department')
  assertEqual(longDistanceRows[0].departmentOwner, '示例负责人', 'PaddleOCR extracts department owner')
  assertEqual(longDistanceRows[0].allocatedAmount, 1420, 'PaddleOCR extracts allocated amount')
  assertEqual(longDistanceRows[0].remark, '深圳--昆明机票', 'PaddleOCR extracts remark')

  const commaTotalRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: '价税合计（小写）¥1,420.00\n收支项目 长途交通费10201'
          }
        }
      ]
    }
  }, {
    fileName: '报销单-千分位金额.jpg'
  })

  assertEqual(commaTotalRows[0].amount, 1420, 'PaddleOCR extracts comma amount from tax-inclusive total')

  const fuzzyInvoiceRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '销售方名称：深圳市测试科技有限公司',
              '发票代码：000 0000 O0111',
              '发票号码：1OOOOOO1',
              '开票日期：2026 年 06 月 15 日',
              '销售方纳税人识别号：9144O3OO MA5TEST01X',
              '价税合计（大写）壹仟肆佰贰拾元整'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '000000000111_10000001.pdf'
  })

  assertEqual(fuzzyInvoiceRows[0].invoiceCode, '000000000111', 'PaddleOCR normalizes OCR-confused invoice code')
  assertEqual(fuzzyInvoiceRows[0].invoiceNo, '10000001', 'PaddleOCR normalizes OCR-confused invoice number')
  assertEqual(fuzzyInvoiceRows[0].sellerTaxNo, '91440300MA5TEST01X', 'PaddleOCR normalizes OCR-confused seller tax number')
  assertEqual(fuzzyInvoiceRows[0].date, '2026-06-15', 'PaddleOCR extracts dates with OCR spacing')
  assertEqual(fuzzyInvoiceRows[0].amount, 1420, 'PaddleOCR falls back to uppercase tax-inclusive amount')

  const invoiceProfileCases = [
    {
      name: 'digital ordinary invoice',
      text: '电子发票（普通发票）\n发票号码：24442000000012345678\n开票日期：2026年06月18日\n销售方名称：深圳市测试科技有限公司\n价税合计（小写）¥108.00',
      expected: { invoiceProfile: 'digital-vat-ordinary', invoiceType: '电子发票（普通发票）', amount: 108, invoiceNo: '24442000000012345678' }
    },
    {
      name: 'roll invoice',
      text: '广东增值税普通发票（卷票）\n机器编号：661234567890\n发票代码：044001900111\n发票号码：12345678\n开票日期：2026年06月18日\n商户：便利店有限公司\n合计：￥38.50',
      expected: { invoiceProfile: 'vat-roll', invoiceType: '增值税普通发票（卷票）', amount: 38.5 }
    },
    {
      name: 'quota invoice',
      text: '广东省定额发票\n发票代码：144002500111\n发票号码：87654321\n人民币伍拾元整',
      expected: { invoiceProfile: 'quota', invoiceType: '定额发票', amount: 50 }
    },
    {
      name: 'motor vehicle invoice',
      text: '机动车销售统一发票\n发票号码：12345678\n开票日期：2026年06月18日\n销货单位名称：深圳汽车销售有限公司\n车辆识别代号：L1234567890123456\n价税合计（小写）：￥120000.00',
      expected: { invoiceProfile: 'motor-vehicle', invoiceType: '机动车销售统一发票', merchant: '深圳汽车销售有限公司', amount: 120000 }
    },
    {
      name: 'used vehicle invoice',
      text: '二手车销售统一发票\n发票号码：22345678\n开票日期：2026年06月18日\n经营、拍卖单位：深圳二手车市场有限公司\n车辆识别代号：L9876543210123456\n车价合计（小写）：￥68000.00',
      expected: { invoiceProfile: 'used-vehicle', invoiceType: '二手车销售统一发票', merchant: '深圳二手车市场有限公司', amount: 68000 }
    },
    {
      name: 'toll invoice',
      text: '电子发票（普通发票）\n收费公路通行费\n发票号码：24442000000012345679\n销售方名称：广东高速公路有限公司\n通行日期：2026年06月17日\n价税合计（小写）：￥66.20',
      expected: { invoiceProfile: 'toll', invoiceType: '通行费电子发票', amount: 66.2 }
    },
    {
      name: 'railway ticket',
      text: '铁路电子客票\n电子客票号：E12345678901\n乘车日期：2026年06月17日\n车次：G100\n承运人：中国铁路广州局集团有限公司\n票价：553.00元',
      expected: { invoiceProfile: 'railway', invoiceType: '铁路电子客票', merchant: '中国铁路广州局集团有限公司', amount: 553 }
    },
    {
      name: 'air itinerary',
      text: '航空运输电子客票行程单\n客票号：781-1234567890\n填开日期：2026年06月17日\n销售单位名称：深圳航空服务有限公司\n旅客姓名：张三\n出发地：深圳宝安 到达地：昆明长水 航班号：ZH9435\n合计：￥930.00',
      expected: {
        invoiceProfile: 'air-itinerary',
        invoiceType: '航空运输电子客票行程单',
        merchant: '深圳航空有限责任公司',
        amount: 930,
        routeOrigin: '深圳宝安',
        routeDestination: '昆明长水',
        remark: '行程：深圳宝安 → 昆明长水'
      }
    },
    {
      name: 'taxi invoice',
      text: '出租汽车发票\n发票号码：00000156\n日期：2026年06月17日\n公司名称：深圳市出租汽车有限公司\n上车：11:18 下车：11:21\n金额：12.00元',
      expected: { invoiceProfile: 'taxi', invoiceType: '出租汽车发票', amount: 12 }
    },
    {
      name: 'passenger ticket',
      text: '道路客运电子客票\n客票号：K1234567890\n乘车日期：2026年06月17日\n承运人：广东客运有限公司\n始发站：深圳 到达站：广州\n票价：80.00元',
      expected: { invoiceProfile: 'passenger-ticket', invoiceType: '客运电子客票', amount: 80 }
    },
    {
      name: 'medical receipt',
      text: '广东省医疗收费电子票据\n电子票据代码：440001250000\n电子票据号码：202606180001\n医疗机构名称：深圳市人民医院\n收费日期：2026年06月18日\n收费合计：￥268.50',
      expected: { invoiceProfile: 'medical-receipt', invoiceType: '医疗收费票据', merchant: '深圳市人民医院', amount: 268.5 }
    },
    {
      name: 'fiscal receipt',
      text: '财政电子票据\n电子票据代码：440001250001\n票据号码：202606180002\n收款单位：深圳市政务服务中心\n开票日期：2026年06月18日\n合计金额：￥100.00',
      expected: { invoiceProfile: 'fiscal-receipt', invoiceType: '财政电子票据', merchant: '深圳市政务服务中心', amount: 100 }
    },
    {
      name: 'agricultural purchase invoice',
      text: '农产品收购发票\n发票代码：044002500111\n发票号码：33445566\n开票日期：2026年06月18日\n收购单位：深圳农产品有限公司\n价税合计（小写）：￥3200.00',
      expected: { invoiceProfile: 'agricultural-purchase', invoiceType: '农产品收购发票', merchant: '深圳农产品有限公司', amount: 3200 }
    }
  ]

  invoiceProfileCases.forEach((profileCase) => {
    const result = normalizePaddleOcrResult({
      result: { layoutParsingResults: [{ markdown: { text: profileCase.text } }] }
    }, { fileName: `${profileCase.name}.pdf` })[0]

    Object.keys(profileCase.expected).forEach((key) => {
      assertEqual(result[key], profileCase.expected[key], `PaddleOCR recognizes ${profileCase.name} ${key}`)
    })
  })

  const airRouteTableRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [{
        markdown: {
          text: [
            '航空运输电子客票行程单',
            '客票号：781-1234567891',
            '| FROM | TO | 航班号 |',
            '| --- | --- | --- |',
            '| 上海虹桥 SHA | 北京首都 PEK | MU5101 |',
            '备注：客户拜访',
            '合计：￥1080.00'
          ].join('\n')
        }
      }]
    }
  }, { fileName: 'flight-itinerary.pdf' })

  assertEqual(airRouteTableRows[0].routeOrigin, '上海虹桥 SHA', 'PaddleOCR extracts air route origin from itinerary table')
  assertEqual(airRouteTableRows[0].routeDestination, '北京首都 PEK', 'PaddleOCR extracts air route destination from itinerary table')
  assertEqual(airRouteTableRows[0].remark, '行程：上海虹桥 SHA → 北京首都 PEK；客户拜访', 'PaddleOCR preserves existing remark when adding air route')

  const nonInvoiceRows = [
    {
      text: '滴滴出行行程单\n行程起点：深圳北站\n行程终点：宝安机场\n总金额：86.50元',
      expected: '非航空行程单'
    },
    {
      text: '酒店住宿结算单\n入住日期：2026-06-17\n房费合计：458.00元',
      expected: '住宿结算或消费明细'
    }
  ]

  nonInvoiceRows.forEach((item, index) => {
    const result = normalizePaddleOcrResult({
      result: { layoutParsingResults: [{ markdown: { text: item.text } }] }
    }, { fileName: `supporting-document-${index + 1}.pdf` })[0]

    assertEqual(result.nonInvoiceReason, item.expected, 'PaddleOCR marks supporting documents as non-invoices')
  })

  const multiPageRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        { markdown: { text: invoiceProfileCases[0].text } },
        { markdown: { text: invoiceProfileCases[8].text } }
      ]
    }
  }, { fileName: 'two-invoices.pdf' })

  assertEqual(multiPageRows.length, 2, 'PaddleOCR separates invoice pages in a multi-page PDF')
  assertEqual(multiPageRows[0].invoiceProfile, 'digital-vat-ordinary', 'PaddleOCR keeps the first PDF invoice type')
  assertEqual(multiPageRows[1].invoiceProfile, 'taxi', 'PaddleOCR keeps the second PDF invoice type')

  const agencyRentalText = [
    '代开 深圳增值税电子普通发票 发票代码：000000000111',
    '发票号码：10000001',
    '开票日期：2026年06月15日',
    '购 名 称：深圳市示例餐饮有限公司',
    '纳税人识别号：91440300MA5TEST01X',
    '项目名称 规格型号 单位 数 量 单 价 金 额 税率 税 额',
    '租赁费 26000.00 *** ***',
    '合 计 ¥26000.00 ***',
    '价税合计(cid:58)大写(cid:61) 贰万陆仟圆整 (cid:58)小写(cid:61)¥26000.00',
    '销',
    '名 称：国家税务总局深圳市税务局(代开增值税电子发票) （代开机关） 代开企业税号：000000190001010000 代开企业名称：示',
    '备 例人。租赁费：示例市测试路示例大厦',
    '纳税人识别号：00000000TEST01X （代开机关）'
  ].join('\n')
  const agencyRentalRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: agencyRentalText
          }
        }
      ]
    }
  }, {
    fileName: '000000000111_10000001.pdf',
    fallback: {
      merchant: '待识别发票',
      platform: '未知商家',
      amount: 0
    }
  })

  assertEqual(agencyRentalRows[0].merchant, '示例人', 'PaddleOCR extracts agency-issued seller name split across table labels')
  assertEqual(agencyRentalRows[0].amount, 26000, 'PaddleOCR ignores PDF cid markers when extracting tax-inclusive amount')
  assertEqual(agencyRentalRows[0].amountInWords, '贰万陆仟圆整', 'PaddleOCR cleans cid markers from uppercase amount')
  assertEqual(agencyRentalRows[0].sellerTaxNo, '00000000TEST01X', 'PaddleOCR extracts agency-issued seller tax number')
  assertEqual(agencyRentalRows[0].categoryId, 'rental', 'PaddleOCR classifies rental invoices from item name')

  const localTransitRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '分摊明细 2',
              '收支项目 市内交通费10202',
              '承担金额 289.3'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '报销单-市内交通.jpg'
  })

  assertEqual(localTransitRows[0].categoryId, 'taxi', 'PaddleOCR classifies local transportation item')

  const lodgingExpenseRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: [
              '收支项目 差旅住宿费10203',
              '报销金额 670.00'
            ].join('\n')
          }
        }
      ]
    }
  }, {
    fileName: '报销单-住宿.jpg'
  })

  assertEqual(lodgingExpenseRows[0].categoryId, 'lodging', 'PaddleOCR classifies travel lodging item')

  const entertainmentRows = normalizePaddleOcrResult({
    result: {
      layoutParsingResults: [
        {
          markdown: {
            text: '收支项目 招待费 承担金额 888.00'
          }
        }
      ]
    }
  }, {
    fileName: '报销单-招待.jpg'
  })

  assertEqual(entertainmentRows[0].categoryId, 'entertainment', 'PaddleOCR classifies entertainment item')
}

async function verifyPaddleAsyncFlow() {
  let pollCount = 0
  let syncCallCount = 0
  const server = http.createServer((req, res) => {
    req.resume()
    res.setHeader('Content-Type', 'application/json')

    if (req.method === 'POST' && req.url === '/ocr') {
      syncCallCount += 1
      res.statusCode = 500
      res.end(JSON.stringify({ message: 'temporary service error' }))
      return
    }

    if (req.method === 'POST' && req.url === '/jobs') {
      res.end(JSON.stringify({ data: { jobId: 'job-1' } }))
      return
    }

    if (req.method === 'GET' && req.url === '/jobs/job-1') {
      pollCount += 1
      res.end(JSON.stringify({
        data: pollCount === 1
          ? { state: 'running' }
          : {
              state: 'done',
              resultUrl: {
                jsonUrl: `http://127.0.0.1:${server.address().port}/result`
              }
            }
      }))
      return
    }

    if (req.method === 'GET' && req.url === '/result') {
      res.end(`${JSON.stringify({
        result: {
          layoutParsingResults: [{ markdown: { text: 'invoice result' } }]
        }
      })}\n`)
      return
    }

    res.statusCode = 404
    res.end(JSON.stringify({ message: 'not found' }))
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  const envNames = [
    'PADDLEOCR_API_URL',
    'PADDLEOCR_ASYNC_JOB_URL',
    'PADDLEOCR_ACCESS_TOKEN',
    'PADDLEOCR_ASYNC_FALLBACK',
    'PADDLEOCR_RETRY_COUNT'
  ]
  const previousEnv = envNames.reduce((values, name) => {
    values[name] = process.env[name]
    return values
  }, {})
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  process.env.PADDLEOCR_API_URL = `${baseUrl}/ocr`
  process.env.PADDLEOCR_ASYNC_JOB_URL = `${baseUrl}/jobs`
  process.env.PADDLEOCR_ACCESS_TOKEN = 'test-token'
  process.env.PADDLEOCR_ASYNC_FALLBACK = 'true'
  process.env.PADDLEOCR_RETRY_COUNT = '0'

  try {
    const { callPaddleOcr, pollPaddleOcrJob } = require('../cloudfunctions/invoice-ocr/paddleocr-client')
    const submitted = await callPaddleOcr(Buffer.from('invoice').toString('base64'), 'invoice.jpg')

    assert(submitted.pending, 'PaddleOCR service error returns an async job immediately')
    assertEqual(submitted.jobId, 'job-1', 'PaddleOCR async submission returns the job ID')
    assertEqual(syncCallCount, 0, 'PaddleOCR starts with the async job API instead of waiting for sync OCR')

    const waiting = await pollPaddleOcrJob(submitted.jobId)
    assert(waiting.pending, 'PaddleOCR running job returns pending without waiting in cloud function')

    const completed = await pollPaddleOcrJob(submitted.jobId)
    assert(!completed.pending, 'PaddleOCR completed job returns its result')
    assertEqual(completed.response.result.layoutParsingResults.length, 1, 'PaddleOCR async JSONL result is merged')
  } finally {
    envNames.forEach((name) => {
      if (previousEnv[name] === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = previousEnv[name]
      }
    })
    await new Promise((resolve) => server.close(resolve))
  }
}

async function main() {
  verifyJsonAndPages()
  verifySyntax()
  verifyRecognitionStats()
  verifyDeviceDetection()
  verifyInvoiceUploadValidation()
  verifyRecognition()
  await verifyCloudRecognitionFlow()
  await verifyCloudFailureFlow()
  verifyPairing()
  verifyReport()
  await verifyArchive()
  verifyOcrNormalizer()
  await verifyPaddleAsyncFlow()
  console.log('Verification passed: pages, recognition, cloud OCR flow, categories, pairing, archive, report, OCR normalizer')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
