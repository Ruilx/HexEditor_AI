/**
 * encoding.js — 多编码解码工具函数
 *
 * 依赖浏览器原生 TextDecoder API，支持：
 *   - UTF-8, UTF-16LE, UTF-16BE, UTF-32LE, UTF-32BE
 *   - GBK / GB18030
 *   - Shift_JIS
 *   - Big5
 *
 * 注意：TextDecoder 不支持的编码会抛出 RangeError，调用方需 try/catch。
 */

/**
 * 将字节数组按指定编码解码为字符串
 * @param {Uint8Array} bytes
 * @param {string} encoding  — TextDecoder 支持的编码名称
 * @returns {string}
 */
export function decodeBytes(bytes, encoding) {
  const decoder = new TextDecoder(encoding, { fatal: false })
  return decoder.decode(bytes)
}

/**
 * UTF-8 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeUtf8(bytes) {
  return decodeBytes(bytes, 'utf-8')
}

/**
 * UTF-16 LE 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeUtf16Le(bytes) {
  return decodeBytes(bytes, 'utf-16le')
}

/**
 * UTF-16 BE 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeUtf16Be(bytes) {
  return decodeBytes(bytes, 'utf-16be')
}

/**
 * UTF-32 LE 解码（TextDecoder 可能不支持，需回退到手动解码）
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeUtf32Le(bytes) {
  try {
    return decodeBytes(bytes, 'utf-32le')
  } catch {
    return _decodeUtf32Manual(bytes, true)
  }
}

/**
 * UTF-32 BE 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeUtf32Be(bytes) {
  try {
    return decodeBytes(bytes, 'utf-32be')
  } catch {
    return _decodeUtf32Manual(bytes, false)
  }
}

/**
 * GBK / GB18030 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeGbk(bytes) {
  return decodeBytes(bytes, 'gbk')
}

/**
 * Shift-JIS 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeShiftJis(bytes) {
  return decodeBytes(bytes, 'shift-jis')
}

/**
 * Big5 解码
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function decodeBig5(bytes) {
  return decodeBytes(bytes, 'big5')
}

/**
 * 判断字节是否为可打印 ASCII（0x20-0x7E）
 * @param {number} byte
 * @returns {boolean}
 */
export function isPrintableAscii(byte) {
  return byte >= 0x20 && byte <= 0x7e
}

// ── 内部工具 ────────────────────────────────────────────────────

function _decodeUtf32Manual(bytes, littleEndian) {
  const chars = []
  for (let i = 0; i + 3 < bytes.length; i += 4) {
    let codePoint
    if (littleEndian) {
      codePoint = bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)
    } else {
      codePoint = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]
    }
    if (codePoint > 0 && codePoint <= 0x10FFFF) {
      chars.push(String.fromCodePoint(codePoint))
    } else {
      chars.push('.')
    }
  }
  return chars.join('')
}
