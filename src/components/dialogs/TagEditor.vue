<template>
  <a-modal
    v-model:open="editorStore.tagEditorOpen"
    :title="isEdit ? '编辑标签' : '创建标签'"
    :width="440"
    @ok="onOk"
    @cancel="onCancel"
    ok-text="确定"
    cancel-text="取消"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item label="标签文本" required>
        <a-input v-model:value="form.label" placeholder="标签显示文本" />
      </a-form-item>
      <a-form-item label="备注">
        <a-textarea v-model:value="form.note" placeholder="备注（在状态栏显示）" :rows="2" />
      </a-form-item>
      <a-form-item label="前景颜色">
        <a-input v-model:value="form.fgColor" placeholder="#ffffff" />
      </a-form-item>
      <a-form-item label="背景颜色">
        <a-input v-model:value="form.bgColor" placeholder="#1677ff" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useTagStore } from '@/stores/tagStore'
import { useHistoryStore } from '@/stores/historyStore'
import { TagCreateCommand, TagUpdateCommand } from '@/core/commands/tagCommands'

const editorStore = useEditorStore()
const tagStore = useTagStore()
const historyStore = useHistoryStore()

const form = ref({ label: '', note: '', fgColor: '#ffffff', bgColor: '#1677ff' })

const isEdit = computed(() => editorStore.editingTagId !== null)

watch(() => editorStore.tagEditorOpen, (open) => {
  if (open) {
    if (isEdit.value) {
      const tag = tagStore.getTagById(editorStore.editingTagId)
      if (tag) {
        form.value = { label: tag.label, note: tag.note || '', fgColor: tag.fgColor || '#ffffff', bgColor: tag.bgColor || '#1677ff' }
      }
    } else {
      form.value = { label: '', note: '', fgColor: '#ffffff', bgColor: '#1677ff' }
    }
  }
})

function onOk() {
  if (!form.value.label.trim()) return
  if (isEdit.value) {
    const oldTag = tagStore.getTagById(editorStore.editingTagId)
    const oldData = { label: oldTag.label, note: oldTag.note, fgColor: oldTag.fgColor, bgColor: oldTag.bgColor }
    const cmd = new TagUpdateCommand(editorStore.editingTagId, { ...form.value }, oldData, tagStore)
    historyStore.execute(cmd)
  } else {
    const { start, end } = editorStore.selectionRange
    const cmd = new TagCreateCommand({ startOffset: start, endOffset: end, ...form.value }, tagStore)
    historyStore.execute(cmd)
  }
  editorStore.closeTagEditor()
}

function onCancel() {
  editorStore.closeTagEditor()
}
</script>
