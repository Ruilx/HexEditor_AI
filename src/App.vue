<template>
  <a-config-provider :theme="theme">
    <div class="app-root">
      <!-- 上方菜单栏 -->
      <MenuBar class="app-menubar" />

      <div class="app-body">
        <!-- 左侧文件列表 -->
        <AppSidebar class="app-sidebar" />

        <!-- 右侧编辑区 -->
        <div class="app-editor-area">
          <!-- 标签栏 -->
          <TabBar class="app-tabbar" />

          <!-- 编辑器主体 -->
          <HexEditor v-if="fileStore.activeView === 'hex'" class="app-editor" />
          <TagFileEditor v-else-if="fileStore.activeView === 'tag-json'" class="app-editor" />

          <!-- 状态栏 -->
          <StatusBar class="app-statusbar" />
        </div>
      </div>
    </div>
  </a-config-provider>
</template>

<script setup>
import { computed, watch } from 'vue'
import MenuBar from '@/components/menu/MenuBar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import HexEditor from '@/components/editor/HexEditor.vue'
import TagFileEditor from '@/components/editor/TagFileEditor.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFileStore } from '@/stores/fileStore'
import { useTagStore } from '@/stores/tagStore'
import { useStringDecodeStore } from '@/stores/stringDecodeStore'
import { useHistoryStore } from '@/stores/historyStore'

const settingsStore = useSettingsStore()
const fileStore = useFileStore()
const tagStore = useTagStore()
const stringDecodeStore = useStringDecodeStore()
const historyStore = useHistoryStore()

// 第一个标签创建时，自动为当前文件初始化 .tag 文件条目
watch(() => tagStore.tags.length, (n, o) => {
  if (o === 0 && n > 0 && fileStore.activeFile && !fileStore.activeFile.tagFile) {
    fileStore.initTagFile()
  }
})

// 标签变化时标记 .tag 文件为已修改
watch(tagStore.tags, () => {
  if (fileStore.activeFile?.tagFile) fileStore.markTagFileDirty()
}, { deep: true })

// 文件切换时始终清理解码区域和撤销历史（无论当前处于哪种视图）
watch(() => fileStore.activeFileId, () => {
  stringDecodeStore.clearAll()
  historyStore.clear()
})

const theme = computed(() => ({
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 4,
    fontFamily: settingsStore.fontFamily
  }
}))
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
}

.app-menubar {
  flex: 0 0 auto;
}

.app-body {
  display: flex;
  flex: 1 1 0;
  overflow: hidden;
}

.app-sidebar {
  flex: 0 0 220px;
  overflow: hidden;
}

.app-editor-area {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  overflow: hidden;
}

.app-tabbar {
  flex: 0 0 auto;
}

.app-editor {
  flex: 1 1 0;
  overflow: hidden;
}

.app-statusbar {
  flex: 0 0 auto;
}
</style>
