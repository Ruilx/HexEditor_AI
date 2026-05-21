/**
 * TagManager — .TAG 文件的读写管理
 *
 * .TAG 文件格式（JSON）：
 * {
 *   version: 1,
 *   sourceFile: string,    // 源文件名（用于校验）
 *   tags: [
 *     {
 *       id: string,
 *       startOffset: number,
 *       endOffset: number,
 *       label: string,
 *       note: string,
 *       fgColor: string,
 *       bgColor: string,
 *       dynamic: boolean
 *     }, ...
 *   ]
 * }
 *
 * 在 Web 环境下，由于无法直接访问文件系统，.TAG 文件通过以下方式处理：
 *   - 读取：用户打开文件时，自动弹出提示是否一并选择对应 .TAG 文件（Phase 5 实现）
 *   - 写入：通过下载触发保存（与主文件分开保存）
 *
 * TODO Phase 3: 完整实现加载/保存逻辑
 * TODO Electron: 通过 electronBridge 直接读写同目录 .TAG 文件
 */
export default class TagManager {
  /**
   * 校验 .TAG 文件数据结构是否合法
   * @param {object} data - 已解析的 JSON 对象
   * @param {string} [sourceFileName] - 当前二进制文件名（用于来源校验，可选）
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateTagData(data, sourceFileName) {
    if (!data || typeof data !== 'object')
      return { valid: false, error: '无效的文件格式（不是 JSON 对象）' }
    if (typeof data.version !== 'number')
      return { valid: false, error: '缺少 version 字段' }
    if (!Array.isArray(data.tags))
      return { valid: false, error: '缺少 tags 数组字段' }

    // 来源文件名匹配校验（忽略大小写，忽略扩展名）
    if (sourceFileName && data.sourceFile) {
      const srcBase = sourceFileName.replace(/\.[^.]+$/, '').toLowerCase()
      const tagBase = data.sourceFile.replace(/\.[^.]+$/, '').toLowerCase()
      if (srcBase && tagBase && srcBase !== tagBase) {
        return {
          valid: false,
          error: `标签文件来源（${data.sourceFile}）与当前文件（${sourceFileName}）不匹配`
        }
      }
    }

    // 每个标签必须有数值型偏移量
    for (const tag of data.tags) {
      if (typeof tag.startOffset !== 'number' || typeof tag.endOffset !== 'number') {
        return { valid: false, error: '标签数据缺少必要字段（startOffset / endOffset）' }
      }
    }

    return { valid: true }
  }

  /**
   * 从 File 对象加载并校验 .TAG 文件
   * @param {File} tagFile
   * @param {string} [sourceFileName] - 当前文件名（用于来源校验）
   * @returns {Promise<{ valid: boolean, data?: object, error?: string }>}
   */
  static async validateAndLoad(tagFile, sourceFileName) {
    let text
    try {
      text = await tagFile.text()
    } catch {
      return { valid: false, error: '读取文件失败' }
    }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { valid: false, error: '无效的 JSON 格式' }
    }
    const result = TagManager.validateTagData(data, sourceFileName)
    if (!result.valid) return result
    return { valid: true, data }
  }

  /**
   * 从 File 对象（用户选择的 .TAG 文件）解析标签列表（旧接口，保留兼容）
   * @param {File} tagFile
   * @returns {Promise<Tag[]>}
   */
  static async load(tagFile) {
    const result = await TagManager.validateAndLoad(tagFile)
    if (!result.valid) throw new Error(result.error)
    return result.data.tags
  }

  /**
   * 将标签列表序列化并触发下载为 .TAG 文件
   * @param {string} sourceFileName 源文件名（不含扩展名）
   * @param {Tag[]} tags
   */
  static save(sourceFileName, tags) {
    const data = {
      version: 1,
      sourceFile: sourceFileName,
      tags
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const tagFileName = sourceFileName.replace(/\.[^.]+$/, '') + '.TAG'
    a.href = url
    a.download = tagFileName
    a.click()
    URL.revokeObjectURL(url)
  }
}
