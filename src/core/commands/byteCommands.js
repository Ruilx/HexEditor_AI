/**
 * commands/byteCommands.js
 *
 * 字节级写入/删除相关 Command 类：
 *   - ReplaceCommand  替换模式写入（覆盖字节）
 *   - InsertCommand   插入模式写入（插入字节）
 *   - DeleteCommand   删除字节（Backspace / Delete / 剪切 / 选区删除）
 */

// ─────────────────────────────────────────────────────────────
// ReplaceCommand
// ─────────────────────────────────────────────────────────────

/**
 * 替换模式：覆盖 [offset, offset+length) 的字节
 *
 * undo 策略：写回旧字节（偏移量不变，无需 tag 快照）
 */
export class ReplaceCommand {
  /**
   * @param {number}      offset
   * @param {Uint8Array}  newBytes  新字节
   * @param {Uint8Array}  oldBytes  旧字节（调用前保存）
   * @param {object}      fileStore
   * @param {object}      stringDecodeStore
   */
  constructor(offset, newBytes, oldBytes, fileStore, stringDecodeStore) {
    this.description = `replace @${offset} len=${newBytes.length}`
    this._offset = offset
    this._newBytes = newBytes
    this._oldBytes = oldBytes
    this._fileStore = fileStore
    this._stringDecodeStore = stringDecodeStore
  }

  execute() {
    this._fileStore.writeBytes(this._offset, this._newBytes, 'replace')
    this._stringDecodeStore.updateAffectedRegions(this._offset, this._newBytes.length, this._fileStore)
  }

  undo() {
    this._fileStore.writeBytes(this._offset, this._oldBytes, 'replace')
    this._stringDecodeStore.updateAffectedRegions(this._offset, this._oldBytes.length, this._fileStore)
  }
}

// ─────────────────────────────────────────────────────────────
// InsertCommand
// ─────────────────────────────────────────────────────────────

/**
 * 插入模式：在 offset 处插入字节
 *
 * undo 策略：删除已插入的字节，恢复 tags/decodeRegions 快照
 */
export class InsertCommand {
  /**
   * @param {number}      offset
   * @param {Uint8Array}  bytes          插入的字节
   * @param {object[]}    tagsSnapshot   插入前的 tags 序列化数组（深拷贝）
   * @param {object[]}    decodeSnapshot 插入前的 decode regions 序列化数组
   * @param {object}      fileStore
   * @param {object}      tagStore
   * @param {object}      stringDecodeStore
   */
  constructor(offset, bytes, tagsSnapshot, decodeSnapshot, fileStore, tagStore, stringDecodeStore) {
    this.description = `insert @${offset} len=${bytes.length}`
    this._offset = offset
    this._bytes = bytes
    this._tagsSnapshot = tagsSnapshot
    this._decodeSnapshot = decodeSnapshot
    this._fileStore = fileStore
    this._tagStore = tagStore
    this._stringDecodeStore = stringDecodeStore
  }

  execute() {
    this._fileStore.writeBytes(this._offset, this._bytes, 'insert')
    this._tagStore.adjustTagsForInsertion(this._offset, this._bytes.length)
    this._stringDecodeStore.adjustForInsertion(this._offset, this._bytes.length, this._fileStore)
  }

  undo() {
    this._fileStore.deleteBytes(this._offset, this._bytes.length)
    // 恢复快照比逆向计算偏移更可靠
    this._tagStore.restoreSnapshot(this._tagsSnapshot)
    this._stringDecodeStore.restoreSnapshot(this._decodeSnapshot)
  }
}

// ─────────────────────────────────────────────────────────────
// DeleteCommand
// ─────────────────────────────────────────────────────────────

/**
 * 删除字节（Backspace / Delete / 剪切 / 选区删除）
 *
 * undo 策略：在原位置重新插入删除的字节，恢复 tags/decodeRegions 快照
 */
export class DeleteCommand {
  /**
   * @param {number}      offset
   * @param {Uint8Array}  deletedBytes   删除前保存的字节内容
   * @param {object[]}    tagsSnapshot   删除前的 tags 快照
   * @param {object[]}    decodeSnapshot 删除前的 decode regions 快照
   * @param {object}      fileStore
   * @param {object}      tagStore
   * @param {object}      stringDecodeStore
   */
  constructor(offset, deletedBytes, tagsSnapshot, decodeSnapshot, fileStore, tagStore, stringDecodeStore) {
    this.description = `delete @${offset} len=${deletedBytes.length}`
    this._offset = offset
    this._deletedBytes = deletedBytes
    this._tagsSnapshot = tagsSnapshot
    this._decodeSnapshot = decodeSnapshot
    this._fileStore = fileStore
    this._tagStore = tagStore
    this._stringDecodeStore = stringDecodeStore
  }

  execute() {
    this._fileStore.deleteBytes(this._offset, this._deletedBytes.length)
    this._tagStore.adjustTagsForDeletion(this._offset, this._deletedBytes.length)
    this._stringDecodeStore.adjustForDeletion(this._offset, this._deletedBytes.length, this._fileStore)
  }

  undo() {
    this._fileStore.writeBytes(this._offset, this._deletedBytes, 'insert')
    this._tagStore.restoreSnapshot(this._tagsSnapshot)
    this._stringDecodeStore.restoreSnapshot(this._decodeSnapshot)
  }
}
