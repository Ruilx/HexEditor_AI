/**
 * FileBuffer — 基于 Piece Table 的文件数据缓冲
 *
 * Piece Table 核心概念：
 *   - 维护两个只追加的缓冲区：
 *     * original: 原始文件数据（只读）
 *     * added:    用户插入的新数据（只追加）
 *   - 用一个"片段"（Piece）列表描述文件的当前逻辑内容：
 *     每个片段记录 { which: 'original'|'added', start, length }
 *   - 插入/删除只修改片段列表，不移动实际数据
 *
 * 当前 Phase 2 实现：提供接口骨架，核心算法在 Phase 3 完成。
 */
export default class FileBuffer {
  constructor() {
    /** @type {Uint8Array|null} 原始文件数据（来自 File.slice 读取） */
    this._original = null

    /** @type {Uint8Array} 用户新增数据缓冲（追加写入） */
    this._added = new Uint8Array(0)

    /**
     * Piece Table 片段列表
     * @type {Array<{ which: 'original'|'added', start: number, length: number }>}
     */
    this._pieces = []

    /** 文件总长度（字节数） */
    this._length = 0
  }

  /** 文件总长度 */
  get length() {
    return this._length
  }

  /**
   * 从 File 对象异步加载文件数据
   * 使用 File.arrayBuffer() 一次性读入（大文件分块加载将在 Phase 3 优化）
   * @param {File} file
   */
  async loadFile(file) {
    const buffer = await file.arrayBuffer()
    this._original = new Uint8Array(buffer)
    this._length = this._original.length
    // 初始时只有一个片段：整个原始文件
    this._pieces = [{ which: 'original', start: 0, length: this._length }]
  }

  /**
   * 获取指定偏移量的字节值
   * @param {number} offset
   * @returns {number|null} 0-255 或 null（越界）
   */
  getByte(offset) {
    if (offset < 0 || offset >= this._length) return null
    return this._readByte(offset)
  }

  /**
   * 获取指定范围的字节（返回 Uint8Array 副本）
   * @param {number} start
   * @param {number} length
   * @returns {Uint8Array}
   */
  getBytes(start, length) {
    const result = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      const b = this.getByte(start + i)
      result[i] = b ?? 0
    }
    return result
  }

  /**
   * 写入字节
   * @param {number} offset
   * @param {Uint8Array} bytes
   * @param {'insert'|'replace'} mode
   *
   * TODO Phase 3: 实现完整的 Piece Table 写入逻辑
   */
  write(offset, bytes, mode) {
    if (mode === 'replace') {
      this._writeReplace(offset, bytes)
    } else {
      this._writeInsert(offset, bytes)
    }
  }

  /**
   * 删除字节
   * @param {number} offset
   * @param {number} length
   *
   * TODO Phase 3: 实现 Piece Table 删除逻辑
   */
  delete(offset, length) {
    // 占位实现：直接在 original 中操作（仅用于验证接口，Phase 3 替换）
    if (!this._original) return
    const before = this._original.slice(0, offset)
    const after = this._original.slice(offset + length)
    const merged = new Uint8Array(before.length + after.length)
    merged.set(before)
    merged.set(after, before.length)
    this._original = merged
    this._length = merged.length
    this._pieces = [{ which: 'original', start: 0, length: this._length }]
  }

  /**
   * 将当前文件内容序列化为 Uint8Array（用于保存/下载）
   * @returns {Promise<Uint8Array>}
   *
   * TODO Phase 3: 按 Piece Table 顺序合并所有片段
   */
  async toUint8Array() {
    const result = new Uint8Array(this._length)
    for (let i = 0; i < this._length; i++) {
      result[i] = this._readByte(i) ?? 0
    }
    return result
  }

  // ── 私有方法 ────────────────────────────────────────────────

  /**
   * 通过 Piece Table 读取指定偏移量的字节
   * @param {number} offset
   * @returns {number}
   */
  _readByte(offset) {
    let pos = 0
    for (const piece of this._pieces) {
      if (offset < pos + piece.length) {
        const localOffset = offset - pos + piece.start
        if (piece.which === 'original') {
          return this._original?.[localOffset] ?? 0
        } else {
          return this._added[localOffset] ?? 0
        }
      }
      pos += piece.length
    }
    return 0
  }

  /**
   * 替换模式写入（直接覆盖字节）
   * @param {number} offset
   * @param {Uint8Array} bytes
   *
   * TODO Phase 3: 用 Piece Table 重写
   */
  _writeReplace(offset, bytes) {
    if (!this._original) return
    for (let i = 0; i < bytes.length; i++) {
      if (offset + i < this._original.length) {
        this._original[offset + i] = bytes[i]
      }
    }
  }

  /**
   * 插入模式写入
   * @param {number} offset
   * @param {Uint8Array} bytes
   *
   * TODO Phase 3: 用 Piece Table 重写
   */
  _writeInsert(offset, bytes) {
    if (!this._original) return
    const before = this._original.slice(0, offset)
    const after = this._original.slice(offset)
    const merged = new Uint8Array(before.length + bytes.length + after.length)
    merged.set(before)
    merged.set(bytes, before.length)
    merged.set(after, before.length + bytes.length)
    this._original = merged
    this._length = merged.length
    this._pieces = [{ which: 'original', start: 0, length: this._length }]
  }
}
