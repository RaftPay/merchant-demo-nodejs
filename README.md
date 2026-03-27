# RaftPay Node.js 商户接入 Demo

Node.js 14+ 兼容，零第三方依赖，仅使用内置 `crypto` + `http` 模块。

## 快速开始

```bash
# 1. 复制配置文件并填入真实凭证
cp config.example.js config.js

# 2. 运行示例（调用全部接口）
node example.js
```

## 文件说明

| 文件 | 说明 |
|------|------|
| `config.example.js` | 配置模板，复制为 `config.js` 使用 |
| `RaftPayCrypto.js` | RSA 加解密工具，可直接复制到你的项目 |
| `RaftPayClient.js` | API 客户端，封装了 4 个接口调用 |
| `callback.js` | 回调通知接收端，部署到可被外网访问的地址 |
| `example.js` | 全部接口调用示例 |

## 接口清单

| # | 接口 | 方法 |
|---|------|------|
| 1 | 代收订单创建 | `await client.createDeposit(params)` |
| 2 | 代收订单创建（直连） | `await client.createDeposit(params)` + `directMode=1` |
| 3 | 代付订单创建 | `await client.createPayout(params)` |
| 4 | 订单状态查询 | `await client.queryOrderStatus(merchantOrderNo)` |
| 5 | 余额查询 | `await client.queryBalance()` |
| 6 | 回调通知处理 | 部署 `callback.js` |

## 集成到你的项目

只需复制 `RaftPayCrypto.js` 和 `RaftPayClient.js` 两个文件即可。

```javascript
const RaftPayClient = require('./RaftPayClient');

const client = new RaftPayClient('商户ID', '商户私钥Base64', 'https://api_server.raftpay');

// 创建代收
const result = await client.createDeposit({
    merchantOrderNo: 'YOUR_ORDER_NO',
    amount: '100',
    currency: 'PKR',
    notifyUrl: 'https://your-domain.com/callback',
});

// 查询余额
const balance = await client.queryBalance();
```

## 回调配置

启动回调服务：

```bash
node callback.js
```

将回调服务部署到你的服务器，确保外网可访问，并在创建订单时传入该 URL 作为 `notifyUrl`。

回调重试机制：如未返回 `success`，平台将按 30s、1m、4m、10m、30m、1h、2h、6h、15h、24h 间隔重试，共 10 次。
