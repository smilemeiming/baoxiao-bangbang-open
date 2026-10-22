# 报销帮帮：每个文件的用途

这份说明覆盖项目自行维护、准备对外分发的全部源文件、配置、页面、图片和文档。第三方依赖内部成千上万的文件不逐个展开，自动生成目录和 Windows 程序配套文件在文末单独说明。

**普通使用者不需要改源码。** 获取 Windows 完整程序包、全部解压、运行 `BaoxiaoBangbang.exe` 即可。想知道怎样导入、核对和导出，请先看 [使用手册](USER_GUIDE.md)。

表格中的文件名可以点击打开。路径从项目根目录开始计算；“根目录”就是包含 `README.md`、`desktop/`、`pages/` 的那个文件夹。

## 一、先看懂项目结构

```text
报销帮帮/
├─ README.md                  项目介绍和使用入口
├─ desktop/                   Windows 应用
│  ├─ main.js、preload.js      程序入口与界面通信
│  ├─ lib/                    本地发票库与离线识别
│  ├─ ui/                     窗口、交互和样式
│  ├─ scripts/、test/          资源准备与验证
│  └─ dist/                   构建后生成的程序包
├─ app.js、app.json、app.wxss  微信小程序入口、配置和全局样式
├─ pages/                     微信小程序的七个页面
├─ utils/                     分类、归档、识别和报表等规则
├─ cloudfunctions/invoice-ocr/ 小程序使用的云端 OCR
├─ assets/                    小程序图标
├─ docs/                      使用、部署和维护资料
├─ scripts/                   初始化、验证和源码发布准备
└─ .github/                   自动检查与协作模板
```

Windows 程序的工作关系是：界面接收文件 → 本地归档 → PDF 文字读取或本机 OCR → 提取字段 → 人工核对 → 保存 → 导出。小程序则使用自己的页面、本地存储和云识别流程；两者复用部分分类、字段解析和 Excel 模块，不会自动同步发票库。

## 二、根目录文件

| 文件 | 用途 |
| --- | --- |
| [README.md](../README.md) | 项目首页；介绍功能、版本区别、下载和快速使用步骤 |
| [LICENSE](../LICENSE) | MIT 许可证，规定使用、修改和再分发时的许可条件 |
| [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) | 第三方依赖与素材许可的说明入口 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 参与开发、提交修改和反馈问题的约定 |
| [SECURITY.md](../SECURITY.md) | 安全问题反馈、敏感数据与配置的处理要求 |
| [ACCEPTANCE.md](../ACCEPTANCE.md) | 小程序功能验收项目及自动验证的边界 |
| [.gitignore](../.gitignore) | 告诉 Git 哪些本地配置、依赖和构建结果不应新增提交；不能清除已提交的旧历史 |
| [package.json](../package.json) | 根项目名称、脚本和依赖声明；提供初始化、验证及源码发布准备命令 |
| [package-lock.json](../package-lock.json) | 固定根项目依赖解析结果，便于一致安装 |
| [app.js](../app.js) | 微信小程序启动逻辑；读取本地配置并初始化存储和可用云服务 |
| [app.json](../app.json) | 小程序页面、窗口和底部导航配置 |
| [app.wxss](../app.wxss) | 小程序全局颜色、布局和通用样式 |
| [config.example.js](../config.example.js) | 可公开的空配置模板；初始化时据此生成个人配置 |
| [project.config.json](../project.config.json) | 微信开发者工具项目配置；公开版使用 `touristappid` |
| [sitemap.json](../sitemap.json) | 微信小程序页面搜索收录配置 |

源码发布候选目录还会生成 `RELEASE_MANIFEST.json`，记录实际发布文件的大小和 SHA-256。它是清单，不是应用数据，也不是 Windows 安装程序；原工作目录中不一定存在。

## 三、Windows 桌面版文件

| 文件 | 用途 |
| --- | --- |
| [desktop/README.md](../desktop/README.md) | Windows 程序概述、源码运行及构建步骤 |
| [desktop/TESTING.md](../desktop/TESTING.md) | 桌面测试范围、虚构样例和实际运行验证方法 |
| [desktop/package.json](../desktop/package.json) | 应用版本、Electron 入口、依赖、启动与 Windows ZIP 打包配置 |
| [desktop/package-lock.json](../desktop/package-lock.json) | 固定桌面版依赖版本和下载校验信息 |
| [desktop/main.js](../desktop/main.js) | Windows 应用主入口；创建窗口、文件选择、读写、导出、备份和恢复 |
| [desktop/preload.js](../desktop/preload.js) | 向界面提供受限操作接口，让界面通过指定通道调用本机功能 |
| [desktop/lib/library.js](../desktop/lib/library.js) | 发票库、原件复制、内容去重、PDF 逐页续处理、字段修改、核对状态、删除撤销、报销批次、资料包导出与损坏库旁路恢复 |
| [desktop/lib/ocr.js](../desktop/lib/ocr.js) | 装载本地 Tesseract 模型并运行图片文字识别 |
| [desktop/ui/index.html](../desktop/ui/index.html) | 窗口页面结构，包括导航、发票列表、核对窗口与报表操作区 |
| [desktop/ui/app.js](../desktop/ui/app.js) | 界面交互、拖放、PDF 续处理、预览、疑似重复提醒、搜索、批次管理及导出范围预览 |
| [desktop/ui/style.css](../desktop/ui/style.css) | Windows 界面的颜色、排版、布局和控件样式 |
| [desktop/scripts/prepare-assets.js](../desktop/scripts/prepare-assets.js) | 从已安装依赖准备本地识别模型、PDF 引擎和第三方许可资料 |
| [desktop/scripts/write-checksum.js](../desktop/scripts/write-checksum.js) | 为生成的 Windows ZIP 写出 SHA-256 校验值文件 |
| [desktop/scripts/smoke-runner.js](../desktop/scripts/smoke-runner.js) | 维护者使用虚构文件验证真实界面、识别、预览和报表的诊断脚本；正常启动不运行诊断 |
| [desktop/test/library.test.js](../desktop/test/library.test.js) | 验证存储、去重、核对状态、字段、删除恢复、损坏库恢复、报表、批次与备份等核心行为 |

桌面版复用 `utils/categories.js`、`utils/invoice-store.js`、`utils/report.js` 和 `cloudfunctions/invoice-ocr/normalizer.js`。因此开发者不能只下载 `desktop/` 子目录。打包时会将必需模块复制进程序，无需使用者再补源码。

## 四、微信小程序页面文件

每个页面有四种文件：`.js` 管操作逻辑，`.wxml` 管页面结构，`.wxss` 管页面样式，`.json` 管该页配置。下面逐个列出，避免把四种文件误认为四个独立程序。

| 文件 | 用途 |
| --- | --- |
| [pages/index/index.js](../pages/index/index.js) | “识别”页逻辑，拍照、选择文件及最近记录操作 |
| [pages/index/index.wxml](../pages/index/index.wxml) | “识别”页的上传入口和记录结构 |
| [pages/index/index.wxss](../pages/index/index.wxss) | “识别”页布局和样式 |
| [pages/index/index.json](../pages/index/index.json) | “识别”页配置 |
| [pages/upload/upload.js](../pages/upload/upload.js) | “总览”页逻辑，导入结果、分类概览和虚构示例入口 |
| [pages/upload/upload.wxml](../pages/upload/upload.wxml) | “总览”页内容结构 |
| [pages/upload/upload.wxss](../pages/upload/upload.wxss) | “总览”页样式 |
| [pages/upload/upload.json](../pages/upload/upload.json) | “总览”页配置 |
| [pages/invoices/invoices.js](../pages/invoices/invoices.js) | 发票库的查看、筛选、选择及批量管理 |
| [pages/invoices/invoices.wxml](../pages/invoices/invoices.wxml) | 发票库列表和操作区结构 |
| [pages/invoices/invoices.wxss](../pages/invoices/invoices.wxss) | 发票库列表样式 |
| [pages/invoices/invoices.json](../pages/invoices/invoices.json) | 发票库页配置 |
| [pages/invoice-detail/invoice-detail.js](../pages/invoice-detail/invoice-detail.js) | 详情读取、字段编辑、保存和重新识别 |
| [pages/invoice-detail/invoice-detail.wxml](../pages/invoice-detail/invoice-detail.wxml) | 发票详情与编辑表单结构 |
| [pages/invoice-detail/invoice-detail.wxss](../pages/invoice-detail/invoice-detail.wxss) | 发票详情页样式 |
| [pages/invoice-detail/invoice-detail.json](../pages/invoice-detail/invoice-detail.json) | 发票详情页配置 |
| [pages/original-preview/original-preview.js](../pages/original-preview/original-preview.js) | 调用归档原件的读取和预览 |
| [pages/original-preview/original-preview.wxml](../pages/original-preview/original-preview.wxml) | 原件预览页结构 |
| [pages/original-preview/original-preview.wxss](../pages/original-preview/original-preview.wxss) | 原件预览页样式 |
| [pages/original-preview/original-preview.json](../pages/original-preview/original-preview.json) | 原件预览页配置 |
| [pages/rename/rename.js](../pages/rename/rename.js) | 规范文件名生成与原件命名操作 |
| [pages/rename/rename.wxml](../pages/rename/rename.wxml) | 命名页面的输入和结果结构 |
| [pages/rename/rename.wxss](../pages/rename/rename.wxss) | 命名页面样式 |
| [pages/rename/rename.json](../pages/rename/rename.json) | 命名页面配置 |
| [pages/report/report.js](../pages/report/report.js) | 报表类型选择、Excel 生成、预览和分享 |
| [pages/report/report.wxml](../pages/report/report.wxml) | 报表页面选项和操作区结构 |
| [pages/report/report.wxss](../pages/report/report.wxss) | 报表页面样式 |
| [pages/report/report.json](../pages/report/report.json) | 报表页面配置 |

## 五、业务工具文件

| 文件 | 用途 |
| --- | --- |
| [utils/categories.js](../utils/categories.js) | 费用类别、显示信息及分类关键词 |
| [utils/device.js](../utils/device.js) | 判断小程序是否运行在桌面微信环境，便于选择兼容操作 |
| [utils/format-time.js](../utils/format-time.js) | 将时间整理为统一显示格式 |
| [utils/file-archive.js](../utils/file-archive.js) | 小程序原件归档目录、复制和文件处理 |
| [utils/invoice-import.js](../utils/invoice-import.js) | 串联小程序识别、辅助单据过滤、归档、历史配对和本地保存 |
| [utils/invoice-recognition.js](../utils/invoice-recognition.js) | 小程序文件识别、云函数调用、结果处理和错误提示；失败不将文件名金额当作识别结果 |
| [utils/invoice-rename.js](../utils/invoice-rename.js) | 小程序规范命名规则和重命名相关操作 |
| [utils/invoice-store.js](../utils/invoice-store.js) | 发票字段整理、分类和统计，以及小程序本地存储；部分纯业务函数也供桌面版使用 |
| [utils/invoice-validation.js](../utils/invoice-validation.js) | 小程序辅助单据过滤，区分航空行程单与不接受的行程单、账单等 |
| [utils/mock-data.js](../utils/mock-data.js) | 人工编造的示例记录，用于小程序体验和验证，不含真实原件 |
| [utils/pairing.js](../utils/pairing.js) | 历史打车票据配对规则；保留代码不代表当前支持新增打车行程单导入 |
| [utils/report.js](../utils/report.js) | 报表模式、排序、工作表和真实 `.xlsx` 文件生成，两版共用 |
| [utils/share.js](../utils/share.js) | 小程序文件预览、分享等兼容处理 |

## 六、小程序云识别文件

这些文件服务于微信小程序。**Windows 版不会为了识别调用此云函数**；桌面版只复用其中的纯字段解析模块。

| 文件 | 用途 |
| --- | --- |
| [cloudfunctions/invoice-ocr/README.md](../cloudfunctions/invoice-ocr/README.md) | 云函数部署、OCR 提供方和环境变量说明 |
| [cloudfunctions/invoice-ocr/index.js](../cloudfunctions/invoice-ocr/index.js) | 云函数入口，获取文件并调用所配置的识别服务 |
| [cloudfunctions/invoice-ocr/normalizer.js](../cloudfunctions/invoice-ocr/normalizer.js) | 将识别文字和表格整理为金额、日期、票号、购销方等统一字段 |
| [cloudfunctions/invoice-ocr/paddleocr-client.js](../cloudfunctions/invoice-ocr/paddleocr-client.js) | PaddleOCR 接口请求和响应适配 |
| [cloudfunctions/invoice-ocr/package.json](../cloudfunctions/invoice-ocr/package.json) | 云函数依赖与运行入口声明 |
| [cloudfunctions/invoice-ocr/package-lock.json](../cloudfunctions/invoice-ocr/package-lock.json) | 云函数依赖锁定信息 |
| [cloudfunctions/invoice-ocr/.env.example](../cloudfunctions/invoice-ocr/.env.example) | 环境变量名称和填写格式示例；文件本身不会自动加载为线上配置 |

真实令牌只应放入自己的云端环境配置，不要写进前端、截图或公开仓库。部署者还需决定云端票据的保留和清理方式。

## 七、图片与界面截图

| 文件 | 用途 |
| --- | --- |
| [assets/actions/camera-blue.png](../assets/actions/camera-blue.png) | 小程序拍照入口图标 |
| [assets/actions/file-upload-green.png](../assets/actions/file-upload-green.png) | 小程序文件上传入口图标 |
| [assets/tabbar/overview-normal.png](../assets/tabbar/overview-normal.png) | “识别”导航未选中图标；文件名沿用早期命名 |
| [assets/tabbar/overview-active.png](../assets/tabbar/overview-active.png) | “识别”导航选中图标 |
| [assets/tabbar/upload-normal.png](../assets/tabbar/upload-normal.png) | “总览”导航未选中图标 |
| [assets/tabbar/upload-active.png](../assets/tabbar/upload-active.png) | “总览”导航选中图标 |
| [assets/tabbar/invoices-normal.png](../assets/tabbar/invoices-normal.png) | “发票库”导航未选中图标 |
| [assets/tabbar/invoices-active.png](../assets/tabbar/invoices-active.png) | “发票库”导航选中图标 |
| [assets/tabbar/report-normal.png](../assets/tabbar/report-normal.png) | “报表”导航未选中图标 |
| [assets/tabbar/report-active.png](../assets/tabbar/report-active.png) | “报表”导航选中图标 |
| [docs/images/desktop-library.png](images/desktop-library.png) | Windows 主界面实测截图，使用虚构票据 |
| [docs/images/desktop-detail.png](images/desktop-detail.png) | Windows 核对窗口实测截图，使用虚构票据 |

## 八、文档、脚本和 GitHub 文件

| 文件 | 用途 |
| --- | --- |
| [docs/USER_GUIDE.md](USER_GUIDE.md) | 面向使用者的下载、操作、导出、备份及故障排查手册 |
| [docs/FILE_GUIDE.md](FILE_GUIDE.md) | 当前这份逐文件用途说明 |
| [docs/DEPLOYMENT.md](DEPLOYMENT.md) | 小程序初始化、AppID、云环境与 OCR 部署步骤 |
| [docs/ARCHITECTURE.md](ARCHITECTURE.md) | 主要说明小程序数据流、模块关系和实现边界 |
| [docs/SAMPLE_DATA.md](SAMPLE_DATA.md) | 虚构示例的用途和不能验证的场景 |
| [docs/RELEASING.md](RELEASING.md) | 从原工作目录导出可审阅源码副本的步骤和注意事项 |
| [docs/PRE_RELEASE_REPORT.md](PRE_RELEASE_REPORT.md) | 最初小程序源码发布准备阶段的历史检查记录 |
| [scripts/setup.js](../scripts/setup.js) | 缺少个人配置时从模板创建，不覆盖已有配置 |
| [scripts/verify.js](../scripts/verify.js) | 检查核心业务规则、字段及报表等行为 |
| [scripts/verify-flow.js](../scripts/verify-flow.js) | 在模拟微信环境检查页面间操作流程 |
| [scripts/verify-release.js](../scripts/verify-release.js) | 检查公开文件范围、个人配置隔离及失败行为等 |
| [scripts/prepare-release.js](../scripts/prepare-release.js) | 按明确范围复制公开源码，在干净副本中验证并生成清单；不会推送旧 Git 历史 |
| [.github/workflows/verify.yml](../.github/workflows/verify.yml) | GitHub 上的小程序自动验证配置 |
| [.github/workflows/desktop.yml](../.github/workflows/desktop.yml) | Windows 桌面测试与构建流程配置；工作流产物不等于 Release 附件 |
| [.github/ISSUE_TEMPLATE/bug_report.md](../.github/ISSUE_TEMPLATE/bug_report.md) | 缺陷反馈模板，帮助收集复现步骤 |
| [.github/ISSUE_TEMPLATE/feature_request.md](../.github/ISSUE_TEMPLATE/feature_request.md) | 功能建议模板 |
| [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) | 代码修改说明模板 |

当前仓库的 GitHub Actions 尚未启用。存在工作流文件不代表自动构建已经执行，也不代表外部使用者已有可下载程序。

## 九、构建后出现的目录和文件

这些内容由安装或构建生成，一般不随源码提交。源码 ZIP 中没有它们是正常的。

| 路径 | 用途及处理方式 |
| --- | --- |
| `node_modules/` | 根目录安装的第三方依赖；由包管理器维护 |
| `cloudfunctions/invoice-ocr/node_modules/` | 云函数安装的依赖 |
| `desktop/node_modules/` | Electron、OCR、PDF 和构建工具等桌面依赖 |
| `desktop/resources/tessdata/eng.traineddata.gz` | 随包提供的英文识别模型 |
| `desktop/resources/tessdata/chi_sim.traineddata.gz` | 随包提供的简体中文识别模型 |
| `desktop/ui/vendor/pdf.mjs` | 本地 PDF 引擎 |
| `desktop/ui/vendor/pdf.worker.mjs` | PDF 后台处理文件 |
| `desktop/ui/vendor/cmaps/` | PDF 字符映射资料 |
| `desktop/ui/vendor/standard_fonts/` | PDF 标准字体资源 |
| `desktop/ui/vendor/wasm/` | PDF 图像等功能使用的运行模块 |
| `desktop/THIRD_PARTY_NOTICES.txt` | 构建时整理的依赖和模型许可，随 Windows 程序分发 |
| `desktop/dist/win-unpacked/` | 构建出的完整 Windows 应用目录，可用于验证 |
| `desktop/dist/BaoxiaoBangbang-0.1.1-win-x64.zip` | 可分发的完整 Windows 0.1.1 程序包 |
| `desktop/dist/BaoxiaoBangbang-0.1.1-win-x64.zip.sha256` | 本次程序 ZIP 的校验值文件 |
| `desktop/dist/` 中的其他构建记录 | 打包工具生成的配置和记录，普通使用者无需编辑 |
| `release/baoxiao-bangbang-*/` | 验证后的源码发布候选目录，包含 `RELEASE_MANIFEST.json`；不是 Windows 程序包 |
| `miniprogram_npm/` | 微信开发者工具在需要时生成的小程序依赖目录 |

### Windows 完整包中的文件

这里说明当前包中顶层运行文件和资源目录。程序依赖内的第三方文件按目录说明；使用者应完整保留，无需逐个打开或选择复制。

| 文件或目录 | 用途 |
| --- | --- |
| `BaoxiaoBangbang.exe` | 双击启动报销帮帮 |
| `chrome_100_percent.pak`、`chrome_200_percent.pak` | 窗口界面所需的运行资源 |
| `resources.pak` | 浏览器内核界面资源 |
| `icudtl.dat` | 字符、语言与区域处理数据 |
| `snapshot_blob.bin`、`v8_context_snapshot.bin` | JavaScript 运行环境启动数据 |
| `d3dcompiler_47.dll`、`dxcompiler.dll` | Windows 图形与着色器处理组件 |
| `vk_swiftshader.dll`、`vk_swiftshader_icd.json`、`vulkan-1.dll` | 图形渲染配套组件 |
| `ffmpeg.dll` | 运行环境附带的媒体组件 |
| `electron_wer.dll` | Electron 的 Windows 错误报告配套组件 |
| `locales/` | 窗口运行环境的语言资源 |
| `version` | 随包运行环境版本信息 |
| `LICENSE.electron.txt`、`LICENSES.chromium.html` | Electron、Chromium 等第三方许可文本 |
| `resources/app/` | 已打包的应用代码、界面、OCR 模型、PDF 资源和依赖 |
| `resources/shared/` | 随包复制的分类、字段解析及报表等共享模块 |
| `resources/LICENSE` | 本项目 MIT 许可证 |
| `resources/default_app.asar` | Electron 随附资源；普通使用者无需操作 |

这里的 `resources/` 是**程序资源目录**，不是自己的票据库。实际数据位置请在应用中点击“打开数据文件夹 ↗”。

## 十、个人配置和不对外分发的材料

以下可能出现在维护者的原工作目录，但不属于公开源码包的使用步骤；下载者不应索取维护者的真实配置或票据。

| 文件或目录 | 说明 |
| --- | --- |
| `config.local.js` | 自己的小程序云环境配置，由 `npm run setup` 创建；不提交公开仓库 |
| `project.private.config.json` | 微信开发者工具本机设置；不作为他人的通用配置 |
| `.env`、`.env.*`（示例除外） | 私有环境配置，不对外分发 |
| `.local/` | 本机备份、虚构测试产物和交付记录等；不是程序运行所需公开源码 |
| `.git/` | 原工作目录 Git 历史，可能保留旧文件；不能当作干净发布包直接转发 |
| `.agents/`、`.claude/`、`.codex/` | 本地开发工具设置或说明，普通使用者不需要 |
| `sample-invoices/` | 原工作目录的票据材料，不作为公开示例分发 |
| `scripts/generate-sample-invoices.py` | 本地样例生成脚本，不进入公开源码范围，也不属于使用教程 |
| `rea/` | 独立的其他项目，不属于报销帮帮 |
| `小程序开发维护手册.md` | 原工作目录中的维护资料，不是公开版使用入口 |
| `AI开发小程序免费指南.md` | 本地学习资料，不随公开源码分发 |
| `AI驱动的小程序开发实战教程.md` | 本地学习资料，不随公开源码分发 |

**分享程序**时发送完整 Windows ZIP；**迁移票据**时使用应用的备份与恢复；**参与开发**时获取完整公开源码。这三种文件用途不同，备份还包含自己的票据内容。

[返回项目介绍](../README.md) · [阅读使用手册](USER_GUIDE.md)
