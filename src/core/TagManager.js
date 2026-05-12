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
   * 从 File 对象（用户选择的 .TAG 文件）解析标签列表
   * @param {File} tagFile
   * @returns {Promise<Tag[]>}
   */
  static async load(tagFile) {
    const text = await tagFile.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('无效的 .TAG 文件格式')
    }
    if (!data.tags || !Array.isArray(data.tags)) {
      throw new Error('.TAG 文件缺少 tags 字段')
    }
    return data.tags
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
