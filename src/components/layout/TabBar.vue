<template>
  <div class="tab-bar">
    <div
      v-for="file in fileStore.openedFiles"
      :key="file.id"
      class="tab-bar__tab"
      :class="{ 'tab-bar__tab--active': file.id === fileStore.activeFileId }"
      @click="fileStore.setActiveFile(file.id)"
    >
      <span class="tab-bar__tab-name">{{ file.name }}</span>
      <span v-if="file.dirty" class="tab-bar__tab-dirty" title="未保存">●</span>
      <CloseOutlined
        class="tab-bar__tab-close"
        @click.stop="fileStore.closeFile(file.id)"
      />
    </div>
    <div v-if="fileStore.openedFiles.length === 0" class="tab-bar__placeholder">
      HexEditor
    </div>
  </div>
</template>

<script setup>
import { CloseOutlined } from '@ant-design/icons-vue'
import { useFileStore } from '@/stores/fileStore'

const fileStore = useFileStore()
</script>

<style scoped>
.tab-bar {
  display: flex;
  flex-direction: row;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
  height: 35px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 0 0 auto;
}

.tab-bar::-webkit-scrollbar {
  height: 3px;
}

.tab-bar__tab {
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 6px;
  min-width: 100px;
  max-width: 200px;
  height: 100%;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
  border-right: 1px solid #3e3e3e;
  white-space: nowrap;
  flex: 0 0 auto;
}

.tab-bar__tab:hover {
  background: #3a3a3a;
}

.tab-bar__tab--active {
  background: #1e1e1e;
  color: #fff;
  border-top: 2px solid #1677ff;
}

.tab-bar__tab-name {
  flex: 1 1 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-bar__tab-dirty {
  color: #e8a87c;
  font-size: 10px;
}

.tab-bar__tab-close {
  font-size: 11px;
  color: #888;
  border-radius: 2px;
  padding: 2px;
}

.tab-bar__tab-close:hover {
  color: #fff;
  background: #555;
}

.tab-bar__placeholder {
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: #666;
  font-size: 13px;
}
</style>
