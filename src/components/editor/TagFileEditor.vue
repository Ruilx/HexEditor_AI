<template>
  <div class="tag-file-editor">
    <!-- 工具栏 -->
    <div class="tag-file-editor__toolbar">
      <span class="tag-file-editor__title">
        <TagOutlined class="tag-file-editor__title-icon" />
        {{ fileStore.activeFile?.tagFile?.name ?? '标签文件' }}
        <span v-if="fileStore.activeFile?.tagFile?.dirty" class="tag-file-editor__dirty" title="未保存">●</span>
      </span>
      <div class="tag-file-editor__actions">
        <a-button size="small" @click="onReset">重置</a-button>
        <a-button type="primary" size="small" @click="onApply">应用修改</a-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      class="tag-file-editor__error"
      closable
      @close="errorMessage = ''"
    />

    <!-- JSON 编辑区 -->
    <textarea
      class="tag-file-editor__textarea"
      v-model="localContent"
      spellcheck="false"
      placeholder="标签数据（JSON 格式）"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { TagOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useFileStore } from '@/stores/fileStore'
import { useTagStore } from '@/stores/tagStore'

const fileStore = useFileStore()
const tagStore = useTagStore()

const localContent = ref('')
const errorMessage = ref('')

/** 刷新编辑区内容（切换到 tag-json 视图时，或手动重置时） */
function refreshContent() {
  localContent.value = JSON.stringify(tagStore.exportTags(), null, 2)
  errorMessage.value = ''
}

// 每次切换到 tag-json 视图时刷新内容
watch(() => fileStore.activeView, (view) => {
  if (view === 'tag-json') refreshContent()
}, { immediate: true })

function onReset() {
  refreshContent()
}

function onApply() {
  errorMessage.value = ''

  let parsed
  try {
    parsed = JSON.parse(localContent.value)
  } catch (e) {
    errorMessage.value = `JSON 解析失败：${e.message}`
    return
  }

  if (!Array.isArray(parsed)) {
    errorMessage.value = '格式错误：顶层必须是数组 []'
    return
  }

  for (let i = 0; i < parsed.length; i++) {
    const t = parsed[i]
    if (typeof t.startOffset !== 'number' || typeof t.endOffset !== 'number') {
      errorMessage.value = `第 ${i + 1} 项：startOffset 和 endOffset 必须是数字`
      return
    }
    if (t.startOffset < 0 || t.endOffset < t.startOffset) {
      errorMessage.value = `第 ${i + 1} 项：offset 范围无效（startOffset=${t.startOffset}, endOffset=${t.endOffset}）`
      return
    }
  }

  // 规范化字段
  const tags = parsed.map(t => ({
    id: t.id || crypto.randomUUID(),
    startOffset: t.startOffset,
    endOffset: t.endOffset,
    label: t.label || '',
    note: t.note || '',
    fgColor: t.fgColor || '#ffffff',
    bgColor: t.bgColor || '#1677ff',
    dynamic: t.dynamic || false
  }))

  tagStore.importTags(tags)
  if (fileStore.activeFileId !== null) {
    fileStore.setTagsForFile(fileStore.activeFileId, tags)
  }
  message.success('标签已更新')
}
</script>

<style scoped>
.tag-file-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  overflow: hidden;
}

.tag-file-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e3e;
  flex: 0 0 auto;
  gap: 8px;
}

.tag-file-editor__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #9cdcfe;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-file-editor__title-icon {
  flex: 0 0 auto;
  font-size: 13px;
}

.tag-file-editor__dirty {
  color: #e8a87c;
  font-size: 10px;
}

.tag-file-editor__actions {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
}

.tag-file-editor__error {
  flex: 0 0 auto;
  margin: 6px 12px 0;
  border-radius: 4px;
}

.tag-file-editor__textarea {
  flex: 1 1 0;
  width: 100%;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  tab-size: 2;
  overflow: auto;
}
</style>
