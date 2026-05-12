<template>
  <div 
    ref="gridRef"
    class="hex-grid" 
    tabindex="0"
    @keydown="onKeydown"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
    @dragstart.prevent
    @mousedown="onGridMousedown"
  >
    <div
      v-for="row in rows"
      :key="row.rowIndex"
      class="hex-grid__row-group"
    >
      <!-- 左列：偏移量 -->
      <div class="hex-grid__offset">
        {{ formatOffset(row.offset) }}
      </div>

      <!-- 中列：字节数据行 + 标签行，border-right 作为连续分隔线 -->
      <div class="hex-grid__data-col">
        <!-- 字节数据子行 -->
        <div class="hex-grid__bytes">
          <span
            v-for="(byte, colIdx) in getRowBytes(row.rowIndex)"
            :key="colIdx"
            class="hex-grid__byte"
            :class="getByteClass(row.offset + colIdx)"
            :style="getByteStyle(row.offset + colIdx)"
            :data-offset="row.offset + colIdx"
            @mousedown="onByteMousedown(row.offset + colIdx, $event)"
            @mouseenter="onByteMouseenter(row.offset + colIdx, $event)"
          >
            {{ byte !== null ? byte.toString(16).toUpperCase().padStart(2, '0') : '  ' }}
          </span>
        </div>

        <!-- 标签子行 -->
        <div class="hex-grid__tag-segments">
          <div
            v-for="tag in getTagsForRow(row)"
            :key="tag.id"
            class="hex-grid__tag-label"
            :style="getTagSegmentStyle(tag, row)"
            :data-tag-id="tag.id"
            @click.stop="onTagLabelClick(tag)"
          >
            {{ tag.label }}
          </div>
        </div>
      </div>

      <!-- 右列：已解码文本 -->
      <div
        class="hex-grid__text"
        :style="{ width: (settingsStore.bytesPerRow * charCellW + 16) + 'px' }"
      >
        <span
          v-for="(char, colIdx) in getRowDecoded(row.rowIndex)"
          :key="colIdx"
          class="hex-grid__char"
          :class="getByteClass(row.offset + colIdx)"
          :style="getByteStyle(row.offset + colIdx)"
          :data-offset="row.offset + colIdx"
          @mousedown="onByteMousedown(row.offset + colIdx, $event)"
          @mouseenter="onByteMouseenter(row.offset + colIdx, $event)"
        >
          {{ char !== null ? char : '' }}
        </span>
      </div>

      <!-- 字符串解码列（按需显示） -->
      <div
        v-if="stringDecodeStore.regions.length > 0"
        class="hex-grid__str-col"
      >
        <!-- 字符行 -->
        <div class="hex-grid__str-chars"
          :style="{ width: (settingsStore.bytesPerRow * charCellW + charCellW) + 'px' }"
        >
          <span
            v-for="colIdx in settingsStore.bytesPerRow"
            :key="colIdx - 1"
            class="hex-grid__str-char"
          >{{ getStrChar(row.offset + colIdx - 1) }}</span>
        </div>
        <!-- 标签条 -->
        <div class="hex-grid__str-segments">
          <div
            v-for="region in stringDecodeStore.getRegionsInRow(row.offset, row.offset + settingsStore.bytesPerRow - 1)"
            :key="region.id"
            class="hex-grid__str-label"
            :style="getStrSegmentStyle(region, row)"
          >
            {{ region.encoding }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFileStore } from '@/stores/fileStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTagStore } from '@/stores/tagStore'
import { useStringDecodeStore } from '@/stores/stringDecodeStore'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  startRowIndex: { type: Number, default: 0 }
})

const fileStore = useFileStore()
const tagStore = useTagStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const stringDecodeStore = useStringDecodeStore()

// 字体相关尺寸（与 HexEditor.vue CSS 变量保持一致）
const byteCellW = computed(() => Math.round(settingsStore.fontSize * 24 / 13))
const charCellW = computed(() => Math.round(settingsStore.fontSize * 11 / 13))

const gridRef = ref(null)
const isComposing = ref(false)  // 输入法状态

// ── 键盘事件处理 ──────────────────────────────────────────────

/**
 * 处理键盘按下事件
 */
function onKeydown(event) {
  // 输入法激活时忽略
  if (isComposing.value) return

  const key = event.key.toLowerCase()

  // 十六进制字符输入 (0-9a-f)
  if (/^[0-9a-f]$/.test(key)) {
    event.preventDefault()
    editorStore.handleHexInput(key)
    return
  }

  // 方向键
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
    event.preventDefault()
    handleArrowKey(key)
    return
  }

  // Backspace / Delete
  if (key === 'backspace' || key === 'delete') {
    event.preventDefault()
    handleDeleteKey(key)
    return
  }

  // Ctrl+Z / Ctrl+Y (撤销/重做)
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') {
      event.preventDefault()
      editorStore.undo()
    } else if (key === 'y') {
      event.preventDefault()
      editorStore.redo()
    } else if (key === 'c') {
      event.preventDefault()
      editorStore.copy()
    } else if (key === 'v') {
      event.preventDefault()
      editorStore.paste()
    } else if (key === 'x') {
      event.preventDefault()
      editorStore.cut()
    }
  }
}

/**
 * 处理方向键移动光标
 */
function handleArrowKey(key) {
  if (editorStore.cursorOffset === null) return
  if (!fileStore.activeFile) return

  const bpr = settingsStore.bytesPerRow
  const fileSize = fileStore.activeFile.size
  let newOffset = editorStore.cursorOffset

  switch (key) {
    case 'arrowleft':
      newOffset = Math.max(0, newOffset - 1)
      break
    case 'arrowright':
      newOffset = Math.min(fileSize - 1, newOffset + 1)
      break
    case 'arrowup':
      newOffset = Math.max(0, newOffset - bpr)
      break
    case 'arrowdown':
      newOffset = Math.min(fileSize - 1, newOffset + bpr)
      break
  }

  editorStore.setCursor(newOffset)
}

/**
 * 处理删除键
 */
function handleDeleteKey(key) {
  if (editorStore.hasSelection) {
    const { start, end } = editorStore.selectionRange
    const length = end - start + 1
    fileStore.deleteBytes(start, length)
    tagStore.adjustTagsForDeletion(start, length)
    stringDecodeStore.adjustForDeletion(start, length, fileStore)
    editorStore.setCursor(start)
  } else if (key === 'backspace' && editorStore.cursorOffset > 0) {
    const delOffset = editorStore.cursorOffset - 1
    fileStore.deleteBytes(delOffset, 1)
    tagStore.adjustTagsForDeletion(delOffset, 1)
    stringDecodeStore.adjustForDeletion(delOffset, 1, fileStore)
    editorStore.setCursor(delOffset)
  } else if (key === 'delete' && editorStore.cursorOffset !== null) {
    fileStore.deleteBytes(editorStore.cursorOffset, 1)
    tagStore.adjustTagsForDeletion(editorStore.cursorOffset, 1)
    stringDecodeStore.adjustForDeletion(editorStore.cursorOffset, 1, fileStore)
  }
}

/**
 * 输入法事件（屏蔽输入法）
 */
function onCompositionStart() {
  isComposing.value = true
}

function onCompositionEnd() {
  isComposing.value = false
}

// ── 监听提交字节事件 ──────────────────────────────────────────

watch(() => editorStore._commitByteFlag, (flag) => {
  if (flag.offset === null) return
  
  const bytes = new Uint8Array([flag.value])
  const mode = editorStore.insertMode ? 'insert' : 'replace'
  fileStore.writeBytes(flag.offset, bytes, mode)

  if (mode === 'insert') {
    tagStore.adjustTagsForInsertion(flag.offset, 1)
    stringDecodeStore.adjustForInsertion(flag.offset, 1, fileStore)
  } else {
    // 替换模式：更新受影响的字符串解码区域
    stringDecodeStore.updateAffectedRegions(flag.offset, 1, fileStore)
  }

  // 移动光标到下一个字节
  const nextOffset = flag.offset + 1
  if (nextOffset <= fileStore.activeFile.size) {
    editorStore.setCursor(nextOffset)
  }
}, { deep: true })
// ── 剪贴板操作 ────────────────────────────────────────────────────────────────────

// 监听复制事件
watch(() => editorStore._copyFlag, async () => {
  if (!editorStore.hasSelection) return
  
  const { start, end } = editorStore.selectionRange
  const length = end - start + 1
  const bytes = fileStore.getBytes(start, length)
  
  // 转为十六进制字符串（空格分隔）
  const hexString = Array.from(bytes)
    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
  
  try {
    await navigator.clipboard.writeText(hexString)
  } catch (err) {
    console.error('复制失败:', err)
  }
})

// 监听粘贴事件
watch(() => editorStore._pasteFlag, async () => {
  if (editorStore.cursorOffset === null) return
  
  try {
    const text = await navigator.clipboard.readText()
    
    // 解析十六进制字符串（支持多种分隔符）
    const hexStr = text.replace(/[^0-9a-fA-F]/g, '')
    if (hexStr.length === 0 || hexStr.length % 2 !== 0) {
      console.warn('无效的十六进制数据')
      return
    }
    
    const bytes = new Uint8Array(hexStr.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16)
    }
    
    const mode = editorStore.insertMode ? 'insert' : 'replace'
    fileStore.writeBytes(editorStore.cursorOffset, bytes, mode)

    if (mode === 'insert') {
      tagStore.adjustTagsForInsertion(editorStore.cursorOffset, bytes.length)
      stringDecodeStore.adjustForInsertion(editorStore.cursorOffset, bytes.length, fileStore)
    } else {
      stringDecodeStore.updateAffectedRegions(editorStore.cursorOffset, bytes.length, fileStore)
    }

    // 移动光标到粘贴内容之后
    editorStore.setCursor(editorStore.cursorOffset + bytes.length)
  } catch (err) {
    console.error('粘贴失败:', err)
  }
})

// 监听剪切事件
watch(() => editorStore._cutFlag, (flag) => {
  if (flag.start === null || flag.end === null) return
  
  const length = flag.end - flag.start + 1
  fileStore.deleteBytes(flag.start, length)
  tagStore.adjustTagsForDeletion(flag.start, length)
  stringDecodeStore.adjustForDeletion(flag.start, length, fileStore)
  editorStore.setCursor(flag.start)
}, { deep: true })
// 挂载时聚焦网格
onMounted(() => {
  gridRef.value?.focus()
})

// ── 渲染相关 ──────────────────────────────────────────────────

// 格式化偏移量（8位16进制）
function formatOffset(offset) {
  return offset.toString(16).toUpperCase().padStart(8, '0')
}

// 获取某行的字节数组（从 fileStore 读取）
function getRowBytes(rowIndex) {
  const bpr = settingsStore.bytesPerRow
  const start = rowIndex * bpr
  const bytes = []
  for (let i = 0; i < bpr; i++) {
    const offset = start + i
    const byte = fileStore.getByte(offset)
    bytes.push(byte)
  }
  return bytes
}

// 按 UTF-8 解码整行字节，返回每个字节列对应的显示字符数组
// result[i] = null  → 该列超出文件末尾（不显示）
// result[i] = '.'   → 非可打印 ASCII 字符或非 ASCII字节
// result[i] = char  → 可打印 ASCII 字符 (0x20-0x7E)
function getRowDecoded(rowIndex) {
  const bpr = settingsStore.bytesPerRow
  const start = rowIndex * bpr
  const result = new Array(bpr).fill(null)
  for (let i = 0; i < bpr; i++) {
    const b = fileStore.getByte(start + i)
    if (b === null) continue
    // 可打印 ASCII (0x20-0x7E) 和扩展 ASCII (0x80-0xFF) 均显示字符，控制符和 DEL(0x7F) 显示 '.'
    result[i] = (b >= 0x20 && b !== 0x7F) ? String.fromCharCode(b) : '.'
  }
  return result
}

// 获取字符串解码列指定 offset 的字符显示
function getStrChar(offset) {
  const c = stringDecodeStore.getCharAtOffset(offset)
  if (c === null || c === ' ') return ''
  return c
}

// 计算字符串区域标签条定位样式
function getStrSegmentStyle(region, row) {
  const bpr = settingsStore.bytesPerRow
  const rowStart = row.offset
  const segStart = Math.max(region.startOffset, rowStart)
  const segEnd = Math.min(region.endOffset, rowStart + bpr - 1)
  const cw = charCellW.value
  return {
    left: (segStart - rowStart) * cw + 'px',
    width: (segEnd - segStart + 1) * cw + 'px',
  }
}

// 获取字节单元格 CSS class
function getByteClass(offset) {
  const classes = []
  if (offset === editorStore.cursorOffset) classes.push('hex-grid__byte--cursor')
  if (editorStore.isInSelection(offset)) classes.push('hex-grid__byte--selected')
  return classes
}

// 获取字节单元格内联样式（用于标签颜色覆盖，光标/选区优先级更高）
function getByteStyle(offset) {
  if (offset === editorStore.cursorOffset) return {}
  if (editorStore.isInSelection(offset)) return {}
  const tag = tagStore.getTagAtOffset(offset)
  if (!tag) return {}
  return { backgroundColor: tag.bgColor, color: tag.fgColor }
}

// 获取某行包含的所有标签（可能跨越多行，此处只返回与该行重叠的部分）
function getTagsForRow(row) {
  const bpr = settingsStore.bytesPerRow
  return tagStore.getTagsInRow(row.offset, row.offset + bpr - 1)
}

// 计算标签在某行中的绝对定位样式
function getTagSegmentStyle(tag, row) {
  const bpr = settingsStore.bytesPerRow
  const rowStart = row.offset
  const segStart = Math.max(tag.startOffset, rowStart)
  const segEnd = Math.min(tag.endOffset, rowStart + bpr - 1)
  const bw = byteCellW.value
  return {
    left: (segStart - rowStart) * bw + 'px',
    width: (segEnd - segStart + 1) * bw + 'px',
    backgroundColor: tag.bgColor,
    color: tag.fgColor,
  }
}

// 点击标签：选中该标签覆盖的字节范围
function onTagLabelClick(tag) {
  editorStore.clearInputBuffer()
  editorStore.startSelection(tag.startOffset)
  editorStore.extendSelection(tag.endOffset)
}

// 点击 hex-grid 内非字节区域时取消选中
function onGridMousedown(event) {
  if (event.button !== 0) return
  // 点中字节/字符格：交给 onByteMousedown 处理
  if (event.target.closest('[data-offset]')) return
  // 点中标签条：不干扰标签点击逻辑
  if (event.target.closest('[data-tag-id]')) return
  // 其余区域（偏移列、行间距、字符串解码列等）→ 取消选中
  editorStore.setCursor(null)
}

// 鼠标按下：设置光标 / 开始选区
function onByteMousedown(offset, event) {
  if (event.button !== 0) return
  if (event.shiftKey) {
    editorStore.extendSelection(offset)
  } else {
    editorStore.setCursor(offset)
    editorStore.startSelection(offset)
  }
}

// 鼠标移动（按住时）：扩展选区
function onByteMouseenter(offset, event) {
  if (event.buttons === 1) {
    editorStore.extendSelection(offset)
  }
}
</script>

<style scoped>
.hex-grid {
  font-family: inherit; /* 继承父层（hex-editor__content）的字体设置 */
  font-size: inherit;
  color: #d4d4d4;
}

.hex-grid__row-group {
  display: flex;
  flex-direction: row;
  align-items: stretch; /* 所有列撑满整行高度（数据行 + 标签行） */
}

.hex-grid__row-group:hover {
  background: rgba(255, 255, 255, 0.03);
}

.hex-grid__offset {
  width: var(--hex-offset-w);
  padding: 0 4px 0 8px;
  color: #888;
  flex: 0 0 auto;
  align-self: flex-start;       /* 不跟随标签行拉伸，只有数据行高 */
  height: var(--hex-row-h);
  display: flex;
  align-items: center;
  user-select: none;
}

/* ── 中列：字节数据 + 标签，border-right 作连续分隔线 ── */

.hex-grid__data-col {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  border-right: 1px solid #555;
}

.hex-grid__bytes {
  display: flex;
  flex: 0 0 auto;
  height: var(--hex-row-h);
  align-items: center;
}

.hex-grid__byte {
  width: var(--hex-byte-w);
  text-align: center;
  cursor: default;
  border-radius: 2px;
  user-select: none;
}

.hex-grid__byte:hover {
  background: rgba(255, 255, 255, 0.08);
}

.hex-grid__byte--cursor {
  background: #1677ff !important;
  color: #fff;
}

.hex-grid__byte--selected {
  background: #264f78;
  color: #d4d4d4;
}

/* ── 右列：已解码文本 ── */

.hex-grid__text {
  /* width 由 :style 动态绑定 */
  display: flex;
  padding: 0 8px 0 10px;        /* 10px 左间距，紧接分隔线后 */
  flex: 0 0 auto;
  align-self: flex-start;       /* 不跟随标签行拉伸 */
  height: var(--hex-row-h);
  align-items: center;
}

.hex-grid__char {
  width: var(--hex-char-w);
  text-align: center;
  cursor: default;
  user-select: none;
  border-radius: 1px;
}

.hex-grid__char:hover {
  background: rgba(255, 255, 255, 0.08);
}

.hex-grid__char.hex-grid__byte--cursor {
  background: #1677ff !important;
  color: #fff;
}

.hex-grid__char.hex-grid__byte--selected {
  background: #264f78;
}

/* ── 标签子行（在 hex-grid__data-col 内） ── */

.hex-grid__tag-segments {
  position: relative;
  width: 100%;
  height: var(--hex-tag-h);
  overflow: hidden;
}

.hex-grid__tag-label {
  position: absolute;
  top: 1px;
  height: calc(var(--hex-tag-h) - 2px);
  line-height: calc(var(--hex-tag-h) - 2px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85em;
  padding: 0 4px;
  border-radius: 2px;
  cursor: pointer;
  user-select: none;
}

.hex-grid__tag-label:hover {
  filter: brightness(1.15);
}

/* ── 字符串解码列 ───────────────────────────── */

.hex-grid__str-col {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  border-left: 1px solid #555;
}

.hex-grid__str-chars {
  display: flex;
  height: var(--hex-row-h);
  align-items: center;
  padding-left: var(--hex-char-w); /* CJK 向左溢出的缓冲 padding */
  overflow: visible;
}

.hex-grid__str-char {
  width: var(--hex-char-w);
  text-align: right;        /* 多字节字符字形向左溢出 */
  overflow: visible;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  color: #ce9178;           /* 暖橙色区分普通 decoded 列 */
  font-family: 'Consolas', 'Noto Sans CJK SC', 'Microsoft YaHei', monospace;
}

.hex-grid__str-segments {
  position: relative;
  width: 100%;
  height: var(--hex-tag-h);
  overflow: hidden;
}

.hex-grid__str-label {
  position: absolute;
  top: 1px;
  height: calc(var(--hex-tag-h) - 2px);
  line-height: calc(var(--hex-tag-h) - 2px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75em;
  padding: 0 4px;
  border-radius: 2px;
  background: #3a3520;
  color: #ce9178;
  user-select: none;
}
</style>
