import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * editorStore — 编辑器交互状态
 *
 * 涵盖：光标、选区、编辑模式、对话框开关、撤销/重做调度
 */
export const useEditorStore = defineStore('editor', () => {
  // ── 光标与选区 ──────────────────────────────────────────────
  const cursorOffset = ref(null)          // 当前光标所在字节偏移量
  const selectionStart = ref(null)        // 选区起点
  const selectionEnd = ref(null)          // 选区终点（可小于起点）
  const _isDragging = ref(false)

  const hasSelection = computed(() =>
    selectionStart.value !== null && selectionEnd.value !== null &&
    selectionStart.value !== selectionEnd.value
  )

  const selectionRange = computed(() => {
    if (!hasSelection.value) return { start: cursorOffset.value, end: cursorOffset.value }
    const s = Math.min(selectionStart.value, selectionEnd.value)
    const e = Math.max(selectionStart.value, selectionEnd.value)
    return { start: s, end: e }
  })

  const selectionLength = computed(() => {
    if (!hasSelection.value) return 0
    return selectionRange.value.end - selectionRange.value.start + 1
  })

  function isInSelection(offset) {
    if (!hasSelection.value) return false
    const { start, end } = selectionRange.value
    return offset >= start && offset <= end
  }

  function setCursor(offset) {
    clearInputBuffer()  // 切换位置时清除输入缓冲
    cursorOffset.value = offset
    selectionStart.value = offset
    selectionEnd.value = offset
  }

  function startSelection(offset) {
    selectionStart.value = offset
    selectionEnd.value = offset
    _isDragging.value = true
  }

  function extendSelection(offset) {
    selectionEnd.value = offset
    cursorOffset.value = offset
  }

  function selectAll() {
    // fileStore 中的 size 通过依赖注入在调用时获取
    // 此处发出事件，由 HexEditor 处理
    _selectAllFlag.value++
  }

  const _selectAllFlag = ref(0)

  // ── 键盘输入状态 ──────────────────────────────────────────────
  // 半字节输入缓冲：记录当前正在输入的字节
  const inputBuffer = ref({ offset: null, highNibble: null })

  /**
   * 处理十六进制字符输入（0-9a-fA-F）
   * @param {string} char - 单个十六进制字符
   */
  function handleHexInput(char) {
    if (cursorOffset.value === null) return

    const nibble = parseInt(char, 16)
    if (isNaN(nibble)) return

    // 如果是新位置或上次输入已完成，开始新字节输入
    if (inputBuffer.value.offset !== cursorOffset.value || inputBuffer.value.highNibble === null) {
      inputBuffer.value = { offset: cursorOffset.value, highNibble: nibble }
    } else {
      // 完成字节输入（高4位 + 低4位）
      const byteValue = (inputBuffer.value.highNibble << 4) | nibble
      commitByte(cursorOffset.value, byteValue)
      inputBuffer.value = { offset: null, highNibble: null }
    }
  }

  /**
   * 提交完整字节到文件缓冲区
   * @param {number} offset
   * @param {number} value - 0-255
   */
  function commitByte(offset, value) {
    // 由 HexGrid 调用 fileStore.writeBytes
    // 此处触发一个事件，让组件处理
    _commitByteFlag.value = { offset, value, timestamp: Date.now() }
  }

  const _commitByteFlag = ref({ offset: null, value: null, timestamp: 0 })

  /**
   * 清除输入缓冲（切换光标位置时调用）
   */
  function clearInputBuffer() {
    inputBuffer.value = { offset: null, highNibble: null }
  }

  // ── 编辑模式 ────────────────────────────────────────────────
  const insertMode = ref(true)            // true=插入，false=替换

  function toggleInsertMode() {
    insertMode.value = !insertMode.value
  }

  // ── 大小端 ───────────────────────────────────────────────────
  const endian = ref('le')               // 'le' | 'be'

  function toggleEndian() {
    endian.value = endian.value === 'le' ? 'be' : 'le'
  }

  // ── 对话框开关 ───────────────────────────────────────────────
  const findDialogOpen = ref(false)
  const settingsDialogOpen = ref(false)
  const settingsDialogTab = ref('font')
  const tagEditorOpen = ref(false)
  const editingTagId = ref(null)         // null=新建，字符串=编辑现有标签
  const stringDecodeDialogOpen = ref(false)

  function openFindDialog() { findDialogOpen.value = true }
  function closeFindDialog() { findDialogOpen.value = false }
  function openReplaceDialog() { findDialogOpen.value = true }

  function openSettingsDialog(tab = 'font') {
    settingsDialogTab.value = tab
    settingsDialogOpen.value = true
  }
  function closeSettingsDialog() { settingsDialogOpen.value = false }

  function openTagEditor(tagId = null) {
    editingTagId.value = tagId
    tagEditorOpen.value = true
  }
  function closeTagEditor() {
    tagEditorOpen.value = false
    editingTagId.value = null
  }

  function openStringDecodeDialog() { stringDecodeDialogOpen.value = true }
  function closeStringDecodeDialog() { stringDecodeDialogOpen.value = false }

  // ── 编辑操作（调度到 fileStore，此处只声明接口） ──────────────
  // 实际逻辑由各组件配合 fileStore 实现，此处提供统一入口

  function undo() {
    // TODO Phase 3: 调用 EditHistory.undo()
    console.warn('[editorStore] undo: 未实现')
  }

  function redo() {
    // TODO Phase 3: 调用 EditHistory.redo()
    console.warn('[editorStore] redo: 未实现')
  }

  /**
   * 复制选中字节为十六进制字符串
   */
  async function copy() {
    if (!hasSelection.value) return
    
    // 需要在组件中注入 fileStore
    _copyFlag.value++
  }

  const _copyFlag = ref(0)

  /**
   * 粘贴十六进制字符串
   */
  async function paste() {
    if (cursorOffset.value === null) return
    
    // 需要在组件中注入 fileStore
    _pasteFlag.value++
  }

  const _pasteFlag = ref(0)

  /**
   * 剪切（复制后删除）
   */
  async function cut() {
    if (!hasSelection.value) return
    
    await copy()
    const { start, end } = selectionRange.value
    _cutFlag.value = { start, end, timestamp: Date.now() }
  }

  const _cutFlag = ref({ start: null, end: null, timestamp: 0 })

  function copyOffsetDec() {
    if (cursorOffset.value !== null) {
      navigator.clipboard.writeText(String(cursorOffset.value))
    }
  }

  function copyOffsetHex() {
    if (cursorOffset.value !== null) {
      navigator.clipboard.writeText('0x' + cursorOffset.value.toString(16).toUpperCase())
    }
  }

  function deleteSelectedTag() {
    // TODO Phase 5: 调用 tagStore.deleteTag
    console.warn('[editorStore] deleteSelectedTag: 未实现')
  }

  function openSetFileSizeDialog() {
    // TODO Phase 6: 实现调整文件大小对话框
    console.warn('[editorStore] openSetFileSizeDialog: 未实现')
  }

  function findNext(pattern) {
    // TODO Phase 6: 实现查找
    console.warn('[editorStore] findNext: 未实现')
    return false
  }

  function findAll(pattern) {
    console.warn('[editorStore] findAll: 未实现')
    return 0
  }

  function replaceCurrent(pattern, replacement) {
    console.warn('[editorStore] replaceCurrent: 未实现')
    return false
  }

  function replaceAll(pattern, replacement) {
    console.warn('[editorStore] replaceAll: 未实现')
    return 0
  }

  return {
    cursorOffset,
    selectionStart,
    selectionEnd,
    hasSelection,
    selectionRange,
    selectionLength,
    isInSelection,
    setCursor,
    startSelection,
    extendSelection,
    selectAll,
    _selectAllFlag,
    inputBuffer,
    handleHexInput,
    commitByte,
    clearInputBuffer,
    _commitByteFlag,
    copy,
    paste,
    cut,
    _copyFlag,
    _pasteFlag,
    _cutFlag,
    insertMode,
    toggleInsertMode,
    endian,
    toggleEndian,
    findDialogOpen,
    settingsDialogOpen,
    settingsDialogTab,
    tagEditorOpen,
    editingTagId,
    openFindDialog,
    closeFindDialog,
    openReplaceDialog,
    openSettingsDialog,
    closeSettingsDialog,
    openTagEditor,
    closeTagEditor,
    stringDecodeDialogOpen,
    openStringDecodeDialog,
    closeStringDecodeDialog,
    undo,
    redo,
    cut,
    copy,
    paste,
    copyOffsetDec,
    copyOffsetHex,
    deleteSelectedTag,
    openSetFileSizeDialog,
    findNext,
    findAll,
    replaceCurrent,
    replaceAll
  }
})
