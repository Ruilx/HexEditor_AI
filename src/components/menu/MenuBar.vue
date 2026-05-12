<template>
  <div class="menu-bar">
    <a-menu mode="horizontal" :selectable="false" theme="dark" class="menu-bar__menu">
      <a-sub-menu key="file" title="文件">
        <a-menu-item key="new" @click="onNewFile">新建</a-menu-item>
        <a-menu-item key="open" @click="onOpenFile">打开</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="save" @click="onSaveFile">保存</a-menu-item>
        <a-menu-item key="saveAs" @click="onSaveFileAs">另存为</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="export" disabled>导出</a-menu-item>
      </a-sub-menu>

      <a-sub-menu key="edit" title="编辑">
        <a-menu-item key="undo" @click="onUndo">撤销</a-menu-item>
        <a-menu-item key="redo" @click="onRedo">重做</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="cut" @click="onCut">剪切</a-menu-item>
        <a-menu-item key="copy" @click="onCopy">复制</a-menu-item>
        <a-menu-item key="paste" @click="onPaste">粘贴</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="find" @click="onFind">查找</a-menu-item>
        <a-menu-item key="replace" @click="onReplace">替换</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="selectAll" @click="onSelectAll">全选</a-menu-item>
        <a-menu-item key="editTag" @click="onEditTag">编辑标签</a-menu-item>
        <a-menu-item key="deleteTag" @click="onDeleteTag">删除标签</a-menu-item>
        <a-menu-item key="setFileSize" @click="onSetFileSize">设置文件大小</a-menu-item>
      </a-sub-menu>

      <a-sub-menu key="view" title="查看">
        <a-menu-item key="fontSettings" @click="onFontSettings">字体设置</a-menu-item>
        <a-menu-item key="dataInfoSettings" @click="onDataInfoSettings">显示信息设置</a-menu-item>
        <a-menu-item key="bytesPerRow" @click="onBytesPerRow">每行显示字节数</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="toggleInsertMode" @click="onToggleInsertMode">
          {{ editorStore.insertMode ? '切换到替换模式' : '切换到插入模式' }}
        </a-menu-item>
      </a-sub-menu>
    </a-menu>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      style="display: none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFileStore } from '@/stores/fileStore'
import { useEditorStore } from '@/stores/editorStore'

const fileStore = useFileStore()
const editorStore = useEditorStore()
const fileInputRef = ref(null)

function onNewFile() {
  fileStore.newFile()
}

function onOpenFile() {
  fileInputRef.value?.click()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (file) {
    fileStore.openFile(file)
  }
  event.target.value = ''
}

function onSaveFile() {
  fileStore.saveFile()
}

function onSaveFileAs() {
  fileStore.saveFileAs()
}

function onUndo() {
  editorStore.undo()
}

function onRedo() {
  editorStore.redo()
}

function onCut() {
  editorStore.cut()
}

function onCopy() {
  editorStore.copy()
}

function onPaste() {
  editorStore.paste()
}

function onFind() {
  editorStore.openFindDialog()
}

function onReplace() {
  editorStore.openReplaceDialog()
}

function onSelectAll() {
  editorStore.selectAll()
}

function onEditTag() {
  editorStore.openTagEditor()
}

function onDeleteTag() {
  editorStore.deleteSelectedTag()
}

function onSetFileSize() {
  editorStore.openSetFileSizeDialog()
}

function onFontSettings() {
  editorStore.openSettingsDialog('font')
}

function onDataInfoSettings() {
  editorStore.openSettingsDialog('dataInfo')
}

function onBytesPerRow() {
  editorStore.openSettingsDialog('bytesPerRow')
}

function onToggleInsertMode() {
  editorStore.toggleInsertMode()
}
</script>

<style scoped>
.menu-bar {
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.menu-bar__menu {
  background: transparent;
  border-bottom: none;
  line-height: 32px;
}
</style>
