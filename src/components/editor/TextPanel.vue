<template>
  <div class="text-panel">
    <div
      v-for="row in rows"
      :key="row.rowIndex"
      class="text-panel__row"
    >
      <span
        v-for="(byte, colIdx) in getRowBytes(row.rowIndex)"
        :key="colIdx"
        class="text-panel__char"
        :class="getCharClass(row.offset + colIdx)"
        @mousedown="onCharMousedown(row.offset + colIdx, $event)"
      >
        {{ byte !== null ? decodeByte(byte) : ' ' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { useFileStore } from '@/stores/fileStore'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

defineProps({
  rows: { type: Array, default: () => [] }
})

const fileStore = useFileStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()

function getRowBytes(rowIndex) {
  const bpr = settingsStore.bytesPerRow
  const start = rowIndex * bpr
  const bytes = []
  for (let i = 0; i < bpr; i++) {
    bytes.push(fileStore.getByte(start + i))
  }
  return bytes
}

function decodeByte(byte) {
  if (byte === null) return ' '
  if (byte >= 0x20 && byte <= 0x7e) return String.fromCharCode(byte)
  return '.'
}

function getCharClass(offset) {
  const classes = []
  if (offset === editorStore.cursorOffset) classes.push('text-panel__char--cursor')
  if (editorStore.isInSelection(offset)) classes.push('text-panel__char--selected')
  return classes
}

function onCharMousedown(offset, event) {
  if (event.button !== 0) return
  if (event.shiftKey) {
    editorStore.extendSelection(offset)
  } else {
    editorStore.setCursor(offset)
    editorStore.startSelection(offset)
  }
}
</script>

<style scoped>
.text-panel {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  color: #d4d4d4;
}

.text-panel__row {
  height: 22px;
  display: flex;
  align-items: center;
  padding: 0 4px;
}

.text-panel__char {
  width: 9px;
  text-align: center;
  cursor: default;
  user-select: none;
  border-radius: 1px;
}

.text-panel__char:hover {
  background: rgba(255, 255, 255, 0.08);
}

.text-panel__char--cursor {
  background: #1677ff !important;
  color: #fff;
}

.text-panel__char--selected {
  background: #264f78;
}
</style>
