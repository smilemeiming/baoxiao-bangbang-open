const fs = require('fs')
const path = require('path')
const root = path.resolve(__dirname, '..')
const models = path.join(root, 'resources', 'tessdata')
fs.mkdirSync(models, { recursive: true })
for (const lang of ['eng', 'chi_sim']) {
  const dir = path.join(root, 'node_modules', '@tesseract.js-data', lang)
  const candidates = ['4.0.0_best_int', '4.0.0'].map((version) => path.join(dir, version, `${lang}.traineddata.gz`))
  const source = candidates.find((file) => fs.existsSync(file))
  if (!source) throw new Error(`Missing bundled OCR language: ${lang}; inspect ${dir}`)
  fs.copyFileSync(source, path.join(models, `${lang}.traineddata.gz`))
}
const pdf = path.join(root, 'node_modules', 'pdfjs-dist')
const target = path.join(root, 'ui', 'vendor')
fs.mkdirSync(target, { recursive: true })
for (const file of ['pdf.mjs', 'pdf.worker.mjs']) fs.copyFileSync(path.join(pdf, 'build', file), path.join(target, file))
for (const dir of ['cmaps', 'standard_fonts', 'wasm']) {
  if (fs.existsSync(path.join(pdf, dir))) fs.cpSync(path.join(pdf, dir), path.join(target, dir), { recursive: true })
}
const notices = [fs.readFileSync(path.join(root, '..', 'LICENSE'), 'utf8')]
function collectLicenses(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) collectLicenses(file)
      else {
        for (const name of fs.readdirSync(file).filter((name) => /^(license|copying|notice)(\.|$)/i.test(name))) {
          const license = path.join(file, name)
          if (fs.statSync(license).isFile()) notices.push(`\n\n--- ${path.relative(root, license)} ---\n${fs.readFileSync(license, 'utf8')}`)
        }
      }
    }
  }
}
collectLicenses(path.join(root, 'node_modules'))
fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n'))
console.log('Bundled Chinese/English OCR models, PDF viewer and dependency notices.')
