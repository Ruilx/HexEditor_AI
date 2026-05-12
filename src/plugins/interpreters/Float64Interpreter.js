import BaseInterpreter from '../BaseInterpreter.js'

/**
 * Float64Interpreter — 64位浮点数解释器
 * 
 * IEEE 754 双精度浮点数 (E11M52)
 */
export default class Float64Interpreter extends BaseInterpreter {
  get name() {
    return 'float64'
  }

  get displayName() {
    return 'Float64 (Double)'
  }

  get isFixedLength() {
    return true
  }

  get length() {
    return 8
  }

  /**
   * 解释 float64 数据
   * @param {DataView} dataView
   * @param {number} byteLength
   * @param {'le'|'be'} endian
   * @returns {string}
   */
  interpret(dataView, byteLength, endian) {
    if (byteLength < 8) return '—'

    const isLittleEndian = endian === 'le'
    const value = dataView.getFloat64(0, isLittleEndian)

    // 处理特殊值
    if (isNaN(value)) return 'NaN'
    if (value === Infinity) return '+Infinity'
    if (value === -Infinity) return '-Infinity'
    if (Object.is(value, -0)) return '-0'

    // 根据数值大小选择合适的显示格式
    if (Math.abs(value) < 0.0001 || Math.abs(value) > 1e10) {
      return value.toExponential(12)
    }
    
    return value.toPrecision(15)
  }
}
