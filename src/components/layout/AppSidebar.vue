<template>
  <div class="sidebar">
    <div class="sidebar__header">文件列表</div>
    <div class="sidebar__list">
      <template v-for="file in fileStore.openedFiles" :key="file.id">
        <!-- 二进制文件行 -->
        <div
          class="sidebar__item"
          :class="{ 'sidebar__item--active': file.id === fileStore.activeFileId && fileStore.activeView === 'hex' }"
          @click="fileStore.setActiveFile(file.id); fileStore.setActiveView('hex')"
        >
          <FileOutlined class="sidebar__item-icon" />
          <span class="sidebar__item-name" :title="file.name">{{ file.name }}</span>
          <span v-if="file.dirty" class="sidebar__item-dirty" title="未保存">●</span>
        </div>
        <!-- .tag 文件行（已关联时显示） -->
        <div
          v-if="file.tagFile"
          class="sidebar__item sidebar__item--tag"
          :class="{ 'sidebar__item--active': file.id === fileStore.activeFileId && fileStore.activeView === 'tag-json' }"
          @click="fileStore.setActiveFile(file.id); fileStore.setActiveView('tag-json')"
        >
          <TagOutlined class="sidebar__item-icon" />
          <span class="sidebar__item-name" :title="file.tagFile.name">{{ file.tagFile.name }}</span>
          <span v-if="file.tagFile.dirty" class="sidebar__item-dirty" title="未保存">●</span>
        </div>
      </template>
      <div v-if="fileStore.openedFiles.length === 0" class="sidebar__empty">
        暂无打开的文件
      </div>
    </div>

    <!-- 浏览器环境下的“加载标签文件”入口（当前文件尚未关联 .tag 时显示） -->
    <div v-if="!isElectron && fileStore.activeFile && !fileStore.activeFile.tagFile" class="sidebar__tag-section">
      <button class="sidebar__tag-btn" @click="onLoadTagFile" :title="'为当前文件加载 .TAG 标签文件'">
        <TagOutlined /> 关联标签文件…
      </button>
      <input
        ref="tagFileInputRef"
        type="file"
        accept=".tag,.TAG"
        style="display: none"
        @change="onTagFileSelected"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { FileOutlined, TagOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { useFileStore } from '@/stores/fileStore'
import { isElectron } from '@/utils/env'

const fileStore = useFileStore()
const tagFileInputRef = ref(null)

// 打开新文件后自动提示关联 .tag
watch(() => fileStore.activeFile?.pendingTagLoad, (val) => {
  if (!val || isElectron) return
  Modal.confirm({
    title: '关联标签文件',
    content: `是否为 “${fileStore.activeFile?.name}” 关联一个 .tag 标签文件？`,
    okText: '选择文件',
    cancelText: '跳过',
    onOk: () => {
      fileStore.clearPendingTagLoad()
      tagFileInputRef.value?.click()
    },
    onCancel: () => fileStore.clearPendingTagLoad()
  })
})

function onLoadTagFile() {
  tagFileInputRef.value?.click()
}

async function onTagFileSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  const result = await fileStore.loadTagFileForActive(file)
  if (result.success) {
    // 等 App.vue 的 deep watcher 运行后，再清除 dirty 标志
    await nextTick()
    fileStore.clearTagFileDirty()
    message.success('标签文件加载成功')
  } else {
    message.error(`加载失败：${result.error}`)
  }
}
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

.sidebar__item--tag {
  padding-left: 28px;
  font-style: italic;
  color: #9cdcfe;
  font-size: 12px;
}

.sidebar__item--tag:hover {
  background: #2a2d2e;
}

.sidebar__item--tag.sidebar__item--active {
  background: #094771;
  color: #9cdcfe;
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

.sidebar__item-tag-icon {
  flex: 0 0 auto;
  font-size: 11px;
  color: #9cdcfe;
  opacity: 0.8;
}

.sidebar__tag-section {
  flex: 0 0 auto;
  padding: 6px 8px;
  border-top: 1px solid #3e3e3e;
}

.sidebar__tag-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  background: transparent;
  border: 1px solid #555;
  border-radius: 3px;
  color: #9cdcfe;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar__tag-btn:hover {
  background: #2a2d2e;
  border-color: #777;
}

.sidebar__empty {
  padding: 16px 12px;
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>
