<template>
  <div class="hex-editor" @click.self="onClickOutside" @contextmenu="onContextMenu">
    <div v-if="!fileStore.activeFile" class="hex-editor__empty">
      <div class="hex-editor__empty-hint">
        <p>打开文件以开始编辑</p>
        <a-button type="primary" @click="onOpenFile">打开文件</a-button>
      </div>
      <!-- 隐藏的文件输入 -->
      <input ref="fileInputRef" type="file" style="display: none" @change="onFileSelected" />
    </div>

    <template v-else>
      <div
        class="hex-editor__content"
        @mousedown="hideContextMenu"
        :style="{
          fontFamily: settingsStore.fontFamily,
          fontSize: settingsStore.fontSize + 'px',
          '--hex-row-h': rowH + 'px',
          '--hex-tag-h': tagH + 'px',
          '--hex-byte-w': byteCellW + 'px',
          '--hex-char-w': charCellW + 'px',
          '--hex-offset-w': offsetColW + 'px',
        }"
      >
        <!-- 单一滚动容器：列头和内容共享横向滚动 -->
        <div ref="scrollContainerRef" class="hex-editor__scroll" @scroll="onScroll">
          <!-- 列头：纵向 sticky 置顶，横向随内容一起滚动 -->
          <div class="hex-editor__column-header">
            <div class="hex-editor__offset-header">Offset(h)</div>
            <div class="hex-editor__hex-header">
              <span
                v-for="col in settingsStore.bytesPerRow"
                :key="col - 1"
                class="hex-editor__col-label"
              >
                {{ (col - 1).toString(16).toUpperCase().padStart(2, '0') }}
              </span>
            </div>
            <div
              class="hex-editor__text-header"
              :style="{ width: (settingsStore.bytesPerRow * charCellW + 16) + 'px' }"
            >Decoded</div>
            <div
              v-if="stringDecodeStore.regions.length > 0"
              class="hex-editor__str-header"
              :style="{ width: (settingsStore.bytesPerRow * charCellW + charCellW + 16) + 'px' }"
            >字符串解码</div>
          </div>

          <!-- 撑开滚动高度的占位 -->
          <div :style="{ height: totalHeight + 'px', position: 'relative' }">
            <!-- 只渲染可见行 -->
            <div :style="{ transform: `translateY(${offsetY}px)` }">
              <HexGrid
                :rows="visibleRows"
                :startRowIndex="startRowIndex"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 数据信息面板 -->
      <DataInfoPanel class="hex-editor__data-panel" />
    </template>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :type="contextMenu.type"
      @cut="editorStore.cut()"
      @copy="editorStore.copy()"
      @paste="editorStore.paste()"
      @copyOffsetDec="editorStore.copyOffsetDec()"
      @copyOffsetHex="editorStore.copyOffsetHex()"
      @createTag="editorStore.openTagEditor()"
      @editTag="onEditTag"
      @deleteTag="onDeleteTag"
      @stringDecode="onStringDecode"
      @setFileSize="editorStore.openSetFileSizeDialog()"
      @displaySettings="editorStore.openSettingsDialog('dataInfo')"
    />

    <!-- 对话框 -->
    <FindReplace />
    <TagEditor />
    <SettingsDialog />
    <StringDecodeDialog />
    <SetFileSizeDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import HexGrid from './HexGrid.vue'
import OffsetColumn from './OffsetColumn.vue'
import DataInfoPanel from './DataInfoPanel.vue'
import ContextMenu from '@/components/menu/ContextMenu.vue'
import FindReplace from '@/components/dialogs/FindReplace.vue'
import TagEditor from '@/components/dialogs/TagEditor.vue'
import SettingsDialog from '@/components/dialogs/SettingsDialog.vue'
import StringDecodeDialog from '@/components/dialogs/StringDecodeDialog.vue'
import SetFileSizeDialog from '@/components/dialogs/SetFileSizeDialog.vue'
import { useFileStore } from '@/stores/fileStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTagStore } from '@/stores/tagStore'
import { useStringDecodeStore } from '@/stores/stringDecodeStore'
import { useHistoryStore } from '@/stores/historyStore'
import { TagDeleteCommand } from '@/core/commands/tagCommands'

const fileStore = useFileStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const tagStore = useTagStore()
const stringDecodeStore = useStringDecodeStore()
const historyStore = useHistoryStore()

const scrollContainerRef = ref(null)
const fileInputRef = ref(null)

// ── 字体相关尺寸（随 fontSize 等比缩放） ─────────────────────
// 基准：fontSize=13px 时各尺寸的设计值
// rowH=20  tagH=14  byteCellW=24  charCellW=11  offsetColW=90
const rowH      = computed(() => Math.round(settingsStore.fontSize * 20 / 13))
const tagH      = computed(() => Math.round(settingsStore.fontSize * 14 / 13))
const byteCellW = computed(() => Math.round(settingsStore.fontSize * 24 / 13))
const charCellW = computed(() => Math.round(settingsStore.fontSize * 11 / 13))
const offsetColW = computed(() => Math.round(settingsStore.fontSize * 90 / 13))

// ── 虚拟滚动 ──────────────────────────────────────────────────
const ROW_HEIGHT = computed(() => rowH.value + tagH.value)
const OVERSCAN = 5          // 上下各多渲染几行，防止滚动闪烁

const scrollTop = ref(0)

const totalRowCount = computed(() => {
  if (!fileStore.activeFile) return 0
  return Math.ceil(fileStore.activeFile.size / settingsStore.bytesPerRow)
})

const totalHeight = computed(() => totalRowCount.value * ROW_HEIGHT.value)

const containerHeight = ref(0)

const startRowIndex = computed(() => {
  const first = Math.floor(scrollTop.value / ROW_HEIGHT.value)
  return Math.max(0, first - OVERSCAN)
})

const visibleCount = computed(() => {
  const count = Math.ceil(containerHeight.value / ROW_HEIGHT.value)
  return count + OVERSCAN * 2
})

const offsetY = computed(() => startRowIndex.value * ROW_HEIGHT.value)

const visibleRows = computed(() => {
  const start = startRowIndex.value
  const end = Math.min(start + visibleCount.value, totalRowCount.value)
  const bpr = settingsStore.bytesPerRow
  const rows = []
  for (let i = start; i < end; i++) {
    rows.push({
      rowIndex: i,
      offset: i * bpr
    })
  }
  return rows
})

function onScroll(event) {
  scrollTop.value = event.target.scrollTop
}

// ── 右键菜单 ─────────────────────────────────────────────────
const contextMenu = reactive({ visible: false, x: 0, y: 0, type: 'empty', tagId: null })

function onContextMenu(event) {
  // 只在数据区（hex-editor__content）内显示本菜单
  // 其他区域（数据信息、菜单栏、文件列表）以后各自实现自己的菜单
  if (!event.target.closest('.hex-editor__content')) return

  event.preventDefault()
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.tagId = null

  // 优先检测：是否点击了标签条
  const tagEl = event.target.closest('[data-tag-id]')
  if (tagEl) {
    contextMenu.tagId = tagEl.dataset.tagId
    contextMenu.type = 'tag'
    contextMenu.visible = true
    return
  }

  // 检测：是否点击了某个字节/字符（带 data-offset 属性）
  const byteEl = event.target.closest('[data-offset]')
  if (byteEl) {
    const clickedOffset = parseInt(byteEl.dataset.offset, 10)
    // 判断点击位置是否在当前选区内（含单字节光标位置）
    const inSelection = editorStore.isInSelection(clickedOffset) ||
                        clickedOffset === editorStore.cursorOffset
    if (!inSelection) {
      // 点击了未选中的字节 → 重置选区到该字节
      editorStore.setCursor(clickedOffset)
    }
    contextMenu.type = 'selection'
    contextMenu.visible = true
    return
  }

  // 空白区域 → 显示空菜单
  contextMenu.type = 'empty'
  contextMenu.visible = true
}

function hideContextMenu() {
  contextMenu.visible = false
}

function onStringDecode() {
  hideContextMenu()
  editorStore.openStringDecodeDialog()
}

function onEditTag() {
  if (contextMenu.tagId) editorStore.openTagEditor(contextMenu.tagId)
}

function onDeleteTag() {
  if (contextMenu.tagId) {
    const tag = tagStore.getTagById(contextMenu.tagId)
    if (tag) {
      const cmd = new TagDeleteCommand({ ...tag }, tagStore)
      historyStore.execute(cmd)
    }
    contextMenu.tagId = null
  }
}

// ── 文件打开（编辑器区域内的快捷入口） ──────────────────────
function onOpenFile() {
  fileInputRef.value?.click()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (file) fileStore.openFile(file)
  event.target.value = ''
}

function onClickOutside() {
  hideContextMenu()
}

// ── 生命周期 ──────────────────────────────────────────────────
const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    containerHeight.value = entry.contentRect.height
  }
})

// 当文件被打开后 scrollContainerRef 才会出现在 DOM 中，
// 用 watch 代替 onMounted 确保 ResizeObserver 能正确挂载
watch(scrollContainerRef, (el) => {
  resizeObserver.disconnect()
  if (el) {
    resizeObserver.observe(el)
    containerHeight.value = el.clientHeight
  }
}, { flush: 'post' })

// 切换文件时重置滚动位置、字符串解码区域、撤销历史
watch(() => fileStore.activeFileId, () => {
  scrollTop.value = 0
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = 0
  }
  stringDecodeStore.clearAll()
  historyStore.clear()
})

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  resizeObserver.disconnect()
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped>
.hex-editor {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #1e1e1e;
  position: relative;
}

.hex-editor__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hex-editor__empty-hint {
  text-align: center;
  color: #666;
}

.hex-editor__empty-hint p {
  margin-bottom: 16px;
  font-size: 14px;
}

.hex-editor__content {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  overflow: hidden;
}

.hex-editor__column-header {
  display: flex;
  flex-direction: row;
  background: #252526;
  border-bottom: 1px solid #3e3e3e;
  font-size: inherit; /* 随内容字号同步缩放 */
  color: #888;
  padding: 3px 0;
  /* sticky 置顶：纵向滚动时保持列头可见 */
  position: sticky;
  top: 0;
  z-index: 1;
}

.hex-editor__offset-header {
  width: var(--hex-offset-w);
  padding: 0 4px 0 8px;
  flex: 0 0 auto;
}

.hex-editor__hex-header {
  display: flex;
  flex: 0 0 auto;
  border-right: 1px solid #555; /* 与数据行 data-col 的分隔线对齐 */
}

.hex-editor__col-label {
  width: var(--hex-byte-w);
  text-align: center;
  flex-shrink: 0; /* 防止列标签被压缩 */
}

.hex-editor__text-header {
  /* width 由 :style 动态绑定 */
  padding: 0 8px 0 10px; /* 10px 左间距，与数据行 decoded 列对齐 */
  flex: 0 0 auto;
}

.hex-editor__str-header {
  /* width 由 :style 动态绑定 */
  padding: 0 8px 0 10px;
  flex: 0 0 auto;
  border-left: 1px solid #555;
}

.hex-editor__scroll {
  flex: 1 1 0;
  overflow: auto; /* 横竖均可滚动 */
}

.hex-editor__data-panel {
  flex: 0 0 220px;
  border-left: 1px solid #3e3e3e;
  overflow-y: auto;
}
</style>
