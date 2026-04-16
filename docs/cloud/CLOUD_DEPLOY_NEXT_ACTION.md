# 云函数部署下一步

## 推荐路径

推荐走 CLI，不再继续走 GUI。

原因：
- 仓库侧云开发配置已经到位，当前阻断不在代码
- 本机已经安装官方 `CloudBase CLI 2.9.9`，可直接用于云函数部署
- 相比 `miniprogram-ci`，当前机器不需要先补装新 CLI；只差登录态
- 当前 GUI 一直卡在 `cloudfunctionRoot` 绑定环境，继续找入口收益太低

## 你下一步只需要做的动作

### 动作 1：登录 CloudBase CLI

优先执行：
```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase login
```

成功标准：
- 终端登录完成后，再执行 `cloudbase env list` 能看到环境列表
- 输出里应包含 `cloud1-8ge14816fe785add`

失败时下一步看这里：
- 如果提示无有效身份信息，说明还没登录成功
- 如果当前终端无法走交互登录，改用密钥登录：
```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase login -k --apiKeyId "你的SecretId" --apiKey "你的SecretKey"
```

### 动作 2：部署两个云函数

先校验环境是否可见：
```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase env list
```

成功标准：
- 输出中存在 `cloud1-8ge14816fe785add`

部署 `createOrderAfterPayment`：
```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase fn deploy createOrderAfterPayment -e cloud1-8ge14816fe785add --dir cloudfunctions/createOrderAfterPayment --force
```

部署 `getOrderDetail`：
```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase fn deploy getOrderDetail -e cloud1-8ge14816fe785add --dir cloudfunctions/getOrderDetail --force
```

部署后校验函数列表：
```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase fn list -e cloud1-8ge14816fe785add
```

成功标准：
- 列表中至少出现 `createOrderAfterPayment`
- 列表中至少出现 `getOrderDetail`

失败时下一步看这里：
- 如果报权限问题，检查当前 CloudBase 登录账号是否有该环境权限
- 如果报依赖或打包问题，先检查对应函数目录的 `package.json` 和 `index.js`

### 动作 3：确认 `service_orders` 集合

当前这台机器上的 `cloudbase` CLI 已验证可部署函数，但不适合直接核对原生数据库集合。

因此这一步保留为唯一必要的人工确认：
- 在云开发控制台确认是否存在 `service_orders`

成功标准：
- 云数据库里能看到 `service_orders`

失败时下一步看这里：
- 若不存在，手动新建 `service_orders`
- 新建后再回到小程序里调用云函数验证

## 最短执行顺序

```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase login
```

```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase env list
```

```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase fn deploy createOrderAfterPayment -e cloud1-8ge14816fe785add --dir cloudfunctions/createOrderAfterPayment --force
```

```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase fn deploy getOrderDetail -e cloud1-8ge14816fe785add --dir cloudfunctions/getOrderDetail --force
```

```bash
cd "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " && cloudbase fn list -e cloud1-8ge14816fe785add
```
