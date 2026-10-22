# 发布候选版本

运行 `npm ci`、`npm run setup`、`npm run prepare:release`。

发布命令先验证工作目录，再按 `scripts/prepare-release.js` 的文件范围复制到新的 `release/baoxiao-bangbang-*` 目录。在副本中执行初始化、核心验证、模拟页面流程和发布检查；成功后生成含文件大小和 SHA-256 的 `RELEASE_MANIFEST.json`。

候选目录不包含原 Git 历史、`rea`、原始票据图片、个人教程、维护笔记、私有配置或已安装依赖。AppID 重置为 `touristappid`，验证生成的 `config.local.js` 随后移除，由下载者初始化。

请使用候选目录创建**全新的 Git 仓库**，不要直接推送原工作目录。忽略规则不会清除已跟踪内容或旧历史；旧仓库包含原始票据样例。脚本不会登录 GitHub、创建远程仓库或推送代码。

## Windows 程序包

桌面程序包从完整源码仓库构建，不使用上面的源码候选目录：在 `desktop/` 执行 `npm ci`、`npm test` 和 `npm run dist`。发布前确认 `desktop/dist/BaoxiaoBangbang-版本号-win-x64.zip` 存在，并对照同目录的 SHA-256 校验值；把 ZIP、校验值和版本说明作为 GitHub Release 附件。仅上传源码 ZIP 不会提供可直接运行的 Windows 程序。

检查只拦截部分常见令牌、AppID、云环境标识和个人路径，不是完整秘密扫描或素材法律审计。发布前应检查候选清单，并确认图标及其他素材有公开分发授权。

本地原 AppID 配置备份在 `.local/project.config.json`，现用云环境配置保存在 `config.local.js`；均不进入发布目录。继续使用原部署时可参照备份恢复 AppID，发布脚本仍会输出公共 AppID。

以下验收需要自己的微信环境，不能由终端模拟替代：

- 手机页面排版、拍照与文件选择授权。
- 真实 JPG、PNG、PDF OCR，失败提示和字段核对。
- 原件预览、命名、编辑、删除恢复及手机分享。
- Excel 或兼容软件打开导出文件。
- 云存储访问规则、数据保留、调用权限与费用设置。

建议首个公开版本标记为预览版，在发布说明中列出尚未完成的真机/OCR 验收项，截图使用虚构数据。
