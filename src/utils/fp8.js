/**
 * fp8.js — FP8 浮点数位运算工具
 *
 * 支持两种 FP8 格式（IEEE 标准草案）：
 *   - E4M3：4 位指数，3 位尾数（符号 1 位 + 指数 4 位 + 尾数 3 位）
 *   - E5M2：5 位指数，2 位尾数（符号 1 位 + 指数 5 位 + 尾数 2 位）
 *
 * TODO Phase 4: 实现完整转换逻辑，包括 NaN、Inf、subnormal 处理
 */

/**
 * 将 FP8 E4M3 字节转换为 JS number
 * @param {number} byte 0-255
 * @returns {number}
 */
export function fp8E4M3ToFloat(byte) {
  const sign = (byte >> 7) & 0x1
  const exp = (byte >> 3) & 0xF
  const mantissa = byte & 0x7

  // 特殊值：E4M3 中 0x7F 和 0xFF 为 NaN
  if (exp === 0xF && mantissa === 0x7) return NaN

  const signMul = sign === 0 ? 1 : -1

  if (exp === 0) {
    // 次正规数（subnormal）
    return signMul * Math.pow(2, -6) * (mantissa / 8)
  }

  // 正规数
  const bias = 7
  return signMul * Math.pow(2, exp - bias) * (1 + mantissa / 8)
}

/**
 * 将 FP8 E5M2 字节转换为 JS number
 * @param {number} byte 0-255
 * @returns {number}
 */
export function fp8E5M2ToFloat(byte) {
  const sign = (byte >> 7) & 0x1
  const exp = (byte >> 2) & 0x1F
  const mantissa = byte & 0x3

  const signMul = sign === 0 ? 1 : -1

  // E5M2 特殊值
  if (exp === 0x1F) {
    if (mantissa === 0) return signMul * Infinity
    return NaN
  }

  if (exp === 0) {
    // 次正规数
    return signMul * Math.pow(2, -14) * (mantissa / 4)
  }

  const bias = 15
  return signMul * Math.pow(2, exp - bias) * (1 + mantissa / 4)
}
