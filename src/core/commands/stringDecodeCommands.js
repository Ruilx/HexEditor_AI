/**
 * commands/stringDecodeCommands.js
 *
 * 字符串解码区域相关 Command：
 *   - StringDecodeAddCommand  添加解码区域（undo = 移除该区域）
 */

export class StringDecodeAddCommand {
  /**
   * @param {string} regionId              已添加区域的 id
   * @param {object} stringDecodeStore
   */
  constructor(regionId, stringDecodeStore) {
    this.description = `addStringDecodeRegion ${regionId}`
    this._regionId = regionId
    this._stringDecodeStore = stringDecodeStore
  }

  /** 区域已在 dialog onOk 中添加，execute 为空 */
  execute() {}

  undo() {
    this._stringDecodeStore.removeRegion(this._regionId)
  }
}
