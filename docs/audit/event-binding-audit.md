# 事件绑定与配置审计

## 1. 事件绑定扫描结论

静态扫描了全部页面 WXML 中的 `bindtap/catchtap/bind:/catch:` 与对应页面 JS 方法。

结果：

- 未发现“模板绑定了不存在函数”的硬错误
- 未发现页面四件套缺失
- 未发现 `/images/mascot.png` 这类已引用静态资源丢失

## 2. 配置结论

- `app.json` 页面注册完整
- 项目未配置 `tabBar`
- 多数页面使用 `navigationStyle: custom`
- 未发现明显 JSON 配置非法项

## 3. 残余风险

- 事件存在不代表业务存在。当前主要问题集中在函数内部的上下文、状态和 storage 模拟，而不是模板绑定缺失。
- 仓库没有现成 lint/test/build/type-check 入口，模板与脚本的一致性缺少自动化护栏。
