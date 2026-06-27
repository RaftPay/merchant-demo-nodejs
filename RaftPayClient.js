'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { encryptWithPrivateKey } = require('./RaftPayCrypto');

/**
 * RaftPay 商户 API 客户端
 *
 * 支持接口:
 *   1. 代收订单创建  POST /order/api/merchant/v1/order/pay
 *   2. 代付订单创建  POST /order/api/merchant/v1/order/payout
 *   3. 订单状态查询  GET  /order/api/merchant/v1/order/status
 *   4. 余额查询      GET  /order/api/merchant/v1/account/balance
 *
 * Node.js 14+ 兼容，仅需内置 http/https 模块
 */
class RaftPayClient {

    /**
     * @param {string} merchantId         商户 ID
     * @param {string} merchantPrivateKey 商户私钥（Base64）
     * @param {string} apiBaseUrl         API 地址
     * @param {number} timeout            请求超时秒数
     */
    constructor(merchantId, merchantPrivateKey, apiBaseUrl, timeout = 30) {
        this.merchantId = merchantId;
        this.merchantPrivateKey = merchantPrivateKey;
        this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
        this.timeout = timeout * 1000; // 转为毫秒
    }

    // ========================================================================
    // 1. 代收订单创建
    // ========================================================================

    /**
     * 创建代收订单
     *
     * @param {object} params 业务参数:
     *   - merchantOrderNo string 必填 商户订单号（最大60字符）
     *   - amount          string 必填 金额，如 "100" 或 "100.00"
     *   - notifyUrl       string 必填 回调地址（最大150字符）
     *   - currency        string 必填 固定 PKR
     *   - payType         string 必填 EASYPAISA 或 JAZZCASH
     *   - description     string 选填 订单描述
     *   - payerMobile     string 必填 格式 03xxxxxxxxx
     *   - returnUrl       string 选填 支付完成后跳转地址
     *   - directMode      number 选填 0=收银台模式，1=直连模式（推荐）
     * @returns {Promise<object>} API 响应
     */
    async createDeposit(params) {
        const url = this.apiBaseUrl + '/order/api/merchant/v1/order/pay';
        return this._postEncrypted(url, params);
    }

    // ========================================================================
    // 2. 代付订单创建
    // ========================================================================

    /**
     * 创建代付订单
     *
     * @param {object} params 业务参数:
     *   - merchantOrderNo string 必填 商户订单号
     *   - amount          string 必填 金额
     *   - notifyUrl       string 必填 回调地址
     *   - payoutMethod    string 必填 MWALLET 或 IBFT
     *   - payerMobile     string 必填 格式 03xxxxxxxxx
     *   - currency        string 选填 固定 PKR
     *   - payType         string 条件 MWALLET 时必填: EASYPAISA 或 JAZZCASH
     *   - accountNumber   string 条件 IBFT 时必填
     *   - accountName     string 条件 IBFT 时必填
     *   - bankCode        string 条件 IBFT 时必填
     *   - description     string 选填
     * @returns {Promise<object>} API 响应
     */
    async createPayout(params) {
        const url = this.apiBaseUrl + '/order/api/merchant/v1/order/payout';
        return this._postEncrypted(url, params);
    }

    // ========================================================================
    // 3. 订单状态查询（代收/代付共用）
    // ========================================================================

    /**
     * 查询订单状态
     *
     * @param {string} merchantOrderNo 商户订单号
     * @returns {Promise<object>} API 响应，data.status: 0=待支付 1=处理中 2=成功 3=失败
     */
    async queryOrderStatus(merchantOrderNo) {
        const url = this.apiBaseUrl + '/order/api/merchant/v1/order/status';
        const data = {
            merchantOrderNo,
            timestamp: Math.floor(Date.now() / 1000),
        };
        return this._getEncrypted(url, data);
    }

    // ========================================================================
    // 4. 余额查询
    // ========================================================================

    /**
     * 查询商户余额
     *
     * @returns {Promise<object>} API 响应，data 包含 availableMoney, frozenMoney, unsettledMoney
     */
    async queryBalance() {
        const url = this.apiBaseUrl + '/order/api/merchant/v1/account/balance';
        const data = {
            timestamp: Math.floor(Date.now() / 1000),
        };
        return this._getEncrypted(url, data);
    }

    // ========================================================================
    // 内部方法
    // ========================================================================

    /**
     * POST 请求（加密业务数据）
     */
    async _postEncrypted(url, bizData) {
        const encryptedData = encryptWithPrivateKey(
            JSON.stringify(bizData),
            this.merchantPrivateKey
        );

        const requestBody = {
            merchantId: this.merchantId,
            data: encryptedData,
            timestamp: Math.floor(Date.now() / 1000),
        };

        return this._httpPost(url, requestBody);
    }

    /**
     * GET 请求（加密业务数据作为 query 参数）
     */
    async _getEncrypted(url, bizData) {
        const encryptedData = encryptWithPrivateKey(
            JSON.stringify(bizData),
            this.merchantPrivateKey
        );

        const params = new URLSearchParams({
            merchantId: this.merchantId,
            data: encryptedData,
        });

        return this._httpGet(url + '?' + params.toString());
    }

    /**
     * 发送 POST 请求
     */
    _httpPost(url, body) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify(body);
            const parsed = new URL(url);
            const mod = parsed.protocol === 'https:' ? https : http;

            const req = mod.request({
                hostname: parsed.hostname,
                port: parsed.port,
                path: parsed.pathname + parsed.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: this.timeout,
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`JSON 解析失败, HTTP ${res.statusCode}, 响应: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`HTTP 请求失败: ${e.message}`)));
            req.on('timeout', () => { req.destroy(); reject(new Error('HTTP 请求超时')); });
            req.write(payload);
            req.end();
        });
    }

    /**
     * 发送 GET 请求
     */
    _httpGet(url) {
        return new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const mod = parsed.protocol === 'https:' ? https : http;

            const req = mod.request({
                hostname: parsed.hostname,
                port: parsed.port,
                path: parsed.pathname + parsed.search,
                method: 'GET',
                timeout: this.timeout,
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`JSON 解析失败, HTTP ${res.statusCode}, 响应: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`HTTP 请求失败: ${e.message}`)));
            req.on('timeout', () => { req.destroy(); reject(new Error('HTTP 请求超时')); });
            req.end();
        });
    }
}

module.exports = RaftPayClient;
