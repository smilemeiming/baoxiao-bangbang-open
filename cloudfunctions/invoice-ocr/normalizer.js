const CATEGORY_RULES = [
  {
    id: 'travel',
    name: '长途交通费',
    icon: '🚄',
    color: '#2563eb',
    keywords: ['长途交通费', '长途交通', '10201', '12306', '火车', '高铁', '动车', '机票', '飞机', '航空', '携程', '飞猪', '车票', '客运', 'flight', 'train', '南航', '东航', '国航', '海航', '春秋', '厦航', '深航', '川航', '去哪儿', '同程', 'ctrip']
  },
  {
    id: 'taxi',
    name: '市内交通费',
    icon: '🚕',
    color: '#0f766e',
    keywords: ['市内交通费', '市内交通', '打车', '滴滴', '高德', '美团打车', '曹操', '首汽', '出租车', '网约车', '地铁', '公交', 'didi', 'taxi', '如祺', 'T3', '花小猪', '享道']
  },
  {
    id: 'lodging',
    name: '差旅住宿费',
    icon: '🏨',
    color: '#7c3aed',
    keywords: ['差旅住宿费', '住宿费', '差旅住宿', '住宿', '10203', '酒店', '宾馆', '民宿', '如家', '汉庭', '亚朵', '全季', '万豪', '希尔顿', '洲际', '香格里拉', 'hotel']
  },
  {
    id: 'meal',
    name: '餐补',
    icon: '🍜',
    color: '#0284c7',
    keywords: ['餐补', '餐费', '餐饮', '工作餐', '误餐', '餐厅', '外卖', '美团', '饿了么', '咖啡', '星巴克', '瑞幸', '肯德基', '麦当劳', 'restaurant', 'food', '食品', '饮品']
  },
  {
    id: 'entertainment',
    name: '招待费',
    icon: '🤝',
    color: '#0ea5e9',
    keywords: ['招待费', '业务招待', '招待', '接待', '宴请', '客户餐', '客户招待', '会务接待']
  },
  {
    id: 'office',
    name: '办公费',
    icon: '📄',
    color: '#0891b2',
    keywords: ['办公费', '办公用品', '文具', '打印', '印刷', '墨盒', '硒鼓', '纸张']
  },
  {
    id: 'welfare',
    name: '福利费',
    icon: '🎁',
    color: '#db2777',
    keywords: ['福利费', '福利', '礼品', '节日', '员工关怀', '团队聚餐', '生日']
  },
  {
    id: 'communication',
    name: '通讯费',
    icon: '📱',
    color: '#6366f1',
    keywords: ['通讯费', '电话费', '快递', '顺丰', '圆通', '中通', 'EMS', '话费', '网络费', '宽带']
  },
  {
    id: 'training',
    name: '培训费',
    icon: '📚',
    color: '#ca8a04',
    keywords: ['培训费', '培训', '课程', '考试', '教材', '学习']
  },
  {
    id: 'meeting',
    name: '会议费',
    icon: '📋',
    color: '#9333ea',
    keywords: ['会议费', '会务费', '会议', '研讨会', '座谈会']
  },
  {
    id: 'rental',
    name: '租赁费',
    icon: '🏢',
    color: '#dc2626',
    keywords: ['租赁费', '租赁', '房租', '场地', '设备租赁']
  },
  {
    id: 'maintenance',
    name: '维修费',
    icon: '🔧',
    color: '#d97706',
    keywords: ['维修费', '维修', '修理', '保养', '维护']
  },
  {
    id: 'consulting',
    name: '咨询费',
    icon: '💼',
    color: '#4f46e5',
    keywords: ['咨询费', '咨询', '审计', '法律', '顾问', '评估']
  },
  {
    id: 'insurance',
    name: '保险费',
    icon: '🛡️',
    color: '#059669',
    keywords: ['保险费', '保险', '财产险', '人身险']
  },
  {
    id: 'advertising',
    name: '广告宣传费',
    icon: '📢',
    color: '#e11d48',
    keywords: ['广告费', '宣传费', '推广', '展会', '展览', '广告']
  },
  {
    id: 'utilities',
    name: '水电物业费',
    icon: '💡',
    color: '#2563eb',
    keywords: ['水电费', '水费', '电费', '物业费', '物业', '燃气']
  },
  {
    id: 'other',
    name: '其他',
    icon: '📦',
    color: '#64748b',
    keywords: []
  }
]

const INVOICE_TYPE_RULES = [
  {
    id: 'digital-vat-special',
    name: '电子发票（增值税专用发票）',
    anchors: [
      [/电子发票\s*[（(]\s*增值税专用发票\s*[）)]/, 140],
      [/数字化电子发票[\s\S]{0,20}(?:增值税)?专用发票/, 130],
      [/(?:数电|全电)发票\s*[（(]?\s*(?:增值税)?专用发票\s*[）)]?/, 130],
      [/数电(?:发票)?[\s\S]{0,12}专票/, 110]
    ]
  },
  {
    id: 'digital-vat-ordinary',
    name: '电子发票（普通发票）',
    anchors: [
      [/电子发票\s*[（(]\s*(?:增值税)?普通发票\s*[）)]/, 140],
      [/数字化电子发票[\s\S]{0,20}(?:增值税)?普通发票/, 130],
      [/(?:数电|全电)发票\s*[（(]?\s*(?:增值税)?普通发票\s*[）)]?/, 130],
      [/数电(?:发票)?[\s\S]{0,12}普票/, 110]
    ]
  },
  {
    id: 'used-vehicle',
    name: '二手车销售统一发票',
    anchors: [[/二手车销售统一发票/, 160], [/车价合计|车辆识别代号|登记证号/, 15]]
  },
  {
    id: 'motor-vehicle',
    name: '机动车销售统一发票',
    anchors: [[/机动车销售统一发票/, 160], [/车辆识别代号|厂牌型号|吨位/, 15]]
  },
  {
    id: 'vat-roll',
    name: '增值税普通发票（卷票）',
    anchors: [[/增值税普通发票\s*[（(]?\s*卷票/, 150], [/机器编号|收款员|机打号码/, 12]]
  },
  {
    id: 'quota',
    name: '定额发票',
    anchors: [[/定额发票|定额专用发票/, 150], [/人民币[壹贰叁肆伍陆柒捌玖拾佰仟]+元/, 20]]
  },
  {
    id: 'toll',
    name: '通行费电子发票',
    anchors: [[/通行费电子发票|收费公路通行费/, 145], [/入口|出口|通行日期|车牌号/, 10]]
  },
  {
    id: 'railway',
    name: '铁路电子客票',
    anchors: [[/铁路(?:客运)?电子(?:客票|发票)|铁路客票|火车票报销凭证/, 145], [/车次|席位|乘车人|发到站/, 10]]
  },
  {
    id: 'air-itinerary',
    name: '航空运输电子客票行程单',
    anchors: [[/航空运输电子客票行程单|电子客票行程单/, 150], [/客票号|旅客姓名|燃油附加费|民航发展基金/, 10]]
  },
  {
    id: 'taxi',
    name: '出租汽车发票',
    anchors: [[/出租汽车发票|出租车发票/, 145], [/上车|下车|里程|车号|单价/, 10]]
  },
  {
    id: 'passenger-ticket',
    name: '客运电子客票',
    anchors: [[/(?:道路|公路|水路|客运)电子客票|汽车客票|客运发票/, 140], [/始发站|到达站|班次|乘车日期/, 10]]
  },
  {
    id: 'medical-receipt',
    name: '医疗收费票据',
    anchors: [[/(?:门诊|住院|医疗)收费(?:电子)?票据/, 150], [/医疗机构|医保类型|个人支付|收费项目/, 10]]
  },
  {
    id: 'fiscal-receipt',
    name: '财政电子票据',
    anchors: [[/财政电子票据|非税收入统一票据|资金往来结算票据|捐赠统一票据/, 145], [/财政部监制|财政票据监制章|缴款人/, 10]]
  },
  {
    id: 'agricultural-purchase',
    name: '农产品收购发票',
    anchors: [[/农产品收购发票/, 150], [/销售方身份证号|农产品名称|收购单位/, 10]]
  },
  {
    id: 'electronic-vat-ordinary',
    name: '增值税电子普通发票',
    anchors: [[/增值税电子普通发票/, 135]]
  },
  {
    id: 'vat-special',
    name: '增值税专用发票',
    anchors: [[/增值税专用发票|专用发票|专票/, 105]]
  },
  {
    id: 'vat-ordinary',
    name: '增值税普通发票',
    anchors: [[/增值税普通发票|普通发票|普票/, 95]]
  },
  {
    id: 'general-machine',
    name: '通用机打发票',
    anchors: [[/通用机打发票|机打发票/, 130]]
  }
]

const MERCHANT_KEYWORDS = [
  ['滴滴', '滴滴出行'],
  ['高德', '高德打车'],
  ['美团打车', '美团打车'],
  ['曹操', '曹操出行'],
  ['首汽', '首汽约车'],
  ['出租车', '出租车'],
  ['花小猪', '花小猪打车'],
  ['T3出行', 'T3出行'],
  ['12306', '铁路12306'],
  ['携程', '携程旅行'],
  ['飞猪', '飞猪旅行'],
  ['南航', '南方航空'],
  ['东航', '东方航空'],
  ['国航', '中国国航'],
  ['海航', '海南航空'],
  ['春秋', '春秋航空'],
  ['厦航', '厦门航空'],
  ['深航', '深圳航空'],
  ['川航', '四川航空'],
  ['如家', '如家酒店'],
  ['汉庭', '汉庭酒店'],
  ['亚朵', '亚朵酒店'],
  ['全季', '全季酒店'],
  ['万豪', '万豪酒店'],
  ['希尔顿', '希尔顿酒店'],
  ['洲际', '洲际酒店'],
  ['锦江', '锦江酒店'],
  ['美团', '美团'],
  ['饿了么', '饿了么'],
  ['星巴克', '星巴克'],
  ['瑞幸', '瑞幸咖啡'],
  ['肯德基', '肯德基'],
  ['麦当劳', '麦当劳'],
  ['顺丰', '顺丰快递'],
  ['圆通', '圆通快递']
]

function stableHash(text) {
  return (text || '').split('').reduce((total, char) => {
    return (total + char.charCodeAt(0) * 17) % 100000
  }, 97)
}

function asText(value) {
  if (value == null) {
    return ''
  }

  if (typeof value === 'object' && value.Text) {
    return `${value.Text}`
  }

  return `${value}`
}

function valueOf(source, keys) {
  for (const key of keys) {
    const value = source && source[key]

    if (value != null && value !== '') {
      return asText(value)
    }
  }

  return ''
}

function findInfo(item) {
  if (!item) {
    return {}
  }

  if (item.SingleInvoiceInfos) {
    const values = Object.keys(item.SingleInvoiceInfos).map((key) => item.SingleInvoiceInfos[key])
    const match = values.find((value) => value && Object.keys(value).length)

    if (match) {
      return match
    }
  }

  return item
}

function flattenValues(value) {
  if (value == null) {
    return ''
  }

  if (typeof value !== 'object') {
    return `${value}`
  }

  if (value.Text) {
    return `${value.Text}`
  }

  return Object.keys(value).map((key) => flattenValues(value[key])).join(' ')
}

function classify(text) {
  const source = (text || '').toLowerCase()
  const rideHailing = CATEGORY_RULES.find((item) => item.id === 'taxi')

  if (/(?:滴滴|didi|高德打车|美团打车|曹操出行|首汽约车|花小猪|t3出行|如祺出行|享道出行|网约车|出租车)/i.test(source)) {
    return rideHailing
  }

  let bestCategory = null
  let bestScore = 0

  CATEGORY_RULES.forEach((item) => {
    if (item.id === 'other') return

    let score = 0
    item.keywords.forEach((keyword) => {
      if (source.indexOf(keyword.toLowerCase()) >= 0) {
        score += keyword.length >= 4 ? 3 : 1
      }
    })

    if (score > bestScore) {
      bestScore = score
      bestCategory = item
    }
  })

  return bestCategory || CATEGORY_RULES[CATEGORY_RULES.length - 1]
}

function parseAmount(value, fallback) {
  const number = Number(`${value || ''}`.replace(/[^\d.]/g, ''))

  if (!Number.isNaN(number) && number > 0) {
    return Number(number.toFixed(2))
  }

  return Number(Number(fallback || 0).toFixed(2))
}

function parseOptionalAmount(value, fallback) {
  const source = value == null || value === '' ? fallback : value

  if (source == null || source === '') {
    return ''
  }

  const number = Number(`${source}`.replace(/[^\d.]/g, ''))
  return Number.isNaN(number) ? '' : Number(number.toFixed(2))
}

function amountText(value) {
  return value === '' ? '' : Number(value).toFixed(2)
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

function parseDate(value, fallback) {
  const text = value || fallback || ''
  const match = text.match(/(20\d{2})[年./-]?(\d{1,2})[月./-]?(\d{1,2})/)

  if (!match) {
    return fallback || ''
  }

  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

function evidenceTypeOf(text) {
  const source = text || ''

  if (source.indexOf('行程单') >= 0 || source.indexOf('行程') >= 0 || source.toLowerCase().indexOf('trip') >= 0) {
    return '行程单'
  }

  return '发票'
}

function detectNonInvoiceReason(text, invoiceProfile) {
  const source = cleanOcrText(text)

  if (
    (invoiceProfile && invoiceProfile !== 'unknown') ||
    /航空运输电子客票行程单|电子客票行程单/.test(source)
  ) {
    return ''
  }

  if (/行程单|行程报告|出行报告/.test(source)) {
    return '非航空行程单'
  }

  if (/(?:住宿|酒店|客房).{0,12}(?:结算单|账单|消费明细|费用明细|入住清单)|(?:结算单|账单|消费明细|费用明细|入住清单).{0,12}(?:住宿|酒店|客房)/.test(source)) {
    return '住宿结算或消费明细'
  }

  if (/结算单|对账单|账单|消费明细|费用明细|入住清单/.test(source)) {
    return '结算或消费明细'
  }

  if (/报销单|费用申请单|付款申请单|预订确认单|订单详情/.test(source)) {
    return '报销或订单辅助单据'
  }

  return ''
}

function cleanOcrText(value) {
  return `${value || ''}`
    .replace(/\(cid:\d+\)/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:td|th|tr|p|div|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function pushText(values, value) {
  const text = cleanOcrText(value)

  if (!text || text.indexOf('data:image') === 0 || /^https?:\/\//.test(text)) {
    return
  }

  values.push(text)
}

function collectStrings(value, values, key) {
  if (value == null) {
    return
  }

  if (['inputImage', 'outputImages', 'image', 'images', 'pageImage'].indexOf(key) >= 0) {
    return
  }

  if (typeof value === 'string' || typeof value === 'number') {
    pushText(values, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, values, key))
    return
  }

  if (typeof value === 'object') {
    Object.keys(value).forEach((childKey) => {
      collectStrings(value[childKey], values, childKey)
    })
  }
}

function collectPaddleTexts(response) {
  const values = []
  const result = response && response.result ? response.result : response
  const ocrResults = result && Array.isArray(result.ocrResults) ? result.ocrResults : []
  const layoutResults = result && Array.isArray(result.layoutParsingResults) ? result.layoutParsingResults : []

  ocrResults.forEach((item) => {
    const pruned = item.prunedResult || item
    const texts = pruned.rec_texts || pruned.recTexts || pruned.texts || []

    if (Array.isArray(texts)) {
      texts.forEach((text) => pushText(values, text))
    } else {
      collectStrings(texts, values)
    }
  })

  layoutResults.forEach((item) => {
    const markdownText = item.markdown && (item.markdown.text || item.markdown.markdown)
    const pruned = item.prunedResult || {}

    pushText(values, markdownText || pruned.markdown || pruned.text)
    collectStrings(pruned.rec_texts || pruned.recTexts || pruned.texts, values)
  })

  if (!values.length) {
    collectStrings(result, values)
  }

  return values.join('\n')
}

function collectPaddlePages(response) {
  const result = response && response.result ? response.result : response
  const layoutResults = result && Array.isArray(result.layoutParsingResults) ? result.layoutParsingResults : []
  const ocrResults = result && Array.isArray(result.ocrResults) ? result.ocrResults : []
  const pageItems = layoutResults.length ? layoutResults : ocrResults
  const pages = pageItems.map((item) => {
    const values = []
    const markdownText = item.markdown && (item.markdown.text || item.markdown.markdown)
    const pruned = item.prunedResult || item

    pushText(values, markdownText || pruned.markdown || pruned.text)
    collectStrings(pruned.rec_texts || pruned.recTexts || pruned.texts, values)
    return values.join('\n')
  }).filter(Boolean)

  if (pages.length) {
    return pages
  }

  const text = collectPaddleTexts(response)
  return text ? [text] : []
}

function hasInvoicePageAnchor(text) {
  const source = cleanOcrText(text)

  return /(?:发票|电子客票|行程单|收费票据|财政票据)/.test(source) &&
    /(?:发票号码|票据号码|客票号|开票日期|价税合计|车价合计|收费合计)/.test(source)
}

function groupPaddlePages(pages) {
  const groups = []

  pages.forEach((page) => {
    if (!groups.length || hasInvoicePageAnchor(page)) {
      groups.push(page)
      return
    }

    groups[groups.length - 1] = `${groups[groups.length - 1]}\n${page}`
  })

  return groups
}

function matchText(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)

    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return ''
}

function createGlobalPattern(pattern) {
  return new RegExp(pattern.source, pattern.flags.indexOf('g') >= 0 ? pattern.flags : `${pattern.flags}g`)
}

function addMoneyCandidate(candidates, value, score, reason) {
  const amount = normalizeAmountText(value)

  if (!amount) {
    return
  }

  const existing = candidates.find((candidate) => candidate.amount === amount)

  if (existing) {
    existing.score = Math.max(existing.score, score)
    return
  }

  candidates.push({ amount, score, reason })
}

function addMoneyPatternCandidates(candidates, source, pattern, score, reason) {
  const regex = createGlobalPattern(pattern)
  let match

  while ((match = regex.exec(source))) {
    addMoneyCandidate(candidates, match[1], score, reason)

    if (match.index === regex.lastIndex) {
      regex.lastIndex += 1
    }
  }
}

function pickBestMoneyCandidate(candidates) {
  if (!candidates.length) {
    return ''
  }

  return candidates
    .slice()
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return Number(right.amount) - Number(left.amount)
    })[0].amount
}

function parseChineseSection(text) {
  const digits = {
    零: 0,
    〇: 0,
    一: 1,
    壹: 1,
    二: 2,
    两: 2,
    贰: 2,
    三: 3,
    叁: 3,
    四: 4,
    肆: 4,
    五: 5,
    伍: 5,
    六: 6,
    陆: 6,
    七: 7,
    柒: 7,
    八: 8,
    捌: 8,
    九: 9,
    玖: 9
  }
  const units = {
    十: 10,
    拾: 10,
    百: 100,
    佰: 100,
    千: 1000,
    仟: 1000
  };
  let total = 0
  let current = 0;

  `${text || ''}`.split('').forEach((char) => {
    if (Object.prototype.hasOwnProperty.call(digits, char)) {
      current = digits[char]
      return
    }

    if (units[char]) {
      total += (current || 1) * units[char]
      current = 0
    }
  })

  return total + current
}

function parseChineseMoney(value) {
  const source = `${value || ''}`.replace(/\s+/g, '')

  if (!source || !/[元圆角分]/.test(source)) {
    return ''
  }

  const integerText = (source.match(/([零〇一壹二两贰三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万亿]+)[元圆]/) || [])[1] || ''
  const sections = integerText.split('亿')
  let integer = 0

  if (sections.length > 1) {
    integer += parseChineseSection(sections[0]) * 100000000
  }

  const lowerText = sections[sections.length - 1] || ''
  const lowerSections = lowerText.split('万')

  if (lowerSections.length > 1) {
    integer += parseChineseSection(lowerSections[0]) * 10000
  }

  integer += parseChineseSection(lowerSections[lowerSections.length - 1])

  const digitMap = {
    零: 0,
    〇: 0,
    一: 1,
    壹: 1,
    二: 2,
    两: 2,
    贰: 2,
    三: 3,
    叁: 3,
    四: 4,
    肆: 4,
    五: 5,
    伍: 5,
    六: 6,
    陆: 6,
    七: 7,
    柒: 7,
    八: 8,
    捌: 8,
    九: 9,
    玖: 9
  };
  const jiao = (source.match(/([零〇一壹二两贰三叁四肆五伍六陆七柒八捌九玖])角/) || [])[1]
  const fen = (source.match(/([零〇一壹二两贰三叁四肆五伍六陆七柒八捌九玖])分/) || [])[1]
  const amount = integer + (jiao ? digitMap[jiao] / 10 : 0) + (fen ? digitMap[fen] / 100 : 0)

  return normalizeAmountText(amount.toFixed(2))
}

function extractAmountText(text) {
  const source = cleanOcrText(text)
  const candidates = []
  const amountInWords = parseChineseMoney(extractAmountInWords(source))

  // Strong labels from invoice/KIE outputs should beat nearby line-item amounts.
  addMoneyPatternCandidates(candidates, source, /(?:价税合计[\s\S]{0,120}?)?(?:小写|[\(（]小写[\)）])[^\d¥￥]{0,20}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i, 180, 'tax-inclusive lowercase')
  addMoneyPatternCandidates(candidates, source, /(?:报销金额|承担金额|应付金额|实付金额|实收金额|支付金额|金额合计|合计金额|应收金额|总计金额|含税合计|价税合计|车价合计|成交金额|收费合计|票款合计|票价合计|通行费金额)[^\d¥￥]{0,80}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i, 160, 'strong amount label')
  addMoneyPatternCandidates(candidates, source, /(?:合计金额|金额合计|应收金额)[^\d¥￥]{0,30}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i, 130, 'summary label')
  addMoneyPatternCandidates(candidates, source, /(?:金\s*额|金额|合计|total|amount|总计)[^\d¥￥]{0,30}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i, 90, 'generic amount label')
  addMoneyPatternCandidates(candidates, source, /[¥￥]\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)\s*(?:元)?(?:\D|$)/, 70, 'currency amount')
  addMoneyPatternCandidates(candidates, source, /(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)\s*元/, 55, 'yuan amount')

  if (amountInWords) {
    addMoneyCandidate(candidates, amountInWords, 155, 'uppercase amount')
    candidates.forEach((candidate) => {
      if (candidate.amount === amountInWords) {
        candidate.score += 30
      }
    })
  }

  return pickBestMoneyCandidate(candidates) || extractNearbyAmountText(source)
}

function extractMoneyText(text, labels) {
  const source = cleanOcrText(text)
  const pattern = new RegExp(`(?:${labels.join('|')})[^\\d¥￥]{0,50}[¥￥]?\\s*(\\d{1,6}(?:,\\d{3})*(?:\\.\\d{1,4})?)(?:\\D|$)`, 'i')

  return matchText(source, [pattern]).replace(/,/g, '')
}

function extractInvoiceTableTotals(text) {
  const source = cleanOcrText(text)
  const match = source.match(/(?:^|\n)\s*合\s*计[^\d¥￥]{0,30}[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)\s+[¥￥]?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,4})?)(?:\D|$)/i)

  if (!match) {
    return {
      pretaxAmount: '',
      taxAmount: ''
    }
  }

  return {
    pretaxAmount: normalizeAmountText(match[1]),
    taxAmount: normalizeAmountText(match[2])
  }
}

function normalizeAmountText(value) {
  const amount = `${value || ''}`.replace(/,/g, '')
  const number = Number(amount)

  return Number.isNaN(number) || number <= 0 || number > 999999 ? '' : amount
}

function bestNearbyAmountText(text) {
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

    const amount = normalizeAmountText(match[2])

    if (!amount) {
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

function extractNearbyAmountText(text) {
  const lines = `${text || ''}`.split('\n').map((line) => line.trim()).filter(Boolean)

  for (let index = 0; index < lines.length; index += 1) {
    if (!/(金\s*额|金额|合计|报销金额|承担金额|应付|实付|支付|元)/.test(lines[index])) {
      continue
    }

    const windowText = [lines[index - 1], lines[index], lines[index + 1]]
      .filter(Boolean)
      .join(' ')
    const amount = bestNearbyAmountText(windowText)

    if (amount) {
      return amount
    }
  }

  return ''
}

function cleanFieldValue(value) {
  return `${value || ''}`
    .replace(/(?:发票类型|发票号码|发票号|报销金额|税额|不含税金额|备注|收支项目|承担部门负责人|承担部门|承担金额).*/, '')
    .trim()
}

function extractFieldText(text, labels) {
  const source = cleanOcrText(text)
  const pattern = new RegExp(`(?:${labels.join('|')})[\\s：:]*([^\\n|，,]{2,80})`, 'i')

  return cleanFieldValue(matchText(source, [pattern]))
}

function cleanAirRouteStop(value) {
  const stop = cleanOcrText(value)
    .replace(/\n/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/^(?:出发地|始发地|起飞地|出发城市|始发站|自|FROM)\s*[：:]?\s*/i, '')
    .replace(/\s*(?:航班号|航班|承运人|舱位|日期|时间|票价|燃油附加费|民航发展基金).*$/i, '')
    .replace(/\s+[A-Z0-9]{2}\d{2,4}\b.*$/i, '')
    .replace(/(?:飞机票|机票|行程单|发票)$/i, '')
    .replace(/^[\s：:，,;；-]+|[\s：:，,;；-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!stop || stop.length > 36 || /^(?:FROM|TO|自|至|出发地|到达地|报销单|扫描件|电子票)$/i.test(stop)) {
    return ''
  }

  return stop
}

function buildAirRoute(originValue, destinationValue) {
  const origin = cleanAirRouteStop(originValue)
  const destination = cleanAirRouteStop(destinationValue)

  if (!origin || !destination || origin === destination) {
    return null
  }

  return {
    origin,
    destination,
    text: `行程：${origin} → ${destination}`
  }
}

function extractAirRouteFromTable(text) {
  const lines = cleanOcrText(text).split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const headerCells = lines[index].split('|').map((cell) => cell.trim()).filter(Boolean)
    const originIndex = headerCells.findIndex((cell) => /^(?:自|FROM|出发地|始发地|起飞地)$/i.test(cell))
    const destinationIndex = headerCells.findIndex((cell) => /^(?:至|TO|到达地|目的地|降落地)$/i.test(cell))

    if (originIndex < 0 || destinationIndex < 0) {
      continue
    }

    for (let offset = 1; offset <= 3 && index + offset < lines.length; offset += 1) {
      const cells = lines[index + offset].split('|').map((cell) => cell.trim()).filter(Boolean)

      if (!cells.length || cells.every((cell) => /^:?-{2,}:?$/.test(cell))) {
        continue
      }

      const route = buildAirRoute(cells[originIndex], cells[destinationIndex])
      if (route) {
        return route
      }
    }
  }

  return null
}

function extractAirRoute(text, info) {
  const structuredRoute = buildAirRoute(
    valueOf(info, ['Departure', 'DepartureCity', 'Origin', 'OriginCity', 'From', 'FromCity', 'DepartureAirport', 'StationGetOn', 'StartStation']),
    valueOf(info, ['Arrival', 'ArrivalCity', 'Destination', 'DestinationCity', 'To', 'ToCity', 'ArrivalAirport', 'StationGetOff', 'EndStation'])
  )

  if (structuredRoute) {
    return structuredRoute
  }

  const source = cleanOcrText(text)
  if (!/(?:航空运输电子客票行程单|电子客票行程单|客票号|客票款|航班号|机票|飞机票|改签|flight|airline)/i.test(source)) {
    return null
  }

  const labeledPatterns = [
    /(?:出发地|始发地|起飞地|出发城市|始发站)[\s：:|]*([^\n|，,]{2,36}?)[\s|，,]+(?:到达地|目的地|降落地|到达城市|到达站)[\s：:|]*([^\n|，,]{2,36})/i,
    /(?:自|FROM)[\s：:|]*([^\n|，,]{2,36}?)[\s|，,]*(?:至|到|TO|→|->|--+|—|–)[\s：:|]*([^\n|，,]{2,36})/i
  ]

  for (const pattern of labeledPatterns) {
    const match = source.match(pattern)
    const route = match && buildAirRoute(match[1], match[2])

    if (route) {
      return route
    }
  }

  const tableRoute = extractAirRouteFromTable(source)
  if (tableRoute) {
    return tableRoute
  }

  const stop = '(?:[\\u4e00-\\u9fa5]{2,14}(?:机场)?(?:\\s*[（(]?[A-Z]{3}[）)]?)?|[A-Z]{3})'
  const routePattern = new RegExp(`(?:^|[\\s_（(])(${stop})\\s*(?:--+|->|→|—|–|－|至|到|-)\\s*(${stop})(?=$|[\\s_，,。.；;)）]|机票)`, 'i')

  for (const line of source.split('\n')) {
    const match = line.match(routePattern)
    const route = match && buildAirRoute(match[1], match[2])

    if (route) {
      return route
    }
  }

  return null
}

function mergeAirRouteRemark(remarkValue, route) {
  const remark = `${remarkValue || ''}`.trim()

  if (!route) {
    return remark
  }

  if (remark.indexOf(route.origin) >= 0 && remark.indexOf(route.destination) >= 0) {
    return remark
  }

  return remark ? `${route.text}；${remark}` : route.text
}

function extractDepartmentText(text) {
  const source = cleanOcrText(text)
  const department = matchText(source, [
    /(?:承担部门(?!负责人)|报销部门|所属部门)[\s：:]*([^\n|，,]{2,80})/i
  ])

  return cleanFieldValue(department)
}

function extractDateText(text) {
  const date = matchText(text, [
    /(?:开票日期|填开日期|出票日期|交易日期|通行日期|收费日期|就诊日期|入院日期|出院日期|日期|乘车日期|入住日期|消费日期)[^\d]{0,12}(20\d{2}\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2})/,
    /(20\d{2}\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2})/
  ])

  return date.replace(/\s+/g, '').replace(/日$/, '')
}

function normalizeIdentifierText(value) {
  return `${value || ''}`
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/[Oo〇]/g, '0')
    .replace(/[IiLl|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[^0-9A-Z]/gi, '')
    .toUpperCase()
}

function normalizeTaxNoText(value) {
  return `${value || ''}`
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/[Oo〇]/g, '0')
    .replace(/[Ii|]/g, '1')
    .replace(/[^0-9A-Z]/gi, '')
    .toUpperCase()
}

function extractIdentifierByPatterns(source, patterns, normalize, isValid) {
  for (const pattern of patterns) {
    const match = source.match(pattern)

    if (!match || !match[1]) {
      continue
    }

    const value = normalize(match[1])

    if (!isValid || isValid(value)) {
      return value
    }
  }

  return ''
}

function isLikelyInvoiceNo(value) {
  return /^[0-9A-Z]{6,24}$/.test(value)
}

function isLikelyInvoiceCode(value) {
  return /^(?:\d{10}|\d{12}|[0-9A-Z]{10,24})$/.test(value)
}

function isLikelyTaxNo(value) {
  return /^[0-9A-Z]{15,20}$/.test(value)
}

function extractFileNameInvoicePair(source) {
  const match = source.match(/(?:^|\n|[\s/\\])(\d{10,12})[_-](\d{6,24})(?:\.[A-Z0-9]+)?(?:\n|$)/i)

  if (!match) {
    return null
  }

  return {
    invoiceCode: normalizeIdentifierText(match[1]),
    invoiceNo: normalizeIdentifierText(match[2])
  }
}

function lineLooksLikeInvoiceId(source, value) {
  const normalizedValue = normalizeIdentifierText(value)

  return `${source || ''}`.split('\n').some((line) => {
    return /发票(?:号码|代码|号)|电子发票号码/.test(line) && normalizeIdentifierText(line).indexOf(normalizedValue) >= 0
  })
}

function extractInvoiceNo(text) {
  const source = cleanOcrText(text)
  const result = extractIdentifierByPatterns(source, [
    /(?:电子票据号码|票据号码|电子客票号|客票号|车票号|机打号码|发票号码|发票号|票据号|票号|电子发票号码|凭证号|订单号)[^0-9A-Z０-９Oo〇IiLlSsBb|]{0,16}([0-9A-Z０-９Oo〇IiLlSsBb|\s-]{6,32})/i,
    /(?:No[.:]?\s*)([0-9A-Z０-９Oo〇IiLlSsBb|\s-]{6,32})/i
  ], normalizeIdentifierText, isLikelyInvoiceNo)
  const filePair = extractFileNameInvoicePair(source)

  return result || (filePair && filePair.invoiceNo) || ''
}

function extractInvoiceCode(text) {
  const source = cleanOcrText(text)
  const result = extractIdentifierByPatterns(source, [
    /(?:电子票据代码|票据代码|发票代码|代码)[^0-9A-Z０-９Oo〇IiLlSsBb|]{0,16}([0-9A-Z０-９Oo〇IiLlSsBb|\s-]{10,32})/i
  ], normalizeIdentifierText, isLikelyInvoiceCode)
  const filePair = extractFileNameInvoicePair(source)

  return result || (filePair && filePair.invoiceCode) || ''
}

function extractTaxNo(text) {
  const source = cleanOcrText(text)
  const labeled = extractIdentifierByPatterns(source, [
    /(?:纳税人识别号|统一社会信用代码|税号|纳税人识别)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})/i
  ], normalizeTaxNoText, isLikelyTaxNo)

  if (labeled) {
    return labeled
  }

  const fallback = extractIdentifierByPatterns(source, [
    /(?:^|[^0-9A-Z])([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})(?:[^0-9A-Z]|$)/i
  ], normalizeTaxNoText, isLikelyTaxNo)

  return fallback && !lineLooksLikeInvoiceId(source, fallback) ? fallback : ''
}

function detectInvoiceProfile(text) {
  const source = cleanOcrText(text)
  let best = { id: 'unknown', name: '', score: 0 }

  INVOICE_TYPE_RULES.forEach((rule) => {
    const score = rule.anchors.reduce((total, [pattern, weight]) => {
      return total + (pattern.test(source) ? weight : 0)
    }, 0)

    if (score > best.score) {
      best = { id: rule.id, name: rule.name, score }
    }
  })

  return best.score >= 90 ? best : { id: 'unknown', name: '', score: 0 }
}

function detectInvoiceType(text) {
  const source = cleanOcrText(text)
  const detected = detectInvoiceProfile(source).name

  if (detected) {
    return detected
  }

  if (/(?:滴滴|didi|高德打车|美团打车|曹操出行|首汽约车|花小猪|t3出行|网约车)/i.test(source) && /发票/.test(source)) {
    return /专用发票|专票/.test(source)
      ? '电子发票（增值税专用发票）'
      : '电子发票（普通发票）'
  }

  return ''
}

function extractAirSupplier(text) {
  const source = cleanOcrText(text)
  const issuer = matchText(source, [
    /(?:填开单位|填开单位名称)\s*[：:]?\s*([^\n|，,]{2,80})/
  ])
  const cleanIssuer = cleanMerchantValue(issuer)

  if (cleanIssuer) {
    return cleanIssuer
  }

  const carrier = matchText(source, [
    /(?:实际承运人|承运航空公司|承运人|航空公司名称|航空公司)\s*[：:]?\s*([^\n|，,]{2,80})/
  ])
  const airlineKeyword = MERCHANT_KEYWORDS.find(([key]) => {
    return /航空|航$/.test(key) && source.indexOf(key) >= 0
  })
  const flightNo = matchText(source, [
    /(?:航班号|航班号码)\s*[：:]?\s*([A-Z0-9]{4,8})/i
  ])

  return normalizeAirlineName(
    cleanMerchantValue(carrier) ||
    (airlineKeyword && airlineKeyword[1]) ||
    flightNo,
    source
  )
}

function normalizeAirlineName(value, source) {
  const text = `${value || ''}`.trim()
  const context = `${source || ''}`
  const nameRules = [
    [/^(?:深圳航空有限责任公司|深圳航空|深航)$/i, '深圳航空有限责任公司'],
    [/^(?:中国南方航空股份有限公司|中国南方航空|南方航空|南航)$/i, '中国南方航空股份有限公司'],
    [/^(?:中国东方航空股份有限公司|中国东方航空|东方航空|东航)$/i, '中国东方航空股份有限公司'],
    [/^(?:中国国际航空股份有限公司|中国国际航空|中国国航|国航)$/i, '中国国际航空股份有限公司'],
    [/^(?:厦门航空有限公司|厦门航空|厦航)$/i, '厦门航空有限公司'],
    [/^(?:四川航空股份有限公司|四川航空|川航)$/i, '四川航空股份有限公司']
  ]
  const flightRules = [
    [/(?:航班号|航班号码)\s*[：:]?\s*ZH\d{3,5}/i, '深圳航空有限责任公司'],
    [/(?:航班号|航班号码)\s*[：:]?\s*CZ\d{3,5}/i, '中国南方航空股份有限公司'],
    [/(?:航班号|航班号码)\s*[：:]?\s*MU\d{3,5}/i, '中国东方航空股份有限公司'],
    [/(?:航班号|航班号码)\s*[：:]?\s*CA\d{3,5}/i, '中国国际航空股份有限公司'],
    [/(?:航班号|航班号码)\s*[：:]?\s*MF\d{3,5}/i, '厦门航空有限公司'],
    [/(?:航班号|航班号码)\s*[：:]?\s*3U\d{3,5}/i, '四川航空股份有限公司']
  ]
  const nameMatch = nameRules.find(([pattern]) => pattern.test(text))
  const flightMatch = flightRules.find(([pattern]) => pattern.test(context))

  return nameMatch ? nameMatch[1] : flightMatch ? flightMatch[1] : text
}

function extractMerchant(text, fallback, invoiceProfile) {
  const source = cleanOcrText(text)
  const airSupplier = invoiceProfile === 'air-itinerary' ? extractAirSupplier(source) : ''
  const merchant = matchText(source, [
    /代开企业名称\s*[：:]\s*([\s\S]{2,80}?)(?=\n(?:纳税人识别号|地\s*址|开户行|收款人|复核|开票人|销|售|方)|。|；|;|$)/,
    /(?:销货单位名称|销售单位名称|经营[、,]?拍卖单位|经营单位|拍卖单位|收费单位|医疗机构名称|承运人|运输企业|开票单位|收款单位|收购单位)\s*[：:]\s*([^\n|，,]{2,80})/,
    /(?:销售方信息|销售方|销方信息|销方)[\s\S]{0,120}?名称\s*[：:]\s*([^\n|，,]{2,80})/,
    /(?:销售方名称|销方名称|开票方|收款方|商家|商户)\s*[：:]\s*([^\n|，,]{2,80})/,
    /(?:店名|酒店名称|公司名称)\s*[：:]\s*([^\n|，,]{2,80})/
  ])
  const keyword = MERCHANT_KEYWORDS.find(([key]) => {
    return source.indexOf(key) >= 0
  })

  return airSupplier || cleanMerchantValue(merchant) || (keyword && keyword[1]) || fallback.merchant || fallback.platform || ''
}

function cleanBuyerValue(value) {
  return `${value || ''}`
    .replace(/(?:有效身份证件号码|身份证|发票号码|发票号|纳税人识别号|统一社会信用代码|税号|销售方|收款人|复核人?|开票人|金额|合计).*/, '')
    .replace(/[;；。]+$/, '')
    .trim()
}

function extractBuyerName(text) {
  const source = cleanOcrText(text)

  return cleanBuyerValue(matchText(source, [
    /(?:购货单位名称|买方单位[\s/、]*个人|缴款人|患者姓名|交款人)\s*[：:]\s*([^\n|，,]{2,80})/,
    /(?:购买方信息|购买方|购方信息|购方)[\s\S]{0,120}?名称\s*[：:]\s*([^\n|，,]{2,80})/,
    /(?:购买方名称|购方名称|发票抬头|抬头)\s*[：:]\s*([^\n|，,]{2,80})/,
    /(?:旅客姓名|乘车人|乘客姓名|乘机人|客户名称|住宿人|入住人)\s*[：:]\s*([^\n|，,]{2,80})/
  ]))
}

function extractBuyerTaxNo(text) {
  const source = cleanOcrText(text)

  return extractIdentifierByPatterns(source, [
    /(?:购买方信息|购买方|购方信息|购方)[\s\S]{0,160}?(?:纳税人识别号|统一社会信用代码|税号)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})/i,
    /(?:购买方纳税人识别号|购方纳税人识别号|购买方税号|购方税号)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})/i
  ], normalizeTaxNoText, isLikelyTaxNo)
}

function extractSellerTaxNo(text) {
  const source = cleanOcrText(text)

  return extractIdentifierByPatterns(source, [
    /(?:纳税人识别号|统一社会信用代码|税号)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})[^\n]{0,30}代开机关/i,
    /(?:销货单位纳税人识别号|销售单位纳税人识别号|经营单位纳税人识别号|收费单位统一社会信用代码)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})/i,
    /(?:销售方信息|销售方|销方信息|销方)[\s\S]{0,160}?(?:纳税人识别号|统一社会信用代码|税号)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})/i,
    /(?:销售方纳税人识别号|销方纳税人识别号|销售方税号|销方税号)[^0-9A-Z０-９Oo〇IiLl|]{0,16}([0-9A-Z０-９Oo〇IiLl|\s-]{15,28})/i
  ], normalizeTaxNoText, isLikelyTaxNo)
}

function cleanPersonValue(value) {
  return `${value || ''}`
    .replace(/(?:收款人|复核人?|开票人|销售方|购买方|纳税人识别号).*/, '')
    .trim()
}

function extractPersonText(text, labels) {
  const source = cleanOcrText(text)
  const pattern = new RegExp(`(?:${labels.join('|')})[\\s：:]*([^\\n|，,]{1,30}?)(?=\\s*(?:收款人|复核人?|开票人|$|\\n|[|，,]))`, 'i')

  return cleanPersonValue(matchText(source, [pattern]))
}

function extractAmountInWords(text) {
  const source = cleanOcrText(text)
  const amount = matchText(source, [
    /(?:价税合计|合计)[\s\S]{0,60}?[（(]?大写[）)]?[\s：:]*([^\n|，,]{2,80})/,
    /[（(]?大写[）)]?[\s：:]*([零壹贰叁肆伍陆柒捌玖拾佰仟万亿圆元角分整正]+)/,
    /人民币[\s：:]*([零〇一壹二两贰三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万亿圆元角分整正]+)/
  ])

  return `${amount || ''}`
    .replace(/[（(]?小写[）)]?.*/, '')
    .trim()
}

function cleanMerchantValue(value) {
  return `${value || ''}`
    .split('\n')
    .map((line, index) => {
      const text = line.trim()

      return index === 0 ? text : text.replace(/^(?:备|注|销|售|方)\s*/, '')
    })
    .join('')
    .replace(/\s+/g, '')
    .replace(/[。；;，,].*/, '')
    .replace(/(?:租赁费|纳税人识别号|统一社会信用代码|税号|车辆识别代号|电子票据代码|票据号码|地\s*址|开户行).*/, '')
    .trim()
}

function normalizeOne(item, context, index) {
  const info = findInfo(item)
  const rawText = JSON.stringify(info)
  const fallback = context.fallback || {}
  const mergedText = `${context.fileName || ''} ${flattenValues(info)}`
  const category = classify(mergedText)
  const parsedAmount = parseAmount(valueOf(info, [
    'Total',
    'TotalAmount',
    'Amount',
    'Fare',
    'TicketPrice',
    'Price'
  ]), fallback.amount)
  const parsedTaxAmount = parseOptionalAmount(valueOf(info, [
    'Tax',
    'TaxAmount',
    'TotalTax',
    'TaxTotal'
  ]), fallback.taxAmount)
  const parsedPretaxAmount = parseOptionalAmount(valueOf(info, [
    'PretaxAmount',
    'NoTaxAmount',
    'AmountWithoutTax',
    'AmountExcludingTax'
  ]), fallback.pretaxAmount)
  const allocatedAmount = parseOptionalAmount(valueOf(info, [
    'AllocatedAmount',
    'ShareAmount',
    'DepartmentAmount'
  ]), fallback.allocatedAmount)
  const invoiceProfile = valueOf(info, ['InvoiceProfile']) || fallback.invoiceProfile || ''
  const reconciledAmounts = reconcileInvoiceAmounts(parsedAmount, parsedTaxAmount, parsedPretaxAmount)
  const amount = reconciledAmounts.amount
  const taxAmount = reconciledAmounts.taxAmount
  const pretaxAmount = reconciledAmounts.pretaxAmount
  const merchantKeys = invoiceProfile === 'air-itinerary'
    ? ['IssuingOffice', 'IssueOffice', 'IssuingAgency', 'Agent', 'AgentName', 'Seller', 'SellerName', 'Airline', 'Carrier', 'CarrierName', 'Company', 'Platform']
    : ['Seller', 'SellerName', 'Company', 'Airline', 'HotelName', 'ShopName', 'Title', 'Platform', 'StationGetOn']
  const merchant = valueOf(info, merchantKeys) || fallback.merchant || fallback.platform || '未知商家'
  const buyerName = valueOf(info, ['Buyer', 'BuyerName', 'Purchaser', 'PurchaserName', 'PassengerName', 'TravelerName', 'RiderName', 'CustomerName', 'ClientName', 'PayerName']) || fallback.buyerName || ''
  const buyerTaxNo = valueOf(info, ['BuyerTaxID', 'BuyerTaxNo', 'PurchaserTaxID', 'PurchaserTaxNo', 'CustomerTaxID', 'CustomerTaxNo']) || fallback.buyerTaxNo || ''
  const sellerTaxNo = valueOf(info, ['SellerTaxID', 'SellerTaxNo']) || fallback.sellerTaxNo || ''
  const invoiceCode = valueOf(info, ['Code', 'InvoiceCode']) || fallback.invoiceCode || ''
  const amountInWords = valueOf(info, ['AmountInWords', 'TotalInWords', 'TotalAmountInWords', 'CapitalAmount']) || fallback.amountInWords || ''
  const payee = valueOf(info, ['Payee', 'Receiver', 'Cashier']) || fallback.payee || ''
  const reviewer = valueOf(info, ['Reviewer', 'Checker']) || fallback.reviewer || ''
  const drawer = valueOf(info, ['Drawer', 'Issuer', 'InvoiceDrawer']) || fallback.drawer || ''
  const airRoute = extractAirRoute(mergedText, info)
  const remark = mergeAirRouteRemark(valueOf(info, ['Remark', 'Memo', 'Note']) || fallback.remark || '', airRoute)

  return {
    id: `ocr_${Date.now()}_${index}_${stableHash(rawText)}`,
    fileName: context.fileName || fallback.fileName || '',
    filePath: context.fileID || fallback.filePath || '',
    sourceType: fallback.sourceType || '电子发票',
    evidenceType: evidenceTypeOf(mergedText),
    invoiceProfile,
    nonInvoiceReason: detectNonInvoiceReason(mergedText, invoiceProfile),
    categoryId: category.id,
    categoryName: category.name,
    categoryIcon: category.icon,
    categoryColor: category.color,
    merchant,
    platform: merchant,
    buyerName,
    sellerName: merchant,
    expenseItem: valueOf(info, ['ExpenseItem', 'CostItem', 'ProjectItem']) || fallback.expenseItem || '',
    invoiceType: valueOf(info, ['InvoiceType', 'InvoiceTypeName', 'Type']) || detectInvoiceType(rawText) || fallback.invoiceType || '',
    invoiceNo: valueOf(info, ['Number', 'InvoiceNum', 'InvoiceNo', 'TicketNum', 'SerialNumber', 'Code']) || fallback.invoiceNo || '',
    invoiceCode,
    taxNo: sellerTaxNo || buyerTaxNo || valueOf(info, ['TaxID', 'TaxNo']) || fallback.taxNo || '',
    buyerTaxNo,
    sellerTaxNo,
    amountInWords,
    payee,
    reviewer,
    drawer,
    amount,
    amountText: amount.toFixed(2),
    taxAmount,
    taxAmountText: amountText(taxAmount),
    pretaxAmount,
    pretaxAmountText: amountText(pretaxAmount),
    department: valueOf(info, ['Department', 'CostDepartment']) || fallback.department || '',
    departmentOwner: valueOf(info, ['DepartmentOwner', 'DepartmentManager', 'Owner']) || fallback.departmentOwner || '',
    allocatedAmount,
    allocatedAmountText: amountText(allocatedAmount),
    routeOrigin: airRoute ? airRoute.origin : (fallback.routeOrigin || ''),
    routeDestination: airRoute ? airRoute.destination : (fallback.routeDestination || ''),
    remark,
    date: parseDate(valueOf(info, ['Date', 'InvoiceDate', 'StartDate', 'FlightDate', 'TimeGetOn']), fallback.date),
    confidence: 96,
    status: '已识别',
    pairId: '',
    pairLabel: '',
    folderName: '',
    createdAt: Date.now()
  }
}

function calculatePaddleConfidence(invoice, profileScore) {
  let score = 20

  if (profileScore >= 90) score += 18
  if (invoice.amount > 0) score += 24
  if (invoice.merchant && !/待识别|未知商家/.test(invoice.merchant)) score += 14
  if (invoice.date) score += 8
  if (invoice.invoiceNo) score += 8
  if (invoice.sellerTaxNo || invoice.taxNo) score += 5

  return Math.min(98, score)
}

function normalizePaddleOcrResult(response, context = {}) {
  const fallback = context.fallback || {}
  const documents = groupPaddlePages(collectPaddlePages(response))

  if (!documents.length) {
    return context.fallback ? [{ ...fallback, ocrStatus: 'PaddleOCR无文本' }] : []
  }

  return documents.map((rawText, index) => {
    const text = `${context.fileName || ''}\n${rawText}`
    const tableTotals = extractInvoiceTableTotals(text)
    const profile = detectInvoiceProfile(text)
    const invoice = normalizeOne({
      Seller: extractMerchant(text, fallback, profile.id),
      Total: extractAmountText(text),
      TaxAmount: tableTotals.taxAmount || extractMoneyText(text, ['增值税税额', '增值税额', '税额', '税金']),
      PretaxAmount: tableTotals.pretaxAmount || extractMoneyText(text, ['不含税金额', '未税金额', '税前金额', '不含税价']),
      AllocatedAmount: extractMoneyText(text, ['承担金额', '分摊金额']),
      InvoiceProfile: profile.id,
      InvoiceType: profile.name || extractFieldText(text, ['发票类型', '票据类型']),
      ExpenseItem: extractFieldText(text, ['收支项目', '费用项目', '费用类型', '项目名称', '收费项目']),
      Department: extractDepartmentText(text),
      DepartmentOwner: extractFieldText(text, ['承担部门负责人', '部门负责人', '负责人']),
      Remark: extractFieldText(text, ['备注', '说明', '用途']),
      Date: extractDateText(text),
      InvoiceNo: extractInvoiceNo(text),
      InvoiceCode: extractInvoiceCode(text),
      Buyer: extractBuyerName(text),
      BuyerTaxID: extractBuyerTaxNo(text),
      SellerTaxID: extractSellerTaxNo(text) || extractTaxNo(text),
      AmountInWords: extractAmountInWords(text),
      Payee: extractPersonText(text, ['收款人']),
      Reviewer: extractPersonText(text, ['复核人', '复核']),
      Drawer: extractPersonText(text, ['开票人']),
      TaxNo: extractTaxNo(text),
      OcrText: rawText
    }, context, index)

    return {
      ...invoice,
      confidence: calculatePaddleConfidence(invoice, profile.score),
      ocrStatus: 'PaddleOCR'
    }
  })
}

function normalizeOcrResult(response, context) {
  const items = response && Array.isArray(response.MixedInvoiceItems)
    ? response.MixedInvoiceItems
    : []

  if (!items.length) {
    return context.fallback ? [context.fallback] : []
  }

  return items.map((item, index) => normalizeOne(item, context, index))
}

module.exports = {
  normalizeOcrResult,
  normalizePaddleOcrResult
}
