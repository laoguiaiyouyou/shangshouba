# 云函数部署前检查表

## 当前检查结论

- 环境 ID：`cloud1-8ge14816fe785add`
  - 状态：通过
  - 依据：`app.js` 中 `wx.cloud.init({ env: 'cloud1-8ge14816fe785add' })`

- `cloudfunctionRoot`
  - 状态：通过
  - 当前值：`cloudfunctions`
  - 依据：`project.config.json`

- 云函数目录结构
  - 状态：通过
  - 目录：
    - `cloudfunctions/createOrderAfterPayment/index.js`
    - `cloudfunctions/createOrderAfterPayment/package.json`
    - `cloudfunctions/getOrderDetail/index.js`
    - `cloudfunctions/getOrderDetail/package.json`

- 两个函数的 `package.json`
  - 状态：通过
  - 要点：
    - 都有 `main: "index.js"`
    - 都声明了 `wx-server-sdk`

- 云数据库集合 `service_orders`
  - 状态：待人工确认
  - 说明：两个函数都直接读写该集合；未创建时，部署能成功，但调用会失败

- 上传并部署时应选择什么
  - 根目录环境：`cloud1-8ge14816fe785add`
  - 函数目录：`createOrderAfterPayment`、`getOrderDetail`
  - 依赖安装：优先使用云端安装

## 当前最可能的 3 个阻断原因

1. 开发者工具本地尚未给 `cloudfunctionRoot = cloudfunctions` 绑定云环境
- 现象：右键上传云函数时直接报“请在编辑器云函数根目录（cloudfunctionRoot）选择一个云环境”

2. 当前登录开发者工具的微信账号没有 `wx55b694f7ee29c81e` 或 `cloud1-8ge14816fe785add` 的权限
- 现象：环境列表为空，或选中环境后仍无法部署

3. 项目窗口仍在使用旧缓存
- 现象：仓库里已经有 `cloudfunctionRoot`，但工具仍像未识别到云函数根目录
- 处理：关闭并重新打开项目，再重新为 `cloudfunctions` 根目录绑定环境

## 部署前最短核对

- `app.js` 中环境 ID 是否仍是 `cloud1-8ge14816fe785add`
- `project.config.json` 中 `cloudfunctionRoot` 是否仍是 `cloudfunctions`
- `cloudfunctions` 下是否确实有两个函数目录
- 开发者工具里是否能给 `cloudfunctions` 根目录选环境
- 云环境里是否已创建 `service_orders`
