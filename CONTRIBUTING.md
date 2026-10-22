# 贡献指南

使用 Node.js 22 或更高版本。运行 `npm ci`、`npm run setup`、`npm run verify`；小程序通过微信开发者工具运行，部署见 `docs/DEPLOYMENT.md`。

修改前阅读 `docs/ARCHITECTURE.md`，围绕具体问题改动。识别修改请附人工编造的脱敏回归文本，界面修改附虚构数据截图和实际验证结果。

Pull Request 请说明触发场景、修改后的行为、验证方式和限制。发布相关修改还应运行 `npm run prepare:release`。自动验证无需真实云服务或令牌。

不要提交个人配置、真实票据、完整云日志、密钥或个人路径。安全问题使用私密渠道，见 `SECURITY.md`。请确保有权提交代码或素材，并接受项目 MIT 许可；第三方材料保留原许可。
