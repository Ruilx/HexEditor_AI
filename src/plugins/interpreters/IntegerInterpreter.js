import BaseInterpreter from '../BaseInterpreter.js'

/**
 * IntegerInterpreter — 整数解释器
 * 
 * 支持多种整数类型：Int8/16/32/64, UInt8/16/32/64
 * 根据光标位置显示所有可能的整数解释
 */
export default class IntegerInterpreter extends BaseInterpreter {
  get name() {
    return 'integer'
  }

  get displayName() {
    return '整数'
  }

  get isFixedLength() {
    return true  // 改为固定长度，每次只显示8字节
  }

  get length() {
    return 8  // 最长 8 字节 (Int64/UInt64)
  }

  /**
   * 解释整数数据
   * @param {DataView} dataView
   * @param {number} byteLength - 可用字节数
   * @param {'le'|'be'} endian
   * @returns {string}
   */
  interpret(dataView, byteLength, endian) {
    const results = []
    const isLittleEndian = endian === 'le'

    // Int8 / UInt8 (1 byte)
    if (byteLength >= 1) {
      const int8 = dataView.getInt8(0)
      const uint8 = dataView.getUint8(0)
      results.push(`Int8: ${int8}`)
      results.push(`UInt8: ${uint8}`)
    }

    // Int16 / UInt16 (2 bytes)
    if (byteLength >= 2) {
      const int16 = dataView.getInt16(0, isLittleEndian)
      const uint16 = dataView.getUint16(0, isLittleEndian)
      results.push(`Int16: ${int16}`)
      results.push(`UInt16: ${uint16}`)
    }

    // Int32 / UInt32 (4 bytes)
    if (byteLength >= 4) {
      const int32 = dataView.getInt32(0, isLittleEndian)
      const uint32 = dataView.getUint32(0, isLittleEndian)
      results.push(`Int32: ${int32}`)
      results.push(`UInt32: ${uint32}`)
    }

    // BigInt64 / BigUint64 (8 bytes)
    if (byteLength >= 8) {
      const int64 = dataView.getBigInt64(0, isLittleEndian)
      const uint64 = dataView.getBigUint64(0, isLittleEndian)
      results.push(`Int64: ${int64}`)
      results.push(`UInt64: ${uint64}`)
    }

    return results.join('\n')
  }
}
