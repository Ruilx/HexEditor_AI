import BaseInterpreter from '../BaseInterpreter.js'

/**
 * Float32Interpreter — 32位浮点数解释器
 * 
 * IEEE 754 单精度浮点数 (E8M23)
 */
export default class Float32Interpreter extends BaseInterpreter {
  get name() {
    return 'float32'
  }

  get displayName() {
    return 'Float32'
  }

  get isFixedLength() {
    return true
  }

  get length() {
    return 4
  }

  /**
   * 解释 float32 数据
   * @param {DataView} dataView
   * @param {number} byteLength
   * @param {'le'|'be'} endian
   * @returns {string}
   */
  interpret(dataView, byteLength, endian) {
    if (byteLength < 4) return '—'

    const isLittleEndian = endian === 'le'
    const value = dataView.getFloat32(0, isLittleEndian)

    // 处理特殊值
    if (isNaN(value)) return 'NaN'
    if (value === Infinity) return '+Infinity'
    if (value === -Infinity) return '-Infinity'
    if (Object.is(value, -0)) return '-0'

    // 根据数值大小选择合适的显示格式
    if (Math.abs(value) < 0.0001 || Math.abs(value) > 1e6) {
      return value.toExponential(6)
    }
    
    return value.toPrecision(7)
  }
}
