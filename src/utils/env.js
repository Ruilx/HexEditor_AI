/**
 * 运行环境检测
 * - Electron：window.process.versions.electron 存在
 * - 浏览器：否则
 */
export const isElectron =
  typeof window !== 'undefined' &&
  typeof window.process === 'object' &&
  typeof window.process.versions === 'object' &&
  typeof window.process.versions.electron === 'string'
