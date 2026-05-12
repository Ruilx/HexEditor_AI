<template>
  <div class="data-info-panel">
    <div class="data-info-panel__header">数据信息</div>

    <div v-if="editorStore.cursorOffset === null" class="data-info-panel__empty">
      请选中字节以查看数据信息
    </div>

    <div v-else class="data-info-panel__list">
      <div
        v-for="item in allItems"
        :key="item.name"
        class="data-info-panel__row"
      >
        <span class="data-info-panel__name">{{ item.displayName }}:</span>
        <span class="data-info-panel__value" :title="item.value">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'
import { usePluginManager } from '@/plugins/PluginManager'

const editorStore = useEditorStore()
const fileStore = useFileStore()
const pluginManager = usePluginManager()

// 固定长度解释器结果（已在 PluginManager 中展开多行值）
const dataItems = computed(() => {
  if (editorStore.cursorOffset === null) return []
  return pluginManager.interpretFixed(fileStore, editorStore.cursorOffset, editorStore.endian)
})

// 选中长度解释器结果（哈希类）
const hashItems = computed(() => {
  if (!editorStore.hasSelection) return []
  const { start, end } = editorStore.selectionRange
  return pluginManager.interpretVariable(fileStore, start, end - start + 1, editorStore.endian)
})

// 合并为单一扁平列表
const allItems = computed(() => [...dataItems.value, ...hashItems.value])
</script>

<style scoped>
.data-info-panel {
  background: #252526;
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 12px;
  overflow-y: auto;
}

.data-info-panel__header {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #bbb;
  border-bottom: 1px solid #3e3e3e;
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  background: #252526;
  z-index: 1;
}

.data-info-panel__empty {
  padding: 16px 10px;
  color: #666;
  text-align: center;
  font-size: 12px;
}

.data-info-panel__list {
  padding: 4px 0;
}

.data-info-panel__row {
  display: flex;
  align-items: baseline;
  padding: 2px 10px;
  gap: 6px;
  line-height: 1.6;
  min-height: 20px;
}

.data-info-panel__row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.data-info-panel__name {
  color: #888;
  flex: 0 0 auto;
  white-space: nowrap;
  font-size: 11px;
}

.data-info-panel__value {
  color: #d4d4d4;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 0;
  min-width: 0;
}
</style>
