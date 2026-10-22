# 部署指南

## 本地体验

需要 Node.js 22 或更高版本及微信开发者工具。在项目目录运行：

```sh
npm ci
npm run setup
npm run verify
```

导入项目，在“总览”载入虚构示例，无需云环境。示例会加入当前发票库，建议使用独立测试环境；示例没有图片或 PDF 原件，不能验证原件预览或命名。

`setup` 只在缺少文件时创建 `config.local.js`，不会覆盖已有配置。该文件被 Git 忽略，但需要随小程序编译；不能在其中存储密钥。

## 真实识别

1. 在开发者工具使用自己的小程序 AppID，修改 `project.config.json` 中的 `appid`。
2. 开通自己的微信云开发环境，在 `config.local.js` 的 `cloudEnvId` 中填写环境 ID。
3. 右键 `cloudfunctions/invoice-ocr`，选择“上传并部署：云端安装依赖”。
4. 在云函数控制台配置 `OCR_PROVIDER=paddleocr`、`PADDLEOCR_API_URL` 和 `PADDLEOCR_ACCESS_TOKEN`。地址必须是接口地址，令牌只放云函数环境变量。
5. 云函数超时设置为 60 秒，保存环境变量后重新部署或重启。
6. 重新编译，用小图片验证，再测试 JPG、PNG、PDF、字段修正和原件预览。

`.env.example` 只是参考，本项目不自动读取 `.env`。更多异步接口、超时和腾讯云配置见 [云函数说明](../cloudfunctions/invoice-ocr/README.md)。发布命令会将副本 AppID 重置为 `touristappid`，并排除个人配置。

## 数据管理

启用云环境后的链路：设备 → 微信云存储 → 云函数 → OCR 服务。记录和归档原件保存在设备。上传的云文件目前没有自动清理机制；本地删除不会删除云端或 OCR 提供方的数据。

部署者需要配置云存储访问规则、云函数调用权限、费用额度、数据保留策略，并核对 OCR 服务的数据处理方式。项目不提供共享 OCR 额度。

## 排查

- 找不到 `config.local`：先运行 `npm run setup`，再重新编译。
- 无法识别：检查 `cloudEnvId`、云函数部署环境和 OCR 环境变量。
- 超时：先测试小图片，再检查 OCR 服务、云函数超时及异步配置。
- 示例打不开原件：示例只包含字段。
- 行程单被拒绝：当前只接受发票和可报销电子客票，航空行程单是例外。
