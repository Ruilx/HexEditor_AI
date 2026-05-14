/**
 * commands/resizeCommands.js
 *
 * 文件大小调整 Command：
 *   - ResizeCommand  调整文件大小（扩展或截断）
 *
 * 截断时保存被删除的字节内容，undo 时恢复所有内容。
 * tags 和 decode regions 用快照还原。
 */

export class ResizeCommand {
  /**
   * @param {number}      newSize
   * @param {number}      oldSize
   * @param {Uint8Array|null} trimmedBytes  截断时被删除的字节（扩展时为 null）
   * @param {object[]}    tagsSnapshot      操作前 tags 快照
   * @param {object[]}    decodeSnapshot    操作前 decode regions 快照
   * @param {object}      fileStore
   * @param {object}      tagStore
   * @param {object}      stringDecodeStore
   */
  constructor(newSize, oldSize, trimmedBytes, tagsSnapshot, decodeSnapshot, fileStore, tagStore, stringDecodeStore) {
    this.description = `resize ${oldSize} → ${newSize}`
    this._newSize = newSize
    this._oldSize = oldSize
    this._trimmedBytes = trimmedBytes
    this._tagsSnapshot = tagsSnapshot
    this._decodeSnapshot = decodeSnapshot
    this._fileStore = fileStore
    this._tagStore = tagStore
    this._stringDecodeStore = stringDecodeStore
  }

  execute() {
    this._tagStore.adjustTagsForDeletion(this._newSize, this._oldSize - this._newSize)
    this._stringDecodeStore.adjustForDeletion(this._newSize, this._oldSize - this._newSize, this._fileStore)
    this._fileStore.resizeFile(this._newSize)
  }

  undo() {
    if (this._newSize < this._oldSize) {
      // 截断的 undo：恢复字节 + 快照
      this._fileStore.resizeFile(this._oldSize)
      // 被截断的字节全部为 0x00（resizeFile 扩展时填 0x00），需写回原始内容
      if (this._trimmedBytes && this._trimmedBytes.length > 0) {
        this._fileStore.writeBytes(this._newSize, this._trimmedBytes, 'replace')
      }
      this._tagStore.restoreSnapshot(this._tagsSnapshot)
      this._stringDecodeStore.restoreSnapshot(this._decodeSnapshot)
    } else {
      // 扩展的 undo：截断回原大小
      this._fileStore.resizeFile(this._oldSize)
    }
  }
}
