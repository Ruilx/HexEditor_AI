/**
 * commands/tagCommands.js
 *
 * 标签相关 Command 类：
 *   - TagCreateCommand  创建标签
 *   - TagUpdateCommand  编辑标签属性
 *   - TagDeleteCommand  删除标签
 */

// ─────────────────────────────────────────────────────────────
// TagCreateCommand
// ─────────────────────────────────────────────────────────────

export class TagCreateCommand {
  /**
   * @param {{ startOffset, endOffset, label, note, fgColor, bgColor }} data
   * @param {object} tagStore
   */
  constructor(data, tagStore) {
    this.description = `createTag [${data.startOffset}, ${data.endOffset}]`
    this._data = data
    this._tagStore = tagStore
    this._createdId = null
  }

  execute() {
    this._createdId = this._tagStore.createTag(this._data)
  }

  undo() {
    if (this._createdId) {
      this._tagStore.deleteTag(this._createdId)
    }
  }
}

// ─────────────────────────────────────────────────────────────
// TagUpdateCommand
// ─────────────────────────────────────────────────────────────

export class TagUpdateCommand {
  /**
   * @param {string}  id
   * @param {object}  newData  更新后的属性
   * @param {object}  oldData  更新前的属性（快照）
   * @param {object}  tagStore
   */
  constructor(id, newData, oldData, tagStore) {
    this.description = `updateTag ${id}`
    this._id = id
    this._newData = { ...newData }
    this._oldData = { ...oldData }
    this._tagStore = tagStore
  }

  execute() {
    this._tagStore.updateTag(this._id, this._newData)
  }

  undo() {
    this._tagStore.updateTag(this._id, this._oldData)
  }
}

// ─────────────────────────────────────────────────────────────
// TagDeleteCommand
// ─────────────────────────────────────────────────────────────

export class TagDeleteCommand {
  /**
   * @param {object} tag  删除前的完整 tag 对象（含 id、offset 等）
   * @param {object} tagStore
   */
  constructor(tag, tagStore) {
    this.description = `deleteTag ${tag.id}`
    this._tag = { ...tag }
    this._tagStore = tagStore
  }

  execute() {
    this._tagStore.deleteTag(this._tag.id)
  }

  undo() {
    this._tagStore.createTagWithId(this._tag)
  }
}
