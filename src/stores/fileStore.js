import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import FileBuffer from '@/core/FileBuffer'

/**
 * fileStore — 管理所有已打开文件的状态
 *
 * 每个 openedFile 对象结构：
 * {
 *   id: string,         // 唯一 ID（UUID）
 *   name: string,       // 文件名
 *   size: number,       // 文件字节数
 *   dirty: boolean,     // 是否有未保存修改
 *   buffer: FileBuffer  // 核心数据缓冲（Piece Table）
 * }
 */
export const useFileStore = defineStore('file', () => {
  const openedFiles = ref([])
  const activeFileId = ref(null)

  const activeFile = computed(() =>
    openedFiles.value.find(f => f.id === activeFileId.value) ?? null
  )

  /**
   * 新建空文件
   */
  function newFile() {
    const id = crypto.randomUUID()
    const buffer = new FileBuffer()
    const file = { id, name: '新文件.bin', size: 0, dirty: true, buffer }
    openedFiles.value.push(file)
    activeFileId.value = id
  }

  /**
   * 从 File 对象打开文件（浏览器 File API）
   * @param {File} file
   */
  async function openFile(file) {
    // 检查是否已打开同名文件（简单去重）
    const existing = openedFiles.value.find(f => f.name === file.name)
    if (existing) {
      activeFileId.value = existing.id
      return
    }

    const id = crypto.randomUUID()
    const buffer = new FileBuffer()
    await buffer.loadFile(file)

    const entry = {
      id,
      name: file.name,
      size: file.size,
      dirty: false,
      buffer
    }
    openedFiles.value.push(entry)
    activeFileId.value = id
  }

  /**
   * 保存（下载）当前文件
   */
  async function saveFile() {
    if (!activeFile.value) return
    const data = await activeFile.value.buffer.toUint8Array()
    downloadBytes(data, activeFile.value.name)
    activeFile.value.dirty = false
  }

  /**
   * 另存为（弹出文件名输入，暂用 prompt 占位，后续用对话框替换）
   */
  async function saveFileAs() {
    if (!activeFile.value) return
    const name = window.prompt('文件名', activeFile.value.name)
    if (!name) return
    const data = await activeFile.value.buffer.toUint8Array()
    downloadBytes(data, name)
  }

  /**
   * 关闭文件标签
   * @param {string} id
   */
  function closeFile(id) {
    const idx = openedFiles.value.findIndex(f => f.id === id)
    if (idx === -1) return
    openedFiles.value.splice(idx, 1)
    if (activeFileId.value === id) {
      activeFileId.value = openedFiles.value[idx]?.id ?? openedFiles.value[idx - 1]?.id ?? null
    }
  }

  /**
   * 切换当前活动文件
   * @param {string} id
   */
  function setActiveFile(id) {
    activeFileId.value = id
  }

  /**
   * 获取当前文件指定偏移量的字节值（用于渲染）
   * @param {number} offset
   * @returns {number|null}
   */
  function getByte(offset) {
    if (!activeFile.value) return null
    return activeFile.value.buffer.getByte(offset)
  }

  /**
   * 读取当前文件指定范围的字节（返回 Uint8Array）
   * @param {number} start
   * @param {number} length
   * @returns {Uint8Array}
   */
  function getBytes(start, length) {
    if (!activeFile.value) return new Uint8Array(0)
    return activeFile.value.buffer.getBytes(start, length)
  }

  /**
   * 写入字节（供编辑器调用，更新 dirty 标志）
   * @param {number} offset
   * @param {Uint8Array} bytes
   * @param {'insert'|'replace'} mode
   */
  function writeBytes(offset, bytes, mode) {
    if (!activeFile.value) return
    activeFile.value.buffer.write(offset, bytes, mode)
    activeFile.value.size = activeFile.value.buffer.length
    activeFile.value.dirty = true
  }

  /**
   * 删除字节
   * @param {number} offset
   * @param {number} length
   */
  function deleteBytes(offset, length) {
    if (!activeFile.value) return
    activeFile.value.buffer.delete(offset, length)
    activeFile.value.size = activeFile.value.buffer.length
    activeFile.value.dirty = true
  }

  return {
    openedFiles,
    activeFileId,
    activeFile,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile,
    setActiveFile,
    getByte,
    getBytes,
    writeBytes,
    deleteBytes
  }
})

// ── 工具函数 ────────────────────────────────────────────────────
function downloadBytes(uint8Array, filename) {
  const blob = new Blob([uint8Array], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
