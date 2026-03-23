'use strict';

/**
 * RaftPay 回调通知接收端
 *
 * 部署说明:
 *   将此服务部署到可被外网访问的地址，并在创建订单时将该地址作为 notifyUrl 传入。
 *
 * 启动方式:
 *   node callback.js
 *
 * 回调数据格式:
 *   POST body: {"data": "Base64编码的RSA加密数据"}
 *   使用平台公钥解密后得到业务数据 JSON
 *
 * 解密后字段:
 *   - orderId          string 平台订单号
 *   - merchantOrderNo  string 商户订单号
 *   - orderType        string PayIn(代收) 或 PayOut(代付)
 *   - amount           string 订单金额
 *   - fee              string 手续费
 *   - status           number 2=成功, 3=失败
 *   - payType          string 支付类型
 *   - currency         string 货币代码
 *   - processCurrency  string 实际支付货币
 *   - processAmount    string 实际支付金额
 *   - merchantCustomize string 自定义字段（原样返回）
 *   - createTime       number 毫秒时间戳
 *
 * 响应要求:
 *   HTTP 200，返回 "success" 字符串。否则平台会重试（最多10次，约48小时）。
 */

const http = require('http');
const { decryptWithPublicKey } = require('./RaftPayCrypto');

// ============================================================
// 1. 加载配置
// ============================================================
const config = require('./config');
const platformPublicKey = config.platformPublicKey;
const port = config.callbackPort || 8080;

// ============================================================
// 2. 创建 HTTP 服务
// ============================================================
const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
        res.writeHead(200);
        res.end('success');
        return;
    }

    let rawBody = '';
    req.on('data', (chunk) => rawBody += chunk);
    req.on('end', () => {
        // ============================================================
        // 3. 解析请求体
        // ============================================================
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error('[RaftPay Callback] JSON 解析失败:', rawBody);
            res.writeHead(200);
            res.end('success');
            return;
        }

        if (!body.data) {
            console.error('[RaftPay Callback] 缺少 data 字段');
            res.writeHead(200);
            res.end('success');
            return;
        }

        // ============================================================
        // 4. 使用平台公钥解密
        // ============================================================
        let notice;
        try {
            const decrypted = decryptWithPublicKey(body.data, platformPublicKey);
            notice = JSON.parse(decrypted);
        } catch (e) {
            console.error('[RaftPay Callback] 解密失败:', e.message);
            res.writeHead(200);
            res.end('success');
            return;
        }

        // ============================================================
        // 5. 处理业务逻辑
        // ============================================================
        const orderId = notice.orderId || '';
        const merchantOrderNo = notice.merchantOrderNo || '';
        const orderType = notice.orderType || '';    // PayIn 或 PayOut
        const status = notice.status;                // 2=成功, 3=失败
        const amount = notice.amount || '0';
        const fee = notice.fee || '0';

        console.error(
            `[RaftPay Callback] orderId=${orderId} merchantOrderNo=${merchantOrderNo} type=${orderType} status=${status} amount=${amount} fee=${fee}`
        );

        // 注意: 必须做幂等性判断，同一订单可能收到多次回调
        // 建议根据 merchantOrderNo 查询本地订单状态，已处理则直接返回 success

        if (status === 2) {
            // ===== 支付成功 =====
            // TODO: 更新本地订单状态为成功
            // TODO: 代收 — 给用户加款 / 代付 — 确认打款完成
            console.error(`[RaftPay Callback] 订单 ${merchantOrderNo} 支付成功`);

        } else if (status === 3) {
            // ===== 支付失败 =====
            // TODO: 更新本地订单状态为失败
            // TODO: 代付失败 — 解冻用户余额
            console.error(`[RaftPay Callback] 订单 ${merchantOrderNo} 支付失败`);

        } else {
            console.error(`[RaftPay Callback] 订单 ${merchantOrderNo} 未知状态: ${status}`);
        }

        // ============================================================
        // 6. 必须返回 "success"，否则平台会重试
        // ============================================================
        res.writeHead(200);
        res.end('success');
    });
});

server.listen(port, () => {
    console.log(`[RaftPay Callback] 回调服务已启动，监听端口: ${port}`);
    console.log(`[RaftPay Callback] 回调地址: http://localhost:${port}/`);
});
