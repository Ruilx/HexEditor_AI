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
          <HexEditor class="app-editor" />

          <!-- 状态栏 -->
          <StatusBar class="app-statusbar" />
        </div>
      </div>
    </div>
  </a-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import MenuBar from '@/components/menu/MenuBar.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import HexEditor from '@/components/editor/HexEditor.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

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
