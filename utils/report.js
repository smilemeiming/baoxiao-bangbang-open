const { CATEGORIES } = require('./categories')
const { getInvoiceStats, resolveBuyerDisplayName } = require('./invoice-store')

const REPORT_MODES = [
  {
    id: 'summary',
    name: '汇总表',
    description: '只生成各类型数量和金额小计'
  },
  {
    id: 'detail',
    name: '明细表',
    description: '只生成全部发票明细，按类型排序'
  },
  {
    id: 'category',
    name: '按类型明细',
    description: '每个发票类型单独生成一个工作表'
  },
  {
    id: 'lodgingMeal',
    name: '住宿餐补明细',
    description: '只导出差旅住宿费和餐补，分别成表'
  }
]

const CATEGORY_ORDER = CATEGORIES.reduce((map, item, index) => {
  map[item.id] = index
  return map
}, {})

function escapeXml(value) {
  return `${value == null ? '' : value}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textCell(value, styleId) {
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

function numberCell(value, styleId) {
  const number = Number(value) || 0
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="Number">${number.toFixed(2)}</Data></Cell>`
}

function optionalNumberCell(value, styleId) {
  if (value == null || value === '') {
    return textCell('')
  }

  const number = Number(value)
  return Number.isNaN(number) ? textCell('') : numberCell(number, styleId)
}

function integerCell(value, styleId) {
  const number = Number(value) || 0
  const style = styleId ? ` ss:StyleID="${styleId}"` : ''
  return `<Cell${style}><Data ss:Type="Number">${number}</Data></Cell>`
}

function row(cells, attrs) {
  const attrText = attrs ? ` ${attrs}` : ''
  return `<Row${attrText}>${cells.join('')}</Row>`
}

function mergeTitleCell(value, mergeAcross) {
  return `<Cell ss:StyleID="Title" ss:MergeAcross="${mergeAcross}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

function sanitizeSheetName(value) {
  return `${value || '报表'}`
    .replace(/[\\/?*\[\]:]/g, '')
    .slice(0, 31)
}

function getReportMode(modeId) {
  return REPORT_MODES.find((item) => item.id === modeId) || REPORT_MODES[0]
}

function sortInvoicesByType(invoices) {
  return (invoices || []).slice().sort((left, right) => {
    const leftOrder = CATEGORY_ORDER[left.categoryId] == null ? 999 : CATEGORY_ORDER[left.categoryId]
    const rightOrder = CATEGORY_ORDER[right.categoryId] == null ? 999 : CATEGORY_ORDER[right.categoryId]

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }

    if ((left.date || '') !== (right.date || '')) {
      return `${left.date || ''}`.localeCompare(`${right.date || ''}`)
    }

    return `${left.merchant || left.platform || ''}`.localeCompare(`${right.merchant || right.platform || ''}`)
  })
}

function filterInvoicesByMode(invoices, modeId) {
  if (modeId === 'lodgingMeal') {
    return (invoices || []).filter((item) => ['lodging', 'meal'].indexOf(item.categoryId) >= 0)
  }

  return invoices || []
}

function getReportInvoices(invoices, modeId) {
  const mode = getReportMode(modeId)

  return sortInvoicesByType(filterInvoicesByMode(invoices, mode.id))
}

function buildGeneratedAt(date) {
  const value = date || new Date()
  const year = value.getFullYear()
  const month = padNumber(value.getMonth() + 1)
  const day = padNumber(value.getDate())
  const hour = padNumber(value.getHours())
  const minute = padNumber(value.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

function buildSummaryRows(invoices) {
  const stats = getInvoiceStats(invoices)
  const rows = [
    row([mergeTitleCell('发票报销汇总表', 2)], 'ss:Height="28"'),
    row([textCell(`生成时间：${buildGeneratedAt()}`, 'Meta'), textCell(`票据数量：${stats.totalCount}`, 'Meta'), textCell(`总金额：${stats.totalAmountText}`, 'Meta')]),
    row([textCell('费用科目', 'Header'), textCell('数量', 'Header'), textCell('金额小计', 'Header')])
  ]

  stats.categoryRows.forEach((item) => {
    rows.push(row([textCell(item.name), integerCell(item.count), numberCell(item.amount, 'Money')]))
  })

  rows.push(row([textCell('总计', 'Total'), integerCell(stats.totalCount, 'Total'), numberCell(stats.totalAmount, 'TotalMoney')]))
  return rows.join('')
}

function buildDetailRows(invoices, title) {
  const rows = [
    row([mergeTitleCell(title || '发票报销明细表', 16)], 'ss:Height="28"'),
    row([
      textCell('序号', 'Header'),
      textCell('发票日期', 'Header'),
      textCell('发票号码', 'Header'),
      textCell('收支项目', 'Header'),
      textCell('收支项目明细', 'Header'),
      textCell('供应商', 'Header'),
      textCell('购买方/人员', 'Header'),
      textCell('购买方税号', 'Header'),
      textCell('发票类型', 'Header'),
      textCell('含税金额', 'Header'),
      textCell('税额', 'Header'),
      textCell('不含税金额', 'Header'),
      textCell('承担部门', 'Header'),
      textCell('承担部门负责人', 'Header'),
      textCell('承担金额', 'Header'),
      textCell('备注', 'Header'),
      textCell('归档路径', 'Header')
    ])
  ]

  ;(invoices || []).forEach((item, index) => {
    rows.push(row([
      integerCell(index + 1),
      textCell(item.date),
      textCell(item.invoiceNo),
      textCell(item.categoryName),
      textCell(item.expenseItem || item.remark || ''),
      textCell(item.merchant || item.platform),
      textCell(resolveBuyerDisplayName(item)),
      textCell(item.buyerTaxNo || item.purchaserTaxNo || ''),
      textCell(item.invoiceType),
      numberCell(item.amount, 'Money'),
      optionalNumberCell(item.taxAmount, 'Money'),
      optionalNumberCell(item.pretaxAmount, 'Money'),
      textCell(item.department),
      textCell(item.departmentOwner),
      optionalNumberCell(item.allocatedAmount, 'Money'),
      textCell(item.remark),
      textCell(item.archivePath || item.filePath)
    ]))
  })

  return rows.join('')
}

function buildDetailWorksheet(name, invoices, title) {
  return `<Worksheet ss:Name="${escapeXml(sanitizeSheetName(name))}">
    <Table>
      <Column ss:Width="48"/>
      <Column ss:Width="96"/>
      <Column ss:Width="130"/>
      <Column ss:Width="100"/>
      <Column ss:Width="180"/>
      <Column ss:Width="130"/>
      <Column ss:Width="130"/>
      <Column ss:Width="150"/>
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      <Column ss:Width="90"/>
      <Column ss:Width="100"/>
      <Column ss:Width="110"/>
      <Column ss:Width="110"/>
      <Column ss:Width="100"/>
      <Column ss:Width="200"/>
      <Column ss:Width="240"/>
      ${buildDetailRows(invoices, title)}
    </Table>
  </Worksheet>`
}

function buildCategoryWorksheets(invoices, modeId) {
  const source = modeId === 'lodgingMeal'
    ? CATEGORIES.filter((item) => ['lodging', 'meal'].indexOf(item.id) >= 0)
    : CATEGORIES

  return source.map((category) => {
    const rows = sortInvoicesByType((invoices || []).filter((item) => item.categoryId === category.id))

    return buildDetailWorksheet(category.name, rows, `${category.name}明细表`)
  }).join('')
}

function buildExcelWorkbook(invoices, options) {
  const mode = getReportMode(options && options.mode)
  const sortedInvoices = sortInvoicesByType(filterInvoicesByMode(invoices, mode.id))
  const worksheets = []

  if (mode.id === 'summary') {
    worksheets.push(`<Worksheet ss:Name="汇总表">
    <Table>
      <Column ss:Width="140"/>
      <Column ss:Width="80"/>
      <Column ss:Width="120"/>
      ${buildSummaryRows(sortedInvoices)}
    </Table>
  </Worksheet>`)
  }

  if (mode.id === 'detail') {
    worksheets.push(buildDetailWorksheet('明细表', sortedInvoices, '发票报销明细表'))
  }

  if (mode.id === 'category' || mode.id === 'lodgingMeal') {
    worksheets.push(buildCategoryWorksheets(sortedInvoices, mode.id))
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Microsoft YaHei" ss:Size="11"/>
    </Style>
    <Style ss:ID="Title">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Microsoft YaHei" ss:Size="16" ss:Bold="1"/>
    </Style>
    <Style ss:ID="Meta">
      <Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#64748B"/>
    </Style>
    <Style ss:ID="Header">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#155E75" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Money">
      <NumberFormat ss:Format="&quot;¥&quot;#,##0.00"/>
    </Style>
    <Style ss:ID="Total">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="TotalMoney">
      <Font ss:FontName="Microsoft YaHei" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="&quot;¥&quot;#,##0.00"/>
    </Style>
  </Styles>
  ${worksheets.join('')}
</Workbook>`
}

function utf8Bytes(value) {
  const text = `${value == null ? '' : value}`
  const bytes = []

  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index)

    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1)

      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        index += 1
      }
    }

    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }

  return new Uint8Array(bytes)
}

function crcTable() {
  if (crcTable.cache) {
    return crcTable.cache
  }

  crcTable.cache = Array.from({ length: 256 }, (_, index) => {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }

    return value >>> 0
  })

  return crcTable.cache
}

function crc32(bytes) {
  const table = crcTable()
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc = table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(bytes, offset, value) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >>> 8) & 0xff
  bytes[offset + 2] = (value >>> 16) & 0xff
  bytes[offset + 3] = (value >>> 24) & 0xff
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0

  parts.forEach((part) => {
    result.set(part, offset)
    offset += part.length
  })

  return result
}

function zipDateParts(date) {
  const value = date || new Date()
  const time = (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2)
  const day = value.getDate()
  const month = value.getMonth() + 1
  const year = Math.max(1980, value.getFullYear()) - 1980

  return {
    time,
    date: (year << 9) | (month << 5) | day
  }
}

function createZip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0
  const stamp = zipDateParts(new Date())

  files.forEach((file) => {
    const nameBytes = utf8Bytes(file.name)
    const dataBytes = typeof file.data === 'string'
      ? utf8Bytes(file.data)
      : file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data)
    const crc = crc32(dataBytes)
    const local = new Uint8Array(30 + nameBytes.length)

    writeUint32(local, 0, 0x04034b50)
    writeUint16(local, 4, 20)
    writeUint16(local, 6, 0x0800)
    writeUint16(local, 8, 0)
    writeUint16(local, 10, stamp.time)
    writeUint16(local, 12, stamp.date)
    writeUint32(local, 14, crc)
    writeUint32(local, 18, dataBytes.length)
    writeUint32(local, 22, dataBytes.length)
    writeUint16(local, 26, nameBytes.length)
    local.set(nameBytes, 30)

    localParts.push(local, dataBytes)

    const central = new Uint8Array(46 + nameBytes.length)

    writeUint32(central, 0, 0x02014b50)
    writeUint16(central, 4, 20)
    writeUint16(central, 6, 20)
    writeUint16(central, 8, 0x0800)
    writeUint16(central, 10, 0)
    writeUint16(central, 12, stamp.time)
    writeUint16(central, 14, stamp.date)
    writeUint32(central, 16, crc)
    writeUint32(central, 20, dataBytes.length)
    writeUint32(central, 24, dataBytes.length)
    writeUint16(central, 28, nameBytes.length)
    writeUint16(central, 38, 0)
    writeUint32(central, 42, offset)
    central.set(nameBytes, 46)
    centralParts.push(central)

    offset += local.length + dataBytes.length
  })

  const centralDirectory = concatBytes(centralParts)
  const end = new Uint8Array(22)

  writeUint32(end, 0, 0x06054b50)
  writeUint16(end, 8, files.length)
  writeUint16(end, 10, files.length)
  writeUint32(end, 12, centralDirectory.length)
  writeUint32(end, 16, offset)

  return concatBytes([...localParts, centralDirectory, end]).buffer
}

function columnName(index) {
  let value = index
  let name = ''

  while (value > 0) {
    const code = (value - 1) % 26
    name = String.fromCharCode(65 + code) + name
    value = Math.floor((value - 1) / 26)
  }

  return name
}

function xlsxText(value, style) {
  return {
    type: 'text',
    value: value == null ? '' : value,
    style: style || 0
  }
}

function xlsxNumber(value, style) {
  return {
    type: 'number',
    value: Number(value) || 0,
    style: style || 0
  }
}

function xlsxOptionalNumber(value, style) {
  if (value == null || value === '') {
    return xlsxText('')
  }

  const number = Number(value)
  return Number.isNaN(number) ? xlsxText('') : xlsxNumber(number, style)
}

function xlsxRow(values) {
  return values
}

function xlsxCellXml(cell, rowIndex, colIndex) {
  const ref = `${columnName(colIndex)}${rowIndex}`
  const style = cell.style ? ` s="${cell.style}"` : ''

  if (cell.type === 'number') {
    return `<c r="${ref}"${style}><v>${Number(cell.value || 0).toFixed(2)}</v></c>`
  }

  return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXml(cell.value)}</t></is></c>`
}

function xlsxWorksheetXml(sheet) {
  const cols = (sheet.columns || []).map((width, index) => {
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  }).join('')
  const rows = (sheet.rows || []).map((cells, rowIndex) => {
    const rowNumber = rowIndex + 1
    const values = cells.map((cell, colIndex) => xlsxCellXml(cell, rowNumber, colIndex + 1)).join('')

    return `<row r="${rowNumber}">${values}</row>`
  }).join('')
  const merges = (sheet.merges || []).length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${cols}</cols>
  <sheetData>${rows}</sheetData>
  ${merges}
</worksheet>`
}

function buildSummarySheet(invoices) {
  const stats = getInvoiceStats(invoices)
  const rows = [
    xlsxRow([xlsxText('发票报销汇总表', 1)]),
    xlsxRow([
      xlsxText(`生成时间：${buildGeneratedAt()}`),
      xlsxText(`票据数量：${stats.totalCount}`),
      xlsxText(`总金额：${stats.totalAmountText}`)
    ]),
    xlsxRow([xlsxText('费用科目', 2), xlsxText('数量', 2), xlsxText('金额小计', 2)])
  ]

  stats.categoryRows.forEach((item) => {
    rows.push(xlsxRow([xlsxText(item.name), xlsxNumber(item.count), xlsxNumber(item.amount, 3)]))
  })

  rows.push(xlsxRow([xlsxText('总计', 4), xlsxNumber(stats.totalCount, 4), xlsxNumber(stats.totalAmount, 5)]))

  return {
    name: '汇总表',
    columns: [18, 10, 16],
    rows,
    merges: ['A1:C1']
  }
}

function buildDetailSheet(name, invoices, title) {
  const rows = [
    xlsxRow([xlsxText(title || '发票报销明细表', 1)]),
    xlsxRow([
      xlsxText('序号', 2),
      xlsxText('发票日期', 2),
      xlsxText('发票号码', 2),
      xlsxText('收支项目', 2),
      xlsxText('收支项目明细', 2),
      xlsxText('供应商', 2),
      xlsxText('购买方/人员', 2),
      xlsxText('购买方税号', 2),
      xlsxText('发票类型', 2),
      xlsxText('含税金额', 2),
      xlsxText('税额', 2),
      xlsxText('不含税金额', 2),
      xlsxText('承担部门', 2),
      xlsxText('承担部门负责人', 2),
      xlsxText('承担金额', 2),
      xlsxText('备注', 2),
      xlsxText('归档路径', 2)
    ])
  ]

  ;(invoices || []).forEach((item, index) => {
    rows.push(xlsxRow([
      xlsxNumber(index + 1),
      xlsxText(item.date),
      xlsxText(item.invoiceNo),
      xlsxText(item.categoryName),
      xlsxText(item.expenseItem || item.remark || ''),
      xlsxText(item.merchant || item.platform),
      xlsxText(resolveBuyerDisplayName(item)),
      xlsxText(item.buyerTaxNo || item.purchaserTaxNo || ''),
      xlsxText(item.invoiceType),
      xlsxNumber(item.amount, 3),
      xlsxOptionalNumber(item.taxAmount, 3),
      xlsxOptionalNumber(item.pretaxAmount, 3),
      xlsxText(item.department),
      xlsxText(item.departmentOwner),
      xlsxOptionalNumber(item.allocatedAmount, 3),
      xlsxText(item.remark),
      xlsxText(item.archivePath || item.filePath)
    ]))
  })

  return {
    name,
    columns: [6, 14, 18, 14, 24, 18, 18, 22, 16, 14, 12, 14, 16, 16, 14, 28, 36],
    rows,
    merges: ['A1:Q1']
  }
}

function buildReportSheets(invoices, options) {
  const mode = getReportMode(options && options.mode)
  const sortedInvoices = getReportInvoices(invoices, mode.id)

  if (mode.id === 'summary') {
    return [buildSummarySheet(sortedInvoices)]
  }

  if (mode.id === 'detail') {
    return [buildDetailSheet('明细表', sortedInvoices, '发票报销明细表')]
  }

  const categories = mode.id === 'lodgingMeal'
    ? CATEGORIES.filter((item) => ['lodging', 'meal'].indexOf(item.id) >= 0)
    : CATEGORIES

  return categories.map((category) => {
    const rows = sortInvoicesByType(sortedInvoices.filter((item) => item.categoryId === category.id))

    return buildDetailSheet(category.name, rows, `${category.name}明细表`)
  })
}

function xlsxWorkbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets.map((sheet, index) => `<sheet name="${escapeXml(sanitizeSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets>
</workbook>`
}

function xlsxWorkbookRelsXml(sheets) {
  const sheetRels = sheets.map((sheet, index) => {
    return `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function xlsxContentTypesXml(sheets) {
  const sheetTypes = sheets.map((sheet, index) => {
    return `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheetTypes}
</Types>`
}

function xlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;¥&quot;#,##0.00"/></numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Microsoft YaHei"/></font>
    <font><b/><sz val="11"/><name val="Microsoft YaHei"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Microsoft YaHei"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF155E75"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
}

function buildXlsxWorkbook(invoices, options) {
  const sheets = buildReportSheets(invoices, options)
  const files = [
    {
      name: '[Content_Types].xml',
      data: xlsxContentTypesXml(sheets)
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'
    },
    {
      name: 'docProps/core.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>发票报销表</dc:title><dc:creator>报销帮帮</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`
    },
    {
      name: 'docProps/app.xml',
      data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>报销帮帮</Application></Properties>'
    },
    {
      name: 'xl/workbook.xml',
      data: xlsxWorkbookXml(sheets)
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: xlsxWorkbookRelsXml(sheets)
    },
    {
      name: 'xl/styles.xml',
      data: xlsxStylesXml()
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: xlsxWorksheetXml(sheet)
    }))
  ]

  return createZip(files)
}

function padNumber(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function buildReportFileName(options, date) {
  const value = date || new Date()
  const year = value.getFullYear()
  const month = padNumber(value.getMonth() + 1)
  const day = padNumber(value.getDate())
  const hour = padNumber(value.getHours())
  const minute = padNumber(value.getMinutes())

  const mode = getReportMode(options && options.mode)

  return `invoice-report-${mode.id}-${year}${month}${day}-${hour}${minute}.xlsx`
}

function writeReportFile(invoices, options) {
  return new Promise((resolve, reject) => {
    const mode = getReportMode(options && options.mode)
    const fileName = buildReportFileName({ mode: mode.id })
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    wx.getFileSystemManager().writeFile({
      filePath,
      data: buildXlsxWorkbook(invoices, { mode: mode.id }),
      success() {
        resolve({
          fileName,
          filePath,
          modeId: mode.id,
          modeName: mode.name
        })
      },
      fail(error) {
        reject(error)
      }
    })
  })
}

module.exports = {
  CATEGORIES,
  REPORT_MODES,
  buildExcelWorkbook,
  buildXlsxWorkbook,
  buildReportFileName,
  getReportInvoices,
  sortInvoicesByType,
  createZip,
  writeReportFile
}
