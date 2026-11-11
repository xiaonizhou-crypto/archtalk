# 安全说明 / Security

ArchTalk 读取本地 JSON 并生成 HTML 与口播稿。它不提供服务器、账户系统或模型接口，也不要求令牌。检查脚本会启动已安装的 Chrome 系浏览器；请保持 Node 和浏览器更新。

- JSON 中的所有内容会嵌入输出，包括来源和未显示的字段。共享前请删除秘密、个人路径与未获准公开的信息。
- 生成的 HTML 包含 JavaScript。只打开可信来源的 HTML；不要把任意第三方 HTML 当成经过 ArchTalk 检查的结果。
- 输出页面的策略禁止网络请求与外部资源；这不等于对任意输入、浏览器漏洞或依赖环境作出安全保证。
- 不在公开 Issue 中粘贴密钥、客户资料或可直接利用的敏感细节。若发现漏洞，请使用仓库启用的 GitHub 私密漏洞报告；若该入口不可用，可先开不含敏感内容的 Issue 请求私密沟通渠道。

ArchTalk processes local JSON and writes HTML and narration. No server, model API or credentials are required. The checker launches an installed Chromium-family browser with a temporary profile. Keep your runtime and browser updated, review all output before sharing, and only open trusted HTML. Report security issues privately when GitHub private vulnerability reporting is available; otherwise request a private channel without disclosing exploit details or secrets.
