import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import FileBuffer from '@/core/FileBuffer'
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

  /** 当前右侧视图：'hex' | 'tag-json' */
  const activeView = ref('hex')

  const activeFile = computed(() =>
    openedFiles.value.find(f => f.id === activeFileId.value) ?? null
  )

  /**
   * 新建空文件
   */
  function newFile(name = '新文件.bin', size = 0) {
    const id = crypto.randomUUID()
    const buffer = new FileBuffer()
    if (size > 0) buffer.write(0, new Uint8Array(size), 'insert')
    const file = { id, name, size: buffer.length, dirty: true, buffer, tagData: [], tagFile: null, pendingTagLoad: false }
    openedFiles.value.push(file)
    activeFileId.value = id
    activeView.value = 'hex'
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
      activeView.value = 'hex'
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
      buffer,
      tagData: [],
      tagFile: null,
      pendingTagLoad: true   // 提示用户关联 .tag 文件
    }
    openedFiles.value.push(entry)
    activeFileId.value = id
    activeView.value = 'hex'
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
      activeView.value = 'hex'
    }
  }

  /**
   * 切换当前活动文件
   * @param {string} id
   */
  function setActiveFile(id) {
    if (id === activeFileId.value) return
    // 保存离开文件的标签快照
    if (activeFileId.value !== null) {
      const outgoing = openedFiles.value.find(f => f.id === activeFileId.value)
      if (outgoing) outgoing.tagData = useTagStore().serializeSnapshot()
    }
    activeFileId.value = id
    // 加载目标文件的标签
    const incoming = openedFiles.value.find(f => f.id === id)
    useTagStore().importTags(incoming?.tagData ?? [])
  }

  function setActiveView(view) {
    activeView.value = view
  }

  // ── 每文件标签数据持久化 ──────────────────────────────────────

  function setTagsForFile(id, tags) {
    const file = openedFiles.value.find(f => f.id === id)
    if (!file) return
    file.tagData = tags.map(t => ({ ...t }))
    if (file.tagFile) file.tagFile.dirty = true
  }

  function getTagsForFile(id) {
    const file = openedFiles.value.find(f => f.id === id)
    return file?.tagData ? file.tagData.map(t => ({ ...t })) : []
  }

  // ── .tag 文件管理 ─────────────────────────────────────────────

  function initTagFile() {
    if (!activeFile.value || activeFile.value.tagFile) return
    activeFile.value.tagFile = { name: activeFile.value.name + '.tag', dirty: true }
  }

  function markTagFileDirty() {
    if (activeFile.value?.tagFile) activeFile.value.tagFile.dirty = true
  }

  function clearTagFileDirty() {
    if (activeFile.value?.tagFile) activeFile.value.tagFile.dirty = false
  }

  function clearPendingTagLoad() {
    if (activeFile.value) activeFile.value.pendingTagLoad = false
  }

  async function loadTagFileForActive(file) {
    if (!activeFile.value) return { success: false, error: '当前没有打开的文件' }
    let text
    try { text = await file.text() }
    catch (e) { return { success: false, error: `读取文件失败：${e.message}` } }

    let parsed
    try { parsed = JSON.parse(text) }
    catch (e) { return { success: false, error: `JSON 解析失败：${e.message}` } }

    if (!Array.isArray(parsed)) {
      return { success: false, error: '格式错误：顶层必须是数组 []' }
    }
    for (let i = 0; i < parsed.length; i++) {
      const t = parsed[i]
      if (typeof t.startOffset !== 'number' || typeof t.endOffset !== 'number') {
        return { success: false, error: `第 ${i + 1} 项：startOffset 和 endOffset 必须是数字` }
      }
      if (t.startOffset < 0 || t.endOffset < t.startOffset) {
        return { success: false, error: `第 ${i + 1} 项：offset 范围无效` }
      }
    }

    const tags = parsed.map(t => ({
      id: t.id || crypto.randomUUID(),
      startOffset: t.startOffset,
      endOffset: t.endOffset,
      label: t.label || '',
      note: t.note || '',
      fgColor: t.fgColor || '#ffffff',
      bgColor: t.bgColor || '#1677ff',
      dynamic: t.dynamic || false
    }))

    activeFile.value.tagFile = { name: file.name, dirty: false }
    activeFile.value.tagData = tags.map(t => ({ ...t }))
    activeFile.value.pendingTagLoad = false

    // 懒调用 tagStore（避免顶层初始化时的循环依赖风险）
    useTagStore().importTags(tags)

    return { success: true }
  }

  function saveTagFileForActive(tags) {
    if (!activeFile.value?.tagFile) return
    const json = JSON.stringify(tags, null, 2)
    downloadText(json, activeFile.value.tagFile.name)
    activeFile.value.tagFile.dirty = false
    activeFile.value.tagData = tags.map(t => ({ ...t }))
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
    activeView,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    closeFile,
    setActiveFile,
    setActiveView,
    setTagsForFile,
    getTagsForFile,
    initTagFile,
    markTagFileDirty,
    clearTagFileDirty,
    clearPendingTagLoad,
    loadTagFileForActive,
    saveTagFileForActive,
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

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'application/json; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
