import BaseInterpreter from '../BaseInterpreter.js'

/**
 * Utf8Interpreter — UTF-8 字符解释器
 * 
 * 尝试从光标位置解码 UTF-8 字符（1-4 字节）
 * 显示 Unicode 码点和字符
 */
export default class Utf8Interpreter extends BaseInterpreter {
  get name() {
    return 'utf8'
  }

  get displayName() {
    return 'UTF-8'
  }

  get isFixedLength() {
    return true  // 暂时改为固定长度，简化处理
  }

  get length() {
    return 4  // 最长 4 字节
  }

  /**
   * 解释 UTF-8 字符
   * @param {DataView} dataView
   * @param {number} byteLength
   * @param {'le'|'be'} endian
   * @returns {string}
   */
  interpret(dataView, byteLength, endian) {
    if (byteLength < 1) return '—'

    const firstByte = dataView.getUint8(0)

    // 确定 UTF-8 字符长度
    let charLen = 1
    if ((firstByte & 0x80) === 0x00) {
      charLen = 1  // 0xxxxxxx
    } else if ((firstByte & 0xE0) === 0xC0) {
      charLen = 2  // 110xxxxx
    } else if ((firstByte & 0xF0) === 0xE0) {
      charLen = 3  // 1110xxxx
    } else if ((firstByte & 0xF8) === 0xF0) {
      charLen = 4  // 11110xxx
    } else {
      return `无效 UTF-8 (0x${firstByte.toString(16).toUpperCase()})`
    }

    // 检查是否有足够的字节
    if (byteLength < charLen) {
      return `UTF-8 不完整 (需要 ${charLen} 字节，只有 ${byteLength} 字节)`
    }

    // 读取字节序列
    const bytes = new Uint8Array(charLen)
    for (let i = 0; i < charLen; i++) {
      bytes[i] = dataView.getUint8(i)
    }

    // 使用 TextDecoder 解码
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      const char = decoder.decode(bytes)
      const codePoint = char.codePointAt(0)

      // 如果是控制字符，显示码点但不显示字符
      if (codePoint < 0x20 || codePoint === 0x7F) {
        return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')} (控制字符)`
      }

      return `'${char}'  U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
    } catch (err) {
      return `无效 UTF-8 序列`
    }
  }
}
