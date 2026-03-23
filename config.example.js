'use strict';

/**
 * RaftPay 商户配置
 * 复制此文件为 config.js 并填入真实凭证
 */
module.exports = {
    // 平台分配的商户 ID
    merchantId: 'YOUR_MERCHANT_ID',

    // 商户 RSA 私钥（Base64 编码，PKCS8 格式）
    merchantPrivateKey: 'YOUR_MERCHANT_PRIVATE_KEY_BASE64',

    // 平台 RSA 公钥（Base64 编码，X509 格式）
    platformPublicKey: 'YOUR_PLATFORM_PUBLIC_KEY_BASE64',

    // API 地址（不带末尾斜杠）
    apiBaseUrl: 'https://api_server.raftpay',

    // 回调通知地址（平台将 POST 支付结果到此地址）
    notifyUrl: 'https://your-domain.com/callback',

    // 支付完成后跳转地址（可选）
    returnUrl: 'https://your-domain.com/orders',

    // 回调服务监听端口
    callbackPort: 8080,
};
