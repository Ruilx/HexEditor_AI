import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import FileBuffer from '@/core/FileBuffer'
import TagManager from '@/core/TagManager'
import { isElectron } from '@/utils/env'
import { useTagStore } from '@/stores/tagStore'

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

  // 每个文件独立保存标签快照（fileId → Tag[]）
  // 使用普通 Map，切换文件时通过 tagStore 同步响应式状态
  const _fileTagsMap = new Map()

  const activeFile = computed(() =>
    openedFiles.value.find(f => f.id === activeFileId.value) ?? null
  )

  /**
   * 新建文件
   * @param {string} [name='新文件.bin'] 文件名
   * @param {number} [size=0] 初始大小（字节，用 0x00 填充）
   */
  function newFile(name = '新文件.bin', size = 0) {
    const id = crypto.randomUUID()
    const buffer = new FileBuffer()
    if (size > 0) {
      buffer.write(0, new Uint8Array(size), 'insert')
    }
    const file = { id, name, size: buffer.length, dirty: true, buffer }
    openedFiles.value.push(file)
    _fileTagsMap.set(id, [])
    _switchActiveFile(id)
  }

  /**
   * 从 File 对象打开文件（浏览器 File API）
   * @param {File} file
   */
  async function openFile(file) {
    // 检查是否已打开同名文件（简单去重）
    const existing = openedFiles.value.find(f => f.name === file.name)
    if (existing) {
      _switchActiveFile(existing.id)
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
    _fileTagsMap.set(id, [])
    _switchActiveFile(id)

    // Electron 路径：自动在同目录查找同名 .TAG 文件
    if (isElectron && file.path) {
      const tagPath = file.path.replace(/\.[^.]+$/, '') + '.TAG'
      try {
        const content = await window.electronAPI?.readTextFile(tagPath)
        if (content) {
          const data = JSON.parse(content)
          const validation = TagManager.validateTagData(data, file.name)
          if (validation.valid) {
            _fileTagsMap.set(id, data.tags)
            const tagStore = useTagStore()
            tagStore.importTags(data.tags)
          }
        }
      } catch {
        // .TAG 文件不存在或无效，静默忽略
      }
    }
  }

  /**
   * 内部方法：切换活动文件，并同步 tagStore 的标签数据
   * @param {string|null} newId
   */
  function _switchActiveFile(newId) {
    // 保存当前文件的标签快照
    if (activeFileId.value !== null) {
      const tagStore = useTagStore()
      _fileTagsMap.set(activeFileId.value, tagStore.exportTags())
      tagStore.clearTags()
    }
    activeFileId.value = newId
    // 恢复新文件的标签
    if (newId !== null) {
      const tagStore = useTagStore()
      tagStore.importTags(_fileTagsMap.get(newId) ?? [])
    }
  }

  /**
   * 保存（下载）当前文件；若文件有标签则同时下载 .TAG 文件
   */
  async function saveFile() {
    if (!activeFile.value) return
    const data = await activeFile.value.buffer.toUint8Array()
    downloadBytes(data, activeFile.value.name)
    activeFile.value.dirty = false

    // 同步保存 .TAG 文件（若有标签）
    const tagStore = useTagStore()
    const tags = tagStore.exportTags()
    if (tags.length > 0) {
      // 浏览器中连续下载需轻微延迟，避免被浏览器阻止
      await new Promise(resolve => setTimeout(resolve, 200))
      TagManager.save(activeFile.value.name, tags)
    }
  }

  /**
   * 在浏览器环境中，为当前活动文件加载 .TAG 标签文件
   * @param {File} tagFile - 用户选择的 .TAG 文件
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async function loadTagFileForActive(tagFile) {
    if (!activeFile.value) return { success: false, error: '没有活动文件' }
    const result = await TagManager.validateAndLoad(tagFile, activeFile.value.name)
    if (!result.valid) return { success: false, error: result.error }
    const tagStore = useTagStore()
    tagStore.importTags(result.data.tags)
    _fileTagsMap.set(activeFileId.value, result.data.tags)
    return { success: true }
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
    _fileTagsMap.delete(id)
    if (activeFileId.value === id) {
      const nextId = openedFiles.value[idx]?.id ?? openedFiles.value[idx - 1]?.id ?? null
      // 当前文件已从列表移除，直接置 null 再切换（避免保存已删除文件的标签）
      activeFileId.value = null
      _switchActiveFile(nextId)
    }
  }

  /**
   * 切换当前活动文件
   * @param {string} id
   */
  function setActiveFile(id) {
    _switchActiveFile(id)
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

  /**
   * 调整文件大小
   * @param {number} newSize  目标字节数（正整数）
   */
  function resizeFile(newSize) {
    if (!activeFile.value) return
    const currentSize = activeFile.value.size
    if (newSize === currentSize) return
    if (newSize > currentSize) {
      // 末尾追加 0x00 填充
      const padding = new Uint8Array(newSize - currentSize)
      activeFile.value.buffer.write(currentSize, padding, 'insert')
    } else {
      // 截断末尾多余字节
      activeFile.value.buffer.delete(newSize, currentSize - newSize)
    }
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
    loadTagFileForActive,
    getByte,
    getBytes,
    writeBytes,
    deleteBytes,
    resizeFile
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
