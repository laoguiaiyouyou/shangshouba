# 云开发最短手动步骤

当前仓库已满足的前提：
- `app.js` 已显式初始化环境 `cloud1-8ge14816fe785add`
- `project.config.json` 已声明 `cloudfunctionRoot: "cloudfunctions"`
- 云函数目录已存在：`createOrderAfterPayment`、`getOrderDetail`

当前错误“请在编辑器云函数根目录（cloudfunctionRoot）选择一个云环境”说明：
- 代码仓库已经声明了云函数根目录
- 但开发者工具本地还没有把这个根目录绑定到云环境

按下面顺序做，够用即可：

1. 重新打开项目，确认使用的 `AppID` 是 `wx55b694f7ee29c81e`
- 成功标准：项目正常打开，未变成“测试号/无 AppID 项目”
- 失败表现：开发者工具里看不到云开发能力，或当前账号无该小程序权限

2. 在开发者工具里选中云函数根目录 `cloudfunctions`，为该根目录选择云环境 `cloud1-8ge14816fe785add`
- 成功标准：`cloudfunctions` 根目录已显示或记住该云环境；再次右键云函数时，不再提示“请选择一个云环境”
- 失败表现：环境下拉为空、选完后仍反复提示同一报错

3. 右键 `cloudfunctions/createOrderAfterPayment`，执行“上传并部署”
- 成功标准：函数上传完成，云端可见 `createOrderAfterPayment`
- 失败表现：提示环境未选中、无权限、依赖安装失败

4. 右键 `cloudfunctions/getOrderDetail`，执行“上传并部署”
- 成功标准：函数上传完成，云端可见 `getOrderDetail`
- 失败表现：同上

5. 在云数据库里确认存在集合 `service_orders`
- 成功标准：云环境里能看到 `service_orders`
- 失败表现：函数已部署，但调用时报集合不存在或查询为空

如果第 2 步做完仍报同一错误，优先排查这三件事：
- 当前登录开发者工具的微信账号没有 `wx55b694f7ee29c81e` 对应项目或环境 `cloud1-8ge14816fe785add` 的权限
- 项目是旧窗口缓存，`cloudfunctionRoot` 变更后没有重新打开项目
- 当前操作的是函数目录，但根目录 `cloudfunctions` 本身还没完成环境绑定
