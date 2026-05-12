import BaseInterpreter from '../BaseInterpreter.js'

/**
 * AsciiInterpreter — ASCII 字符解释器
 * 
 * 显示单字节 ASCII 字符（0x00-0x7F）
 */
export default class AsciiInterpreter extends BaseInterpreter {
  get name() {
    return 'ascii'
  }

  get displayName() {
    return 'ASCII'
  }

  get isFixedLength() {
    return true
  }

  get length() {
    return 1
  }

  /**
   * 解释 ASCII 字符
   * @param {DataView} dataView
   * @param {number} byteLength
   * @param {'le'|'be'} endian
   * @returns {string}
   */
  interpret(dataView, byteLength, endian) {
    if (byteLength < 1) return '—'

    const byte = dataView.getUint8(0)

    // ASCII 范围：0x00-0x7F
    if (byte > 0x7F) {
      return `—  (非ASCII: 0x${byte.toString(16).toUpperCase()})`
    }

    // 可打印字符：0x20-0x7E
    if (byte >= 0x20 && byte <= 0x7E) {
      const char = String.fromCharCode(byte)
      return `'${char}'  (0x${byte.toString(16).toUpperCase().padStart(2, '0')})`
    }

    // 控制字符：显示转义符号
    const controlChars = {
      0x00: '\\0 (NULL)',
      0x07: '\\a (BEL)',
      0x08: '\\b (BS)',
      0x09: '\\t (TAB)',
      0x0A: '\\n (LF)',
      0x0B: '\\v (VT)',
      0x0C: '\\f (FF)',
      0x0D: '\\r (CR)',
      0x1B: '\\e (ESC)',
      0x7F: 'DEL'
    }

    if (controlChars[byte]) {
      return controlChars[byte]
    }

    return `Control (0x${byte.toString(16).toUpperCase().padStart(2, '0')})`
  }
}
