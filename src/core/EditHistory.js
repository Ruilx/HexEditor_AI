/**
 * EditHistory — 命令模式撤销/重做栈
 *
 * 每个历史记录（Command）需实现：
 * {
 *   execute(): void  — 执行操作
 *   undo(): void     — 撤销操作
 *   description: string  — 描述（可选，用于调试）
 * }
 *
 * TODO Phase 3: 完整实现各类 Command 子类
 *   - WriteCommand（替换字节）
 *   - InsertCommand（插入字节）
 *   - DeleteCommand（删除字节）
 *   - CompositeCommand（批量操作合并为一次撤销）
 */
export default class EditHistory {
  /**
   * @param {number} maxDepth 最大历史深度（默认 200）
   */
  constructor(maxDepth = 200) {
    /** @type {Array<Command>} */
    this._undoStack = []
    /** @type {Array<Command>} */
    this._redoStack = []
    this._maxDepth = maxDepth
  }

  /**
   * 执行并记录一个命令
   * @param {Command} command
   */
  execute(command) {
    command.execute()
    this._undoStack.push(command)
    if (this._undoStack.length > this._maxDepth) {
      this._undoStack.shift()
    }
    // 新操作后清空重做栈
    this._redoStack = []
  }

  /**
   * 撤销最近一个命令
   * @returns {boolean} 是否成功
   */
  undo() {
    const command = this._undoStack.pop()
    if (!command) return false
    command.undo()
    this._redoStack.push(command)
    return true
  }

  /**
   * 重做最近撤销的命令
   * @returns {boolean} 是否成功
   */
  redo() {
    const command = this._redoStack.pop()
    if (!command) return false
    command.execute()
    this._undoStack.push(command)
    return true
  }

  get canUndo() { return this._undoStack.length > 0 }
  get canRedo() { return this._redoStack.length > 0 }

  /** 清空所有历史（切换文件时） */
  clear() {
    this._undoStack = []
    this._redoStack = []
  }
}
