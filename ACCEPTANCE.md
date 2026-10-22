# 验收说明

运行 `npm ci`、`npm run setup`、`npm run verify`、`npm run prepare:release`。

| 范围 | 自动验证证据 |
| --- | --- |
| 页面配置、格式、分类、辅助单据过滤、归档、历史配对、Excel 结构 | `scripts/verify.js` |
| 模拟云 OCR 成功、失败、异步轮询与结果归一化 | `scripts/verify.js`；使用模拟接口及本机 HTTP 测试服务 |
| 示例加载、字段修正、批量删除恢复、报表与分享 | `scripts/verify-flow.js`；模拟微信接口 |
| 配置初始化不覆盖、空配置不上传、公开文件范围和标识检查 | `scripts/verify-release.js` |
| 干净目录可初始化并通过相同验证 | `scripts/prepare-release.js`；成功才写入发布清单 |

这些检查不调用真实 OCR，不证明线上权限、手机排版或部署环境可用。

手动验收需要在自己的微信环境中完成：载入虚构示例、编辑字段和核对分类；用 Excel 或兼容软件打开各类导出报表；用测试 JPG、PNG、PDF 验证 OCR、原件预览与命名；测试批量删除恢复及手机分享。

非航空行程单应被拒绝，航空运输电子客票行程单应被接受。示例没有原件，不能用示例证明预览和命名有效。

发布前真机、OCR、访问规则和素材授权检查见 `docs/RELEASING.md`。
