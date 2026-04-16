# CLI 备用方案

当前仓库与本机检查结论：
- 已有 Node.js：`v25.8.1`
- 已有 `npm` / `npx`
- 本机当前未发现 `miniprogram-ci`
- 仓库内未发现小程序上传私钥文件 `private.wx55b694f7ee29c81e.key`
- 两个云函数都没有本地 `node_modules`

结论：
- 命令行部署路径是可行的
- 但当前不能直接执行，因为至少还缺上传私钥
- 依赖安装可走云端安装，不要求先在函数目录本地 `npm install`

最少需要准备：
1. 小程序代码上传私钥，建议命名为 `private.wx55b694f7ee29c81e.key`
2. `miniprogram-ci`

最短命令顺序如下。

如果本机还没装 `miniprogram-ci`：
```bash
npm install -g miniprogram-ci
```

部署 `createOrderAfterPayment`：
```bash
miniprogram-ci cloud functions upload --pp "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " --appid "wx55b694f7ee29c81e" --pkp "/ABS/PATH/private.wx55b694f7ee29c81e.key" --env "cloud1-8ge14816fe785add" --name "createOrderAfterPayment" --path "/Users/qinzhenjun/Desktop/shangshouba/shangshouba /cloudfunctions/createOrderAfterPayment" --remote-npm-install true
```

部署 `getOrderDetail`：
```bash
miniprogram-ci cloud functions upload --pp "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " --appid "wx55b694f7ee29c81e" --pkp "/ABS/PATH/private.wx55b694f7ee29c81e.key" --env "cloud1-8ge14816fe785add" --name "getOrderDetail" --path "/Users/qinzhenjun/Desktop/shangshouba/shangshouba /cloudfunctions/getOrderDetail" --remote-npm-install true
```

如果你不想全局安装，也可以直接用 `npx`：
```bash
npx -y miniprogram-ci cloud functions upload --pp "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " --appid "wx55b694f7ee29c81e" --pkp "/ABS/PATH/private.wx55b694f7ee29c81e.key" --env "cloud1-8ge14816fe785add" --name "createOrderAfterPayment" --path "/Users/qinzhenjun/Desktop/shangshouba/shangshouba /cloudfunctions/createOrderAfterPayment" --remote-npm-install true
```

```bash
npx -y miniprogram-ci cloud functions upload --pp "/Users/qinzhenjun/Desktop/shangshouba/shangshouba " --appid "wx55b694f7ee29c81e" --pkp "/ABS/PATH/private.wx55b694f7ee29c81e.key" --env "cloud1-8ge14816fe785add" --name "getOrderDetail" --path "/Users/qinzhenjun/Desktop/shangshouba/shangshouba /cloudfunctions/getOrderDetail" --remote-npm-install true
```

如果命令行仍不可用，最少通常是缺下面其中一项：
- 没有上传私钥
- 当前微信公众平台账号没有该小程序上传权限
- 本机无法访问 npm 源，导致 `miniprogram-ci` 无法安装或 `npx` 无法拉包
