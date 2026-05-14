import { defineStore } from 'pinia'
import { computed } from 'vue'
import EditHistory from '@/core/EditHistory'

/**
 * historyStore — 撤销/重做历史管理（Pinia 包装层）
 *
 * 每个操作通过 execute(command) 推入历史栈。
 * Command 对象需实现：
 *   execute(): void   — 执行操作（在 execute 调用前操作已完成时可为空）
 *   undo(): void      — 撤销操作
 *   description?: string — 可选描述
 */
export const useHistoryStore = defineStore('history', () => {
  const _history = new EditHistory(200)

  /**
   * 执行并记录一个命令
   * @param {object} command
   */
  function execute(command) {
    _history.execute(command)
  }

  /**
   * 记录一个已执行完的命令（跳过 execute() 调用，仅入栈）
   * 用于对话框场景：dialog 已完成操作，只需记录撤销方式
   * @param {object} command  需实现 undo()（execute() 可为空函数）
   */
  function record(command) {
    _history._undoStack.push(command)
    if (_history._undoStack.length > _history._maxDepth) {
      _history._undoStack.shift()
    }
    _history._redoStack = []
  }

  /**
   * 撤销最近一个命令
   * @returns {boolean}
   */
  function undo() {
    return _history.undo()
  }

  /**
   * 重做最近撤销的命令
   * @returns {boolean}
   */
  function redo() {
    return _history.redo()
  }

  const canUndo = computed(() => _history.canUndo)
  const canRedo = computed(() => _history.canRedo)

  /**
   * 清空所有历史（切换文件时调用）
   */
  function clear() {
    _history.clear()
  }

  return { execute, record, undo, redo, canUndo, canRedo, clear }
})
