<template>
  <div class="status-bar">
    <!-- 偏移量 -->
    <div class="status-bar__item">
      <span class="status-bar__label">偏移量：</span>
      <span class="status-bar__value">
        {{ editorStore.cursorOffset !== null ? formatOffset(editorStore.cursorOffset) : '—' }}
      </span>
    </div>

    <!-- 选区长度 -->
    <div v-if="editorStore.hasSelection" class="status-bar__item">
      <span class="status-bar__label">选中：</span>
      <span class="status-bar__value">{{ editorStore.selectionLength }} 字节</span>
    </div>

    <!-- 标签备注 -->
    <div v-if="activeTagNote" class="status-bar__item status-bar__item--tag">
      <span class="status-bar__label">备注：</span>
      <span class="status-bar__value">{{ activeTagNote }}</span>
    </div>

    <!-- 编辑模式 -->
    <div class="status-bar__item status-bar__item--right">
      <span class="status-bar__mode">{{ editorStore.insertMode ? 'INS' : 'OVR' }}</span>
    </div>

    <!-- 文件大小 -->
    <div v-if="fileStore.activeFile" class="status-bar__item status-bar__item--right">
      <span class="status-bar__label">大小：</span>
      <span class="status-bar__value">{{ formatSize(fileStore.activeFile.size) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'
import { useTagStore } from '@/stores/tagStore'

const editorStore = useEditorStore()
const fileStore = useFileStore()
const tagStore = useTagStore()

const activeTagNote = computed(() => {
  if (editorStore.cursorOffset === null) return null
  const tag = tagStore.getTagAtOffset(editorStore.cursorOffset)
  return tag?.note || null
})

function formatOffset(offset) {
  return '0x' + offset.toString(16).toUpperCase().padStart(8, '0')
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  height: 22px;
  background: #007acc;
  color: #fff;
  font-size: 12px;
  padding: 0 8px;
  gap: 16px;
  flex: 0 0 auto;
}

.status-bar__item {
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

.status-bar__item--right {
  margin-left: auto;
}

.status-bar__label {
  opacity: 0.8;
}

.status-bar__value {
  font-family: 'Consolas', 'Courier New', monospace;
}

.status-bar__mode {
  font-weight: bold;
  font-family: 'Consolas', 'Courier New', monospace;
  background: rgba(0,0,0,0.2);
  padding: 0 4px;
  border-radius: 2px;
}

.status-bar__item--tag {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
