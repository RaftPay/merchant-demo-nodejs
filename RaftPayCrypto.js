'use strict';

const crypto = require('crypto');

/**
 * RaftPay RSA 加解密工具
 *
 * 算法: RSA/ECB/PKCS1Padding
 * 私钥格式: PKCS8 (Base64)
 * 公钥格式: X509/SPKI (Base64)
 * 分段加密块: keySize - 11 字节 (2048位密钥 = 245字节)
 * 分段解密块: keySize 字节 (2048位密钥 = 256字节)
 *
 * Node.js 14+ 兼容，仅需内置 crypto 模块
 */

/**
 * 清理密钥字符串，移除 PEM 头尾和空白
 */
function cleanKey(key) {
    return key
        .replace(/-----BEGIN.*?-----/g, '')
        .replace(/-----END.*?-----/g, '')
        .replace(/\s/g, '');
}

/**
 * 将 Base64 密钥转为 PEM 格式私钥
 */
function toPemPrivate(base64Key) {
    const cleaned = cleanKey(base64Key);
    const lines = cleaned.match(/.{1,64}/g) || [];
    return '-----BEGIN PRIVATE KEY-----\n' + lines.join('\n') + '\n-----END PRIVATE KEY-----';
}

/**
 * 将 Base64 密钥转为 PEM 格式公钥
 */
function toPemPublic(base64Key) {
    const cleaned = cleanKey(base64Key);
    const lines = cleaned.match(/.{1,64}/g) || [];
    return '-----BEGIN PUBLIC KEY-----\n' + lines.join('\n') + '\n-----END PUBLIC KEY-----';
}

/**
 * 使用商户私钥加密数据（商户 → 平台）
 *
 * @param {string} plainText         明文 JSON 字符串
 * @param {string} privateKeyBase64  商户私钥（Base64 编码）
 * @returns {string} Base64 编码的加密数据
 */
function encryptWithPrivateKey(plainText, privateKeyBase64) {
    const pem = toPemPrivate(privateKeyBase64);
    const key = crypto.createPrivateKey(pem);
    const keySize = key.asymmetricKeySize || 256; // 2048位 = 256字节
    const maxBlock = keySize - 11;                // PKCS1Padding 占 11 字节

    const data = Buffer.from(plainText, 'utf-8');
    const chunks = [];
    let offset = 0;

    while (offset < data.length) {
        const blockLen = Math.min(maxBlock, data.length - offset);
        const chunk = crypto.privateEncrypt(
            { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
            data.subarray(offset, offset + blockLen)
        );
        chunks.push(chunk);
        offset += blockLen;
    }

    return Buffer.concat(chunks).toString('base64');
}

/**
 * 使用平台公钥解密数据（平台 → 商户，用于回调解密）
 *
 * @param {string} encryptedBase64   Base64 编码的加密数据
 * @param {string} publicKeyBase64   平台公钥（Base64 编码）
 * @returns {string} 解密后的 JSON 字符串
 */
function decryptWithPublicKey(encryptedBase64, publicKeyBase64) {
    const pem = toPemPublic(publicKeyBase64);
    const key = crypto.createPublicKey(pem);
    const keySize = key.asymmetricKeySize || 256; // 2048位 = 256字节
    const maxBlock = keySize;

    const data = Buffer.from(encryptedBase64, 'base64');
    const chunks = [];
    let offset = 0;

    while (offset < data.length) {
        const blockLen = Math.min(maxBlock, data.length - offset);
        const chunk = crypto.publicDecrypt(
            { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
            data.subarray(offset, offset + blockLen)
        );
        chunks.push(chunk);
        offset += blockLen;
    }

    return Buffer.concat(chunks).toString('utf-8');
}

module.exports = { encryptWithPrivateKey, decryptWithPublicKey };
