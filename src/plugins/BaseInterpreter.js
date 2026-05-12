/**
 * BaseInterpreter — 数据解释器抽象基类
 *
 * 所有内置和自定义解释器均须继承此类并实现以下属性/方法。
 *
 * 两类解释器：
 *   1. 固定长度（isFixedLength = true）
 *      只需从光标位置读取固定字节数即可计算结果。
 *      例：Int16、Float32、GUID 等。
 *
 *   2. 选中长度（isFixedLength = false）
 *      使用用户当前选中的所有字节进行计算。
 *      例：MD5、SHA1、CRC32 等。
 *      此类解释器通常计算较慢，应采用防抖延迟计算。
 */
export default class BaseInterpreter {
  /**
   * 解释器唯一标识（英文，与 settingsStore.enabledInterpreters 中的值对应）
   * @type {string}
   */
  get name() {
    throw new Error('BaseInterpreter: name 属性必须被子类实现')
  }

  /**
   * 显示名称（中文/英文均可，显示在数据信息面板）
   * @type {string}
   */
  get displayName() {
    throw new Error('BaseInterpreter: displayName 属性必须被子类实现')
  }

  /**
   * 是否为固定长度解释器
   * @type {boolean}
   */
  get isFixedLength() {
    return true
  }

  /**
   * 固定长度解释器需要的字节数（isFixedLength = true 时有效）
   * @type {number}
   */
  get length() {
    return 1
  }

  /**
   * 解释数据并返回显示字符串
   *
   * @param {DataView} dataView  — 包含所需字节的 DataView（从 offset=0 开始）
   * @param {number} byteLength  — dataView 的实际有效字节数
   * @param {'le'|'be'} endian   — 字节序
   * @returns {string}           — 解释结果的显示字符串
   */
  interpret(dataView, byteLength, endian) {
    throw new Error('BaseInterpreter: interpret() 方法必须被子类实现')
  }

  /**
   * 选中长度解释器是否支持延迟（防抖）计算
   * 默认 true，子类可覆盖为 false（适合轻量计算）
   * @type {boolean}
   */
  get isLazy() {
    return !this.isFixedLength
  }
}
