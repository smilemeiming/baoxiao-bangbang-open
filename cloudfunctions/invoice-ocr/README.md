# invoice-ocr 云函数

这个云函数用于把小程序上传到云存储的 JPG、PNG 或 PDF 发票文件交给 PaddleOCR 识别，再归一化成小程序发票库使用的数据结构。

## PaddleOCR 配置

优先使用 PaddleOCR。云函数会向 `PADDLEOCR_API_URL` 发起 `POST` 请求，请求体包含：

```json
{
  "file": "Base64 文件内容",
  "fileType": 1
}
```

`fileType` 会自动判断：图片为 `1`，PDF 为 `0`。

## 你需要操作的步骤

1. 打开 PaddleOCR 页面，进入 `API`。
2. 从页面给出的调用示例中复制 `API_URL` 和 `TOKEN`。
   - `PADDLEOCR_API_URL` 必须填写调用示例里的接口地址。
   - 不要填写 `https://aistudio.baidu.com/paddleocr/task` 等网页地址。
3. 在微信开发者工具中开通云开发。
4. 右键 `cloudfunctions/invoice-ocr`，选择“安装依赖”。
5. 右键 `cloudfunctions/invoice-ocr`，选择“上传并部署：云端安装依赖”。
6. 到云开发控制台，进入“云函数” -> `invoice-ocr` -> “配置” -> “环境变量”。
7. 添加环境变量：
   - `OCR_PROVIDER=paddleocr`
   - `PADDLEOCR_API_URL=你的 PaddleOCR API 地址`
   - `PADDLEOCR_ACCESS_TOKEN=你的 PaddleOCR 访问令牌`
8. 保存配置后，重新部署或重启 `invoice-ocr` 云函数。
9. 将云函数超时时间设置为 `60 秒`。
10. 回到小程序“导入”页面，先选择一张较小的 JPG 或 PNG 发票测试。

如果你拿到的是服务根地址，而不是完整接口地址，也可以配置：

```text
PADDLEOCR_BASE_URL=https://你的服务地址
PADDLEOCR_MODE=ocr
PADDLEOCR_TIMEOUT_MS=55000
PADDLEOCR_RETRY_COUNT=0
PADDLEOCR_ASYNC_FALLBACK=true
PADDLEOCR_ASYNC_PREFERRED=true
PADDLEOCR_ASYNC_REQUEST_TIMEOUT_MS=15000
PADDLEOCR_MODEL=PaddleOCR-VL-1.5
PADDLEOCR_ASYNC_TIMEOUT_MS=45000
```

云函数会自动请求 `/ocr`。如果要测试 PaddleOCR-VL 文档解析接口，可设置：

```text
PADDLEOCR_MODE=layout
```

云函数会自动请求 `/layout-parsing`。

## 可选：腾讯云 OCR 回退

如果需要临时切回腾讯云 OCR，可以配置：

```text
OCR_PROVIDER=tencent
TENCENTCLOUD_SECRET_ID=你的腾讯云 SecretId
TENCENTCLOUD_SECRET_KEY=你的腾讯云 SecretKey
TENCENTCLOUD_REGION=ap-guangzhou
```

## 返回结构

云函数返回：

```json
{
  "data": [
    {
      "categoryId": "taxi",
      "merchant": "滴滴",
      "amount": 86.5,
      "date": "2026-06-08",
      "invoiceNo": "FP202606080001",
      "taxNo": "91110105MA00000001"
    }
  ]
}
```

小程序端会继续执行归档、收支项目展示、市内交通配对和报表生成。

## 回退行为

如果 PaddleOCR 地址未配置、令牌错误或云函数调用失败，小程序会保留原件并明确显示失败原因，不会用文件名或随机数伪造金额、日期、票号和税号。
