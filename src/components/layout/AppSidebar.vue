<template>
  <div class="sidebar">
    <div class="sidebar__header">文件列表</div>
    <div class="sidebar__list">
      <div
        v-for="file in fileStore.openedFiles"
        :key="file.id"
        class="sidebar__item"
        :class="{ 'sidebar__item--active': file.id === fileStore.activeFileId }"
        @click="fileStore.setActiveFile(file.id)"
      >
        <FileOutlined class="sidebar__item-icon" />
        <span class="sidebar__item-name" :title="file.name">{{ file.name }}</span>
        <span v-if="file.dirty" class="sidebar__item-dirty" title="未保存">●</span>
      </div>
      <div v-if="fileStore.openedFiles.length === 0" class="sidebar__empty">
        暂无打开的文件
      </div>
    </div>
  </div>
</template>

<script setup>
import { FileOutlined } from '@ant-design/icons-vue'
import { useFileStore } from '@/stores/fileStore'

const fileStore = useFileStore()
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  background: #252526;
  border-right: 1px solid #3e3e3e;
  height: 100%;
  overflow: hidden;
}

.sidebar__header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #bbb;
  border-bottom: 1px solid #3e3e3e;
  flex: 0 0 auto;
}

.sidebar__list {
  flex: 1 1 0;
  overflow-y: auto;
}

.sidebar__item {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #ccc;
  gap: 6px;
  white-space: nowrap;
}

.sidebar__item:hover {
  background: #2a2d2e;
}

.sidebar__item--active {
  background: #094771;
  color: #fff;
}

.sidebar__item-icon {
  flex: 0 0 auto;
  font-size: 13px;
}

.sidebar__item-name {
  flex: 1 1 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__item-dirty {
  color: #e8a87c;
  font-size: 10px;
}

.sidebar__empty {
  padding: 16px 12px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>
