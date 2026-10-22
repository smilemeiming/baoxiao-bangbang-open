const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const localConfig = path.join(root, 'config.local.js')

if (!fs.existsSync(localConfig)) {
  fs.copyFileSync(path.join(root, 'config.example.js'), localConfig, fs.constants.COPYFILE_EXCL)
  console.log('Created config.local.js; cloud OCR is disabled until you set cloudEnvId.')
} else {
  console.log('Kept existing config.local.js.')
}
