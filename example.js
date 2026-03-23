'use strict';

/**
 * RaftPay 全部接口调用示例
 *
 * 使用方法:
 *   1. 复制 config.example.js 为 config.js 并填入真实凭证
 *   2. node example.js
 */

const crypto = require('crypto');
const RaftPayClient = require('./RaftPayClient');

// ============================================================
// 加载配置
// ============================================================
const config = require('./config');

const client = new RaftPayClient(
    config.merchantId,
    config.merchantPrivateKey,
    config.apiBaseUrl
);

function randomSuffix() {
    return crypto.randomBytes(4).toString('hex');
}

const statusMap = { 0: '待支付', 1: '处理中', 2: '成功', 3: '失败' };

(async () => {

    // ============================================================
    // 1. 查询余额
    // ============================================================
    console.log('========== 1. 查询余额 ==========');
    try {
        const result = await client.queryBalance();
        if (result.result === 0) {
            const data = result.data;
            console.log(`可用余额: ${data.availableMoney} PKR`);
            console.log(`冻结金额: ${data.frozenMoney} PKR`);
            console.log(`未结算:   ${data.unsettledMoney} PKR`);
        } else {
            console.log(`查询失败: ${result.message}`);
        }
    } catch (e) {
        console.log(`异常: ${e.message}`);
    }
    console.log();

    // ============================================================
    // 2. 创建代收订单
    // ============================================================
    console.log('========== 2. 创建代收订单 ==========');
    const depositOrderNo = 'DEP' + Date.now() + randomSuffix();
    try {
        const result = await client.createDeposit({
            merchantOrderNo: depositOrderNo,
            amount: '100',
            currency: 'PKR',
            payType: 'JAZZCASH',
            notifyUrl: config.notifyUrl,
            returnUrl: config.returnUrl || '',
            description: 'Test deposit',
            // payerMobile: '03001234567',  // 选填
        });
        if (result.result === 0) {
            const data = result.data;
            const s = statusMap[data.status] || '未知';
            console.log('订单创建成功!');
            console.log(`平台订单号: ${data.orderId}`);
            console.log(`商户订单号: ${data.merchantOrderNo}`);
            console.log(`收银台链接: ${data.payUrl}`);
            console.log(`订单状态:   ${data.status} (${s})`);
        } else {
            console.log(`创建失败: ${result.message} (code: ${result.result})`);
        }
    } catch (e) {
        console.log(`异常: ${e.message}`);
    }
    console.log();

    // ============================================================
    // 3. 创建代付订单（手机钱包 MWALLET）
    // ============================================================
    console.log('========== 3. 创建代付订单 (MWALLET) ==========');
    const payoutOrderNo = 'WDR' + Date.now() + randomSuffix();
    try {
        const result = await client.createPayout({
            merchantOrderNo: payoutOrderNo,
            amount: '100',
            currency: 'PKR',
            payoutMethod: 'MWALLET',
            payType: 'JAZZCASH',
            payerMobile: '03001234567',
            accountNumber: '03001234567',
            accountName: 'Test User',
            notifyUrl: config.notifyUrl,
            description: 'Test payout - wallet',
        });
        if (result.result === 0) {
            const data = result.data;
            const s = statusMap[data.status] || '未知';
            console.log('代付订单创建成功!');
            console.log(`平台订单号: ${data.orderId}`);
            console.log(`订单状态:   ${data.status} (${s})`);
        } else {
            console.log(`创建失败: ${result.message} (code: ${result.result})`);
        }
    } catch (e) {
        console.log(`异常: ${e.message}`);
    }
    console.log();

    // ============================================================
    // 4. 创建代付订单（银行转账 IBFT）
    // ============================================================
    console.log('========== 4. 创建代付订单 (IBFT) ==========');
    const ibftOrderNo = 'WDR' + Date.now() + randomSuffix() + 'B';
    try {
        const result = await client.createPayout({
            merchantOrderNo: ibftOrderNo,
            amount: '500',
            currency: 'PKR',
            payoutMethod: 'IBFT',
            payerMobile: '03001234567',
            accountNumber: '1234567890123',
            accountName: 'Test User',
            bankCode: 'HBL',
            notifyUrl: config.notifyUrl,
            description: 'Test payout - bank transfer',
        });
        if (result.result === 0) {
            const data = result.data;
            const s = statusMap[data.status] || '未知';
            console.log('代付订单创建成功!');
            console.log(`平台订单号: ${data.orderId}`);
            console.log(`订单状态:   ${data.status} (${s})`);
        } else {
            console.log(`创建失败: ${result.message} (code: ${result.result})`);
        }
    } catch (e) {
        console.log(`异常: ${e.message}`);
    }
    console.log();

    // ============================================================
    // 5. 查询订单状态
    // ============================================================
    console.log('========== 5. 查询订单状态 ==========');
    try {
        const result = await client.queryOrderStatus(depositOrderNo);
        if (result.result === 0) {
            const data = result.data;
            const statusText = statusMap[data.status] || '未知';
            console.log(`商户订单号: ${data.merchantOrderNo}`);
            console.log(`平台订单号: ${data.orderNo}`);
            console.log(`订单状态:   ${data.status} (${statusText})`);
            console.log(`订单金额:   ${data.amount} ${data.currency}`);
        } else {
            console.log(`查询失败: ${result.message} (code: ${result.result})`);
        }
    } catch (e) {
        console.log(`异常: ${e.message}`);
    }
    console.log();

    console.log('========== 完成 ==========');
    console.log('回调处理请参考 callback.js，启动: node callback.js');

})();
