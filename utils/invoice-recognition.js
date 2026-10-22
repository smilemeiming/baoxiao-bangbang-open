const { classifyByText } = require('./categories')

// ============================================================
// 智能平台/商家关键词 — 看到"滴滴"→打车，"携程"→旅游
// 格式: [匹配词, 显示名, 分类ID, 置信度加分]
// ============================================================
const SMART_KEYWORDS = [
  // 网约车/出租车
  ['滴滴', '滴滴出行', 'taxi', 90],
  ['didi', '滴滴出行', 'taxi', 85],
  ['高德', '高德打车', 'taxi', 85],
  ['gaode', '高德打车', 'taxi', 80],
  ['美团打车', '美团打车', 'taxi', 90],
  ['曹操', '曹操出行', 'taxi', 85],
  ['首汽', '首汽约车', 'taxi', 85],
  ['出租车', '出租车', 'taxi', 75],
  ['网约车', '网约车', 'taxi', 75],
  ['如祺', '如祺出行', 'taxi', 85],
  ['T3出行', 'T3出行', 'taxi', 85],
  ['花小猪', '花小猪打车', 'taxi', 90],
  ['享道', '享道出行', 'taxi', 85],
  // 火车/飞机/长途
  ['12306', '铁路12306', 'travel', 95],
  ['火车', '铁路', 'travel', 85],
  ['高铁', '高铁', 'travel', 85],
  ['动车', '动车', 'travel', 85],
  ['机票', '机票', 'travel', 90],
  ['飞机', '航空', 'travel', 85],
  ['航空', '航空', 'travel', 85],
  ['flight', '航空', 'travel', 80],
  ['train', '铁路', 'travel', 80],
  ['南航', '南方航空', 'travel', 90],
  ['东航', '东方航空', 'travel', 90],
  ['国航', '中国国航', 'travel', 90],
  ['海航', '海南航空', 'travel', 90],
  ['春秋', '春秋航空', 'travel', 90],
  ['厦航', '厦门航空', 'travel', 90],
  ['深航', '深圳航空', 'travel', 90],
  ['川航', '四川航空', 'travel', 90],
  // OTA平台 → 通常是长途交通或住宿
  ['携程', '携程旅行', 'travel', 70],
  ['ctrip', '携程旅行', 'travel', 65],
  ['飞猪', '飞猪旅行', 'travel', 70],
  ['去哪儿', '去哪儿', 'travel', 70],
  ['同程', '同程旅行', 'travel', 70],
  ['艺龙', '艺龙', 'travel', 65],
  ['途牛', '途牛', 'travel', 65],
  // 酒店/住宿
  ['酒店', '酒店', 'lodging', 80],
  ['宾馆', '宾馆', 'lodging', 80],
  ['民宿', '民宿', 'lodging', 80],
  ['如家', '如家酒店', 'lodging', 90],
  ['汉庭', '汉庭酒店', 'lodging', 90],
  ['亚朵', '亚朵酒店', 'lodging', 90],
  ['全季', '全季酒店', 'lodging', 90],
  ['万豪', '万豪酒店', 'lodging', 90],
  ['希尔顿', '希尔顿酒店', 'lodging', 90],
  ['洲际', '洲际酒店', 'lodging', 90],
  ['香格里拉', '香格里拉酒店', 'lodging', 90],
  ['锦江', '锦江酒店', 'lodging', 90],
  ['华住', '华住酒店', 'lodging', 85],
  ['7天', '7天酒店', 'lodging', 90],
  ['速8', '速8酒店', 'lodging', 90],
  ['hotel', '酒店', 'lodging', 80],
  ['inn', '酒店', 'lodging', 75],
  ['住宿', '住宿', 'lodging', 80],
  // 餐饮
  ['美团', '美团', 'meal', 80],
  ['饿了么', '饿了么', 'meal', 85],
  ['餐厅', '餐饮', 'meal', 70],
  ['饭店', '餐饮', 'meal', 70],
  ['外卖', '外卖', 'meal', 70],
  ['咖啡', '咖啡', 'meal', 65],
  ['星巴克', '星巴克', 'meal', 85],
  ['瑞幸', '瑞幸咖啡', 'meal', 85],
  ['肯德基', '肯德基', 'meal', 85],
  ['麦当劳', '麦当劳', 'meal', 85],
  ['餐饮', '餐饮', 'meal', 75],
  ['工作餐', '工作餐', 'meal', 80],
  ['餐补', '餐补', 'meal', 85],
  ['restaurant', '餐饮', 'meal', 75],
  ['food', '餐饮', 'meal', 65],
  // 招待
  ['招待', '业务招待', 'entertainment', 80],
  ['宴请', '宴请', 'entertainment', 80],
  ['接待', '接待', 'entertainment', 75],
  ['客户餐', '客户招待', 'entertainment', 85],
  ['会务接待', '会务接待', 'entertainment', 85],
  // 办公
  ['办公用品', '办公用品', 'office', 90],
  ['文具', '办公文具', 'office', 85],
  ['打印', '打印', 'office', 75],
  ['印刷', '印刷', 'office', 75],
  ['墨盒', '办公耗材', 'office', 85],
  ['硒鼓', '办公耗材', 'office', 85],
  ['A4纸', '办公用纸', 'office', 85],
  ['office', '办公', 'office', 70],
  // 通讯/快递
  ['快递', '快递费', 'communication', 85],
  ['顺丰', '顺丰快递', 'communication', 90],
  ['圆通', '圆通快递', 'communication', 90],
  ['中通', '中通快递', 'communication', 90],
  ['EMS', '邮政快递', 'communication', 85],
  ['电话费', '电话费', 'communication', 85],
  ['通讯', '通讯费', 'communication', 85],
  ['话费', '话费', 'communication', 85],
  ['网络费', '网络费', 'communication', 80],
  // 培训
  ['培训', '培训费', 'training', 85],
  ['课程', '培训课程', 'training', 80],
  ['考试', '考试费', 'training', 75],
  // 会议
  ['会议', '会议费', 'meeting', 80],
  ['会务', '会务费', 'meeting', 80],
  // 维修
  ['维修', '维修费', 'maintenance', 85],
  ['修理', '维修费', 'maintenance', 80],
  // 咨询
  ['咨询', '咨询费', 'consulting', 80],
  ['审计', '审计费', 'consulting', 85],
  ['法律', '法律咨询', 'consulting', 85],
  ['顾问', '顾问费', 'consulting', 80],
  // 保险
  ['保险', '保险费', 'insurance', 85],
  // 福利
  ['福利', '福利费', 'welfare', 85],
  ['礼品', '员工福利', 'welfare', 80],
  ['节日', '节日福利', 'welfare', 75],
  // 租赁
  ['租赁', '租赁费', 'rental', 80],
  ['房租', '房租', 'rental', 85],
  // 广告
  ['广告', '广告宣传费', 'advertising', 85],
  ['推广', '推广费', 'advertising', 80],
  ['展会', '展会费', 'advertising', 80],
  // 水电
  ['电费', '电费', 'utilities', 90],
  ['水费', '水费', 'utilities', 90],
  ['物业', '物业费', 'utilities', 85]
]

// ============================================================
// 文件名金额提取 — 如 "滴滴发票_金额86.50_2026-06-08.pdf"
// ============================================================
function extractAmountFromFilename(fileName) {
  const source = fileName || ''
  // "金额86.50" "金额 86.50" "¥86.50" "86.50元"
  const patterns = [
    /金额[^\d]{0,3}((?:\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?)(?![\d,])/,
    /[¥￥]\s*((?:\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?)(?![\d,])/,
    /((?:\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?)\s*元/,
    /[_\s-](\d{1,6}\.\d{1,2})(?=[_\s.-])/
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match && Number(match[1]) > 0 && Number(match[1]) < 999999) {
      return Number(Number(match[1]).toFixed(2))
    }
  }
  return null
}

// ============================================================
// 文件名日期提取 — 如 "2026-06-08" "20260608" "2026.06.08"
// ============================================================
function extractDateFromFilename(fileName) {
  const source = fileName || ''
  const patterns = [
    /(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/,
    /(20\d{2})(\d{2})(\d{2})/
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match) {
      const y = match[1]
      const m = match[2].padStart(2, '0')
      const d = match[3].padStart(2, '0')
      if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
        return `${y}-${m}-${d}`
      }
    }
  }
  return ''
}

// ============================================================
// 智能匹配：遍历所有关键词，按置信度排序，选最高分
// ============================================================
function smartMatch(text) {
  const source = (text || '').toLowerCase()
  let bestMatch = null
  let bestScore = 0

  SMART_KEYWORDS.forEach(([keyword, displayName, categoryId, score]) => {
    if (source.indexOf(keyword.toLowerCase()) >= 0 && score > bestScore) {
      bestScore = score
      bestMatch = { keyword, displayName, categoryId, score }
    }
  })

  return bestMatch
}

// 旧的平台关键词（保留兼容）
const PLATFORM_KEYWORDS = [
  ['滴滴', '滴滴'],
  ['didi', '滴滴'],
  ['高德', '高德'],
  ['gaode', '高德'],
  ['美团打车', '美团打车'],
  ['曹操', '曹操出行'],
  ['首汽', '首汽约车'],
  ['出租车', '出租车'],
  ['花小猪', '花小猪'],
  ['T3出行', 'T3出行'],
  ['12306', '12306'],
  ['携程', '携程'],
  ['飞猪', '飞猪'],
  ['南航', '南方航空'],
  ['东航', '东方航空'],
  ['国航', '中国国航'],
  ['海航', '海南航空'],
  ['如家', '如家酒店'],
  ['汉庭', '汉庭酒店'],
  ['亚朵', '亚朵酒店'],
  ['全季', '全季酒店'],
  ['美团', '美团'],
  ['饿了么', '饿了么'],
  ['星巴克', '星巴克'],
  ['瑞幸', '瑞幸咖啡'],
  ['顺丰', '顺丰快递'],
  ['圆通', '圆通快递'],
  ['肯德基', '肯德基'],
  ['麦当劳', '麦当劳']
]

function getFileName(file) {
  if (file.name) {
    return file.name
  }
  const path = file.path || file.tempFilePath || ''
  return path.split('/').pop() || `invoice-${Date.now()}`
}

function getFilePath(file) {
  return file.path || file.tempFilePath || ''
}

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  if (['jpg', 'jpeg', 'png'].indexOf(ext) >= 0) {
    return ext === 'jpeg' ? 'jpg' : ext
  }
  if (ext === 'pdf') {
    return 'pdf'
  }
  return 'unknown'
}

function detectPlatform(text) {
  const source = text.toLowerCase()
  const match = PLATFORM_KEYWORDS.find(([keyword]) => source.indexOf(keyword.toLowerCase()) >= 0)
  return match ? match[1] : '未知商家'
}

function detectEvidenceType(text) {
  const source = text.toLowerCase()
  if (source.indexOf('行程单') >= 0 || source.indexOf('凭证') >= 0 || source.indexOf('trip') >= 0 || source.indexOf('receipt') >= 0) {
    return '行程单'
  }
  return '发票'
}

function detectInvoiceType(text) {
  const source = text || ''

  if (/航空运输电子客票行程单|电子客票行程单/.test(source)) {
    return '航空运输电子客票行程单'
  }
  if (/电子发票\s*[（(]\s*增值税专用发票\s*[）)]|(?:数电|全电)发票.{0,12}(?:专用发票|专票)/.test(source)) {
    return '电子发票（增值税专用发票）'
  }
  if (/电子发票\s*[（(]\s*(?:增值税)?普通发票\s*[）)]|(?:数电|全电)发票.{0,12}(?:普通发票|普票)/.test(source)) {
    return '电子发票（普通发票）'
  }
  if (/增值税电子普通发票/.test(source)) {
    return '增值税电子普通发票'
  }
  if (/(?:滴滴|didi|高德打车|美团打车|曹操出行|网约车)/i.test(source) && /发票/.test(source)) {
    return '电子发票（普通发票）'
  }

  return extractTextByLabels(source, ['发票类型', '票据类型'])
}

function padNumber(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function extractDate(text) {
  const source = text || ''
  // 优先从文件名提取
  const fromName = extractDateFromFilename(source)
  if (fromName) return fromName

  // 中文日期: 2026年06月08日
  const cnMatch = source.match(/(20\d{2})[年.-](\d{1,2})[月.-](\d{1,2})/)
  if (cnMatch) {
    return `${cnMatch[1]}-${padNumber(Number(cnMatch[2]))}-${padNumber(Number(cnMatch[3]))}`
  }
  // 紧凑格式: 20260608
  const compactMatch = source.match(/(20\d{2})(\d{2})(\d{2})/)
  if (compactMatch) {
    const y = compactMatch[1], m = Number(compactMatch[2]), d = Number(compactMatch[3])
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${padNumber(m)}-${padNumber(d)}`
    }
  }
  return ''
}

function stableHash(text) {
  return (text || '').split('').reduce((total, char) => {
    return (total + char.charCodeAt(0) * 17) % 100000
  }, 97)
}

function parseOptionalAmount(value) {
  if (value == null || value === '') {
    return ''
  }
  const number = Number(`${value}`.replace(/,/g, ''))
  return Number.isNaN(number) || number <= 0 || number > 999999 ? '' : Number(number.toFixed(2))
}

function extractMoneyByLabels(text, labels) {
  const source = text || ''
  const amountPattern = '((?:\\d{1,3}(?:,\\d{3})+|\\d{1,6})(?:\\.\\d{1,4})?)'
  const pattern = new RegExp(`(?:${labels.join('|')})[^\\d]{0,30}${amountPattern}(?![\\d,])`, 'i')
  const amountMatch = source.match(pattern)
  if (amountMatch) {
    return parseOptionalAmount(amountMatch[1])
  }
  return ''
}

function extractInvoiceTableTotals(text) {
  const source = text || ''
  const match = source.match(/(?:^|[\n_])\s*合\s*计[^\d¥￥]{0,30}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)\s+[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i)
  if (!match) {
    return { pretaxAmount: '', taxAmount: '' }
  }
  return {
    pretaxAmount: parseOptionalAmount(match[1]),
    taxAmount: parseOptionalAmount(match[2])
  }
}

function reconcileInvoiceAmounts(amountValue, taxValue, pretaxValue) {
  let amount = Number(amountValue)
  let taxAmount = taxValue === '' ? '' : Number(taxValue)
  let pretaxAmount = pretaxValue === '' ? '' : Number(pretaxValue)
  const hasAmount = Number.isFinite(amount) && amount > 0
  const hasTax = taxAmount !== '' && Number.isFinite(taxAmount) && taxAmount >= 0
  const hasPretax = pretaxAmount !== '' && Number.isFinite(pretaxAmount) && pretaxAmount > 0

  if (!hasAmount && hasTax && hasPretax) {
    amount = Number((pretaxAmount + taxAmount).toFixed(2))
  } else if (hasAmount && !hasTax && hasPretax && amount >= pretaxAmount) {
    taxAmount = Number((amount - pretaxAmount).toFixed(2))
  } else if (hasAmount && hasTax && !hasPretax && amount > taxAmount) {
    pretaxAmount = Number((amount - taxAmount).toFixed(2))
  }

  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    taxAmount,
    pretaxAmount
  }
}

function bestNearbyAmount(text) {
  const source = text || ''
  const pattern = /([¥￥])?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\s*(元))?/g
  let best = null
  let match
  while ((match = pattern.exec(source))) {
    const before = source[match.index - 1] || ''
    const after = source[pattern.lastIndex] || ''
    if (/\d/.test(before) || /\d/.test(after)) {
      continue
    }
    const amount = parseOptionalAmount(match[2])
    if (amount === '') {
      continue
    }
    const raw = match[2]
    const hasUnit = Boolean(match[1] || match[3])
    const hasTwoDecimal = /\.\d{2}$/.test(raw)
    const hasOneDecimal = /\.\d$/.test(raw)
    const hasLongDecimal = /\.\d{3,4}$/.test(raw)
    const score = (hasUnit ? 60 : 0) + (hasTwoDecimal ? 40 : 0) + (hasLongDecimal ? 35 : 0) + (hasOneDecimal ? 20 : 0)
    if (score === 0) {
      continue
    }
    if (!best || score > best.score) {
      best = { amount, score }
    }
  }
  return best ? best.amount : ''
}

function extractNearbyAmount(text) {
  const lines = `${text || ''}`.split(/[\n_]+/).map((line) => line.trim()).filter(Boolean)
  for (let index = 0; index < lines.length; index += 1) {
    if (!/(金\s*额|金额|合计|报销金额|承担金额|应付|实付|支付|元)/.test(lines[index])) {
      continue
    }
    const windowText = [lines[index - 1], lines[index], lines[index + 1]]
      .filter(Boolean)
      .join(' ')
    const amount = bestNearbyAmount(windowText)
    if (amount !== '') {
      return amount
    }
  }
  return ''
}

function extractAmount(text, size, fileName) {
  const source = text || ''

  // 优先文件名提取
  const fromName = extractAmountFromFilename(fileName || '')
  if (fromName !== null) return fromName

  // 价税合计
  const taxInclusiveMatch = source.match(/价税合计[\s\S]{0,100}?(?:小写)?[^\d¥￥]{0,20}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i)
  if (taxInclusiveMatch) {
    const taxInclusiveAmount = parseOptionalAmount(taxInclusiveMatch[1])
    if (taxInclusiveAmount !== '') return taxInclusiveAmount
  }
  // 带标签金额
  const amount = extractMoneyByLabels(source, ['价税合计', '含税合计', '应付金额', '实付金额', '支付金额', '报销金额', '承担金额', 'amount', 'amt', '￥', '¥'])
  if (amount !== '') return amount
  // 附近金额
  const nearbyAmount = extractNearbyAmount(source)
  if (nearbyAmount !== '') return nearbyAmount
  // 通用合计
  const genericAmount = extractMoneyByLabels(source, ['金\\s*额', '金额', '合计'])
  if (genericAmount !== '') return genericAmount

  return 0
}

function extractTextByLabels(text, labels) {
  const source = text || ''
  const pattern = new RegExp(`(?:${labels.join('|')})[\\s_：:：-]*([^_\\n,，|]{2,80})`, 'i')
  const match = source.match(pattern)
  if (!match) {
    return ''
  }
  return match[1]
    .replace(/(?:发票类型|发票号码|发票号|报销金额|税额|不含税金额|备注|收支项目|承担部门负责人|承担部门|承担金额).*/, '')
    .trim()
}

function cleanBuyerValue(value) {
  return `${value || ''}`
    .replace(/(?:有效身份证件号码|身份证|发票号码|发票号|纳税人识别号|统一社会信用代码|税号|销售方|收款人|复核人?|开票人|金额|合计).*/, '')
    .replace(/[;；。]+$/, '')
    .trim()
}

function extractBuyerName(text) {
  const source = text || ''
  const patterns = [
    /(?:购买方信息|购买方|购方信息|购方)[\s\S]{0,100}?(?:名称|姓名)[\s_：:：-]*([^_\n,，|]{2,80})/i,
    /(?:购买方名称|购方名称|买方单位[\s/、]*个人|购货单位名称|发票抬头|抬头|旅客姓名|乘车人|乘客姓名|乘机人|客户名称|住宿人|入住人)[\s_：:：-]*([^_\n,，|]{2,80})/i
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)
    const value = cleanBuyerValue(match && match[1])

    if (value) {
      return value
    }
  }

  return ''
}

function extractBuyerTaxNo(text) {
  const source = text || ''
  const patterns = [
    /(?:购买方信息|购买方|购方信息|购方)[\s\S]{0,140}?(?:纳税人识别号|统一社会信用代码|税号)[^0-9A-Z]{0,16}([0-9A-Z]{15,20})/i,
    /(?:购买方纳税人识别号|购方纳税人识别号|购买方税号|购方税号)[^0-9A-Z]{0,16}([0-9A-Z]{15,20})/i
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)

    if (match && match[1]) {
      return match[1].toUpperCase()
    }
  }

  return ''
}

function extractPersonText(text, labels) {
  const source = text || ''
  const pattern = new RegExp(`(?:${labels.join('|')})[\\s_：:：-]*([^_\\n,，|]{1,30}?)(?=\\s*(?:收款人|复核人?|开票人|$|\\n|[_，,|]))`, 'i')
  const match = source.match(pattern)

  return match ? match[1].trim() : ''
}

function extractAmountInWords(text) {
  const match = (text || '').match(/(?:价税合计|合计)[\s\S]{0,60}?[（(]?大写[）)]?[\s_：:：-]*([^_\n,，|]{2,80})/)

  return match ? match[1].replace(/[（(]?小写[）)]?.*/, '').trim() : ''
}

function extractDepartment(text) {
  const match = (text || '').match(/(?:承担部门(?!负责人)|报销部门|所属部门)[\s_：:：-]*([^_\n,，|]{2,80})/i)
  return match ? match[1].trim() : ''
}

function buildInvoiceNo(text) {
  const match = (text || '').match(/(?:发票号|票号|发票号码|no)[^\dA-Z]*(\d{6,20}|[A-Z]{1,4}\d{5,18})/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return ''
}

function buildInvoiceCode(text) {
  const match = (text || '').match(/(?:发票代码|代码)[^\dA-Z]*(\d{6,20}|[A-Z]{1,4}\d{5,18})/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return ''
}

function buildTaxNo(text) {
  const match = (text || '').match(/[0-9A-Z]{15,20}/i)
  if (match) {
    return match[0].toUpperCase()
  }
  return ''
}

function detectSourceType(fileType, text) {
  if (text.indexOf('扫描') >= 0 || text.toLowerCase().indexOf('scan') >= 0) {
    return '扫描件'
  }
  return fileType === 'pdf' ? '电子发票' : '扫描件'
}

// ============================================================
// 核心：智能识别发票文件
// 1. 用智能关键词匹配商家和分类
// 2. 从文件名提取金额和日期
// 3. 推断凭证类型
// ============================================================
function recognizeInvoiceFile(file) {
  const fileName = getFileName(file)
  const filePath = getFilePath(file)
  const fileType = getFileType(fileName)
  const text = `${fileName} ${file.extraText || ''}`
  const now = Date.now()

  // 智能匹配
  const match = smartMatch(text)
  const category = match && match.score >= 75
    ? {
        id: match.categoryId,
        name: getCategoryName(match.categoryId),
        icon: getCategoryIcon(match.categoryId),
        color: getCategoryColor(match.categoryId)
      }
    : classifyByText(text)
  const airIssuer = /航空运输电子客票行程单|电子客票行程单/.test(text)
    ? extractTextByLabels(text, ['填开单位', '填开单位名称'])
    : ''
  const platform = airIssuer || (match ? match.displayName : detectPlatform(text))
  const evidenceType = detectEvidenceType(text)
  const invoiceType = detectInvoiceType(text)
  const amount = extractAmount(text, file.size, fileName)
  const date = extractDate(text)
  const tableTotals = extractInvoiceTableTotals(text)
  const taxAmount = tableTotals.taxAmount === '' ? extractMoneyByLabels(text, ['增值税税额', '增值税额', '税额', '税金']) : tableTotals.taxAmount
  const parsedPretaxAmount = tableTotals.pretaxAmount === '' ? extractMoneyByLabels(text, ['不含税金额', '未税金额', '税前金额']) : tableTotals.pretaxAmount
  const reconciledAmounts = reconcileInvoiceAmounts(amount, taxAmount, parsedPretaxAmount)
  const allocatedAmount = extractMoneyByLabels(text, ['承担金额', '分摊金额'])
  const buyerName = extractBuyerName(text)
  const buyerTaxNo = extractBuyerTaxNo(text)

  // 根据智能匹配结果调整分类（高置信度匹配时已在上面直接构造了新对象，此处无需再次覆盖）

  return {
    id: `inv_${now}_${stableHash(fileName)}`,
    fileName,
    filePath,
    fileType,
    sourceType: detectSourceType(fileType, text),
    evidenceType,
    categoryId: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,
    merchant: platform === '未知商家' ? (match ? match.displayName : '待识别发票') : platform,
    platform,
    expenseItem: extractTextByLabels(text, ['收支项目', '费用项目', '费用类型']),
    invoiceType,
    invoiceNo: buildInvoiceNo(text),
    invoiceCode: buildInvoiceCode(text),
    taxNo: buildTaxNo(text),
    buyerName,
    buyerTaxNo,
    amountInWords: extractAmountInWords(text),
    payee: extractPersonText(text, ['收款人']),
    reviewer: extractPersonText(text, ['复核人', '复核']),
    drawer: extractPersonText(text, ['开票人']),
    amount: reconciledAmounts.amount,
    amountText: reconciledAmounts.amount.toFixed(2),
    taxAmount: reconciledAmounts.taxAmount,
    taxAmountText: reconciledAmounts.taxAmount === '' ? '' : reconciledAmounts.taxAmount.toFixed(2),
    pretaxAmount: reconciledAmounts.pretaxAmount,
    pretaxAmountText: reconciledAmounts.pretaxAmount === '' ? '' : reconciledAmounts.pretaxAmount.toFixed(2),
    department: extractDepartment(text),
    departmentOwner: extractTextByLabels(text, ['承担部门负责人', '部门负责人', '负责人']),
    allocatedAmount,
    allocatedAmountText: allocatedAmount === '' ? '' : allocatedAmount.toFixed(2),
    remark: extractTextByLabels(text, ['备注', '说明', '用途']),
    date,
    confidence: match ? match.score : 0,
    status: match && match.score >= 70 ? '已识别' : '待识别',
    pairId: '',
    pairLabel: '',
    folderName: '',
    createdAt: now
  }
}

// 辅助函数：根据分类ID获取名称/图标/颜色
function getCategoryName(categoryId) {
  const { CATEGORIES } = require('./categories')
  const cat = CATEGORIES.find(c => c.id === categoryId)
  return cat ? cat.name : '其他'
}

function getCategoryIcon(categoryId) {
  const { CATEGORIES } = require('./categories')
  const cat = CATEGORIES.find(c => c.id === categoryId)
  return cat ? cat.icon : '📦'
}

function getCategoryColor(categoryId) {
  const { CATEGORIES } = require('./categories')
  const cat = CATEGORIES.find(c => c.id === categoryId)
  return cat ? cat.color : '#64748b'
}

function recognizeFiles(files) {
  return (files || []).map(recognizeInvoiceFile)
}

function safeCloudPath(fileName) {
  return `invoices/${Date.now()}-${fileName}`.replace(/[^\w./-]/g, '_')
}

function uploadFileToCloud(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: resolve,
      fail: reject
    })
  })
}

function callOcrFunction(data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'invoice-ocr',
      data,
      success: resolve,
      fail: reject
    })
  })
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pollDelay(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 2000
  }
  return Math.max(0, Math.min(parsed, 5000))
}

function formatOcrError(error, stage) {
  const raw = `${error && (error.errMsg || error.message) ? (error.errMsg || error.message) : error || '未知错误'}`
    .replace(/\s+/g, ' ')
    .slice(0, 220)

  if (/timeout|timed out/i.test(raw)) {
    return `${stage}超时。请确认发布版使用的云环境正确、invoice-ocr 已部署，并将云函数超时时间设置为 60 秒。原始错误：${raw}`
  }
  if (/FUNCTION_NOT_FOUND|function not found|云函数不存在/i.test(raw)) {
    return `${stage}失败：生产环境中没有找到 invoice-ocr 云函数，请重新上传并部署。`
  }
  if (/PADDLEOCR_ACCESS_TOKEN|PADDLEOCR_API_URL|not configured/i.test(raw)) {
    return `${stage}失败：PaddleOCR 未配置。请在云函数环境变量中设置 PADDLEOCR_API_URL 和 PADDLEOCR_ACCESS_TOKEN。`
  }
  if (/TENCENTCLOUD_SECRET_ID|TENCENTCLOUD_SECRET_KEY/i.test(raw)) {
    return `${stage}失败：腾讯云 OCR 密钥未配置。请在云函数环境变量中设置。`
  }
  if (/HTTP 500/i.test(raw)) {
    return `${stage}失败：PaddleOCR 服务内部错误，请稍后重试。`
  }
  if (/HTTP 503|HTTP 504/i.test(raw)) {
    return `${stage}失败：PaddleOCR 服务繁忙，请稍后重试。`
  }
  if (/non-JSON response/i.test(raw)) {
    return `${stage}失败：PaddleOCR 返回了非预期格式的数据，请检查 API 地址是否正确。`
  }
  return `${stage}失败：${raw}`
}

function failedRecognition(fallback, status, error, cloudFileID) {
  return [{
    ...fallback,
    cloudFileID: cloudFileID || '',
    amount: 0,
    amountText: '0.00',
    date: '',
    invoiceNo: '',
    taxNo: '',
    confidence: 0,
    status: '待识别',
    ocrStatus: status,
    ocrError: error
  }]
}

function resolveCloudOcrResult(callResult, requestData, attempt) {
  const payload = callResult && callResult.result
  if (!payload || !payload.pending || !payload.jobId) {
    return Promise.resolve(payload || null)
  }
  if (attempt >= 30) {
    return Promise.reject(new Error('PaddleOCR polling timed out'))
  }
  return wait(pollDelay(payload.pollIntervalMs))
    .then(() => {
      return callOcrFunction({
        action: 'pollPaddleJob',
        jobId: payload.jobId,
        fileID: requestData.fileID,
        fileName: requestData.fileName,
        fallback: requestData.fallback
      })
    })
    .then((result) => resolveCloudOcrResult(result, requestData, attempt + 1))
}

// ============================================================
// 云端 OCR 识别（带智能本地 fallback）
// ============================================================
function recognizeInvoiceFileWithCloud(file) {
  const fallback = recognizeInvoiceFile(file)
  const filePath = getFilePath(file)

  const cloudDisabled = typeof getApp === 'function' && getApp().globalData.cloudEnabled === false
  if (!wx.cloud || cloudDisabled) {
    return Promise.resolve(failedRecognition(
      fallback,
      '云开发不可用',
      '当前运行环境没有初始化微信云开发，无法调用 PaddleOCR。\n建议：在微信开发者工具中开通云开发，或使用手动录入。'
    ))
  }

  if (!filePath) {
    return Promise.resolve(failedRecognition(
      fallback,
      '文件读取失败',
      '没有取得所选发票的本地临时路径，请重新选择文件。'
    ))
  }

  return uploadFileToCloud(filePath, safeCloudPath(fallback.fileName))
    .then((uploadResult) => {
      const requestData = {
        fileID: uploadResult.fileID,
        fileName: fallback.fileName,
        filePath,
        fallback
      }
      return callOcrFunction(requestData)
        .then((result) => resolveCloudOcrResult(result, requestData, 0))
        .then((result) => ({
          result,
          cloudFileID: uploadResult.fileID
        }))
        .catch((error) => ({
          result: null,
          cloudFileID: uploadResult.fileID,
          ocrError: formatOcrError(error, '云端OCR调用')
        }))
    })
    .then(({ result, cloudFileID, ocrError }) => {
      if (ocrError) {
        return failedRecognition(fallback, '云端OCR失败', ocrError, cloudFileID)
      }
      const data = result && result.data
      const rows = Array.isArray(data) ? data : []
      if (!rows.length) {
        return failedRecognition(
          fallback,
          '云端OCR无结果',
          'invoice-ocr 已返回，但没有提供识别结果。请检查云函数日志和 PaddleOCR 环境变量。\n建议：在云函数控制台查看日志，确认 PADDLEOCR_ACCESS_TOKEN 是否有效。',
          cloudFileID
        )
      }
      const failedRow = rows.find((item) => item.ocrError || /未配置|失败|无文本/.test(item.ocrStatus || ''))
      if (failedRow) {
        return failedRecognition(
          fallback,
          failedRow.ocrStatus || '云端OCR失败',
          failedRow.ocrError || '云端 OCR 未配置或未返回可用文本，请检查云函数配置或手动补全。',
          cloudFileID
        )
      }
      return rows.map((item, index) => ({
        ...fallback,
        ...item,
        id: item.id || `${fallback.id}_${index}`,
        fileName: item.fileName || fallback.fileName,
        filePath,
        fileType: fallback.fileType,
        cloudFileID,
        ocrStatus: item.ocrStatus || '云端OCR'
      }))
    })
    .catch((error) => {
      return failedRecognition(
        fallback,
        '发票上传失败',
        formatOcrError(error, '发票上传')
      )
    })
}

function recognizeFilesAsync(files) {
  return (files || []).reduce((promise, file) => {
    return promise.then((items) => {
      return recognizeInvoiceFileWithCloud(file)
        .then((group) => items.concat(group))
    })
  }, Promise.resolve([]))
}

// ============================================================
// 单张发票重新识别（从详情页调用）
// ============================================================
function reRecognizeInvoice(invoice) {
  if (!invoice || !invoice.filePath) {
    return Promise.reject(new Error('无法找到原件路径，无法重新识别'))
  }
  const file = {
    name: invoice.fileName,
    path: invoice.filePath,
    size: 0,
    extraText: invoice.merchant + ' ' + (invoice.remark || '')
  }
  return recognizeInvoiceFileWithCloud(file)
}

module.exports = {
  recognizeInvoiceFile,
  recognizeFiles,
  recognizeFilesAsync,
  reRecognizeInvoice
}
