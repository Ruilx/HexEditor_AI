import { ref, shallowRef } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

// 内置解释器（Phase 4 逐步填充）
// import IntegerInterpreter from './interpreters/IntegerInterpreter'
// import FloatInterpreter from './interpreters/FloatInterpreter'
// ... 其余解释器

/**
 * PluginManager — 解释器插件注册与调用管理
 *
 * 用法（在组件中）：
 *   const pluginManager = usePluginManager()
 *   const results = pluginManager.interpretFixed(fileStore, offset, endian)
 */

/** 已注册的解释器列表 */
const _interpreters = shallowRef([])

/**
 * 注册一个解释器实例
 * @param {BaseInterpreter} interpreter
 */
export function registerInterpreter(interpreter) {
  _interpreters.value = [..._interpreters.value, interpreter]
}

/**
 * 用于组件内使用的 PluginManager 接口
 */
export function usePluginManager() {
  const settingsStore = useSettingsStore()

  /**
   * 对固定长度解释器进行批量解释
   * @param {import('@/stores/fileStore').FileStore} fileStore
   * @param {number} offset  光标偏移量
   * @param {'le'|'be'} endian
   * @returns {Array<{ name, displayName, value }>}
   */
  function interpretFixed(fileStore, offset, endian) {
    const enabled = settingsStore.enabledInterpreters
    const results = []

    for (const interp of _interpreters.value) {
      if (!interp.isFixedLength) continue
      if (!enabled.includes(interp.name)) continue

      const bytes = fileStore.getBytes(offset, interp.length)
      if (bytes.length < interp.length) continue   // 数据不够，跳过

      const dv = new DataView(bytes.buffer)
      let value
      try {
        value = interp.interpret(dv, bytes.length, endian)
      } catch {
        value = '—'
      }

      // 将多行返回值（"Label: val\nLabel2: val2\n..."）展开为独立条目
      if (typeof value === 'string' && value.includes('\n')) {
        for (const line of value.split('\n')) {
          const match = line.match(/^(.+?):\s*(.*)$/)
          if (match) {
            results.push({ name: `${interp.name}__${match[1]}`, displayName: match[1], value: match[2] })
          } else if (line.trim()) {
            results.push({ name: interp.name, displayName: interp.displayName, value: line })
          }
        }
      } else {
        results.push({ name: interp.name, displayName: interp.displayName, value })
      }
    }

    return results
  }

  /**
   * 对选中长度解释器进行批量解释（含延迟计算）
   * @param {import('@/stores/fileStore').FileStore} fileStore
   * @param {number} start
   * @param {number} length
   * @param {'le'|'be'} endian
   * @returns {Array<{ name, displayName, value }>}
   */
  function interpretVariable(fileStore, start, length, endian) {
    const enabled = settingsStore.enabledInterpreters
    const results = []

    for (const interp of _interpreters.value) {
      if (interp.isFixedLength) continue
      if (!enabled.includes(interp.name)) continue

      // 延迟计算由各组件配合 watch + debounce 实现（Phase 4 完善）
      results.push({ name: interp.name, displayName: interp.displayName, value: '计算中…' })
    }

    return results
  }

  return { interpretFixed, interpretVariable }
}

// ── 在模块加载时注册所有内置解释器 ──────────────────────────────
import IntegerInterpreter from './interpreters/IntegerInterpreter.js'
import Float32Interpreter from './interpreters/Float32Interpreter.js'
import Float64Interpreter from './interpreters/Float64Interpreter.js'
import AsciiInterpreter from './interpreters/AsciiInterpreter.js'
import Utf8Interpreter from './interpreters/Utf8Interpreter.js'

// 注册基础解释器
registerInterpreter(new IntegerInterpreter())
registerInterpreter(new Float32Interpreter())
registerInterpreter(new Float64Interpreter())
registerInterpreter(new AsciiInterpreter())
registerInterpreter(new Utf8Interpreter())
