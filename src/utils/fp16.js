/**
 * fp16.js — FP16 (Half-Precision) 浮点数位运算工具
 *
 * FP16 (E5M10)：符号 1 位 + 指数 5 位 + 尾数 10 位
 * IEEE 754-2008 半精度浮点格式
 */

/**
 * 将 FP16 的 16 位整数表示转换为 JS number (float64)
 * @param {number} uint16  0-65535
 * @returns {number}
 */
export function fp16ToFloat(uint16) {
  const sign = (uint16 >> 15) & 0x1
  const exp = (uint16 >> 10) & 0x1F
  const mantissa = uint16 & 0x3FF

  const signMul = sign === 0 ? 1 : -1

  if (exp === 0x1F) {
    // Infinity 或 NaN
    return mantissa === 0 ? signMul * Infinity : NaN
  }

  if (exp === 0) {
    // 次正规数
    return signMul * Math.pow(2, -14) * (mantissa / 1024)
  }

  const bias = 15
  return signMul * Math.pow(2, exp - bias) * (1 + mantissa / 1024)
}

/**
 * 将 JS number 转换为 FP16 的 16 位整数表示（近似）
 * @param {number} value
 * @returns {number} uint16
 */
export function floatToFp16(value) {
  if (isNaN(value)) return 0x7E00   // 标准 NaN
  if (!isFinite(value)) return value > 0 ? 0x7C00 : 0xFC00

  const sign = value < 0 ? 1 : 0
  const absVal = Math.abs(value)

  if (absVal === 0) return sign << 15

  const exp = Math.floor(Math.log2(absVal))
  const bias = 15

  if (exp > 15) return (sign << 15) | 0x7C00  // 溢出为 Inf
  if (exp < -24) return sign << 15              // 下溢为 ±0

  if (exp >= -14) {
    // 正规数
    const biasedExp = exp + bias
    const mantissa = Math.round((absVal / Math.pow(2, exp) - 1) * 1024)
    return (sign << 15) | (biasedExp << 10) | Math.min(mantissa, 0x3FF)
  } else {
    // 次正规数
    const mantissa = Math.round(absVal / Math.pow(2, -14) * 1024)
    return (sign << 15) | Math.min(mantissa, 0x3FF)
  }
}
