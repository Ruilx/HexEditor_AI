<template>
  <a-modal
    v-model:open="editorStore.newFileDialogOpen"
    title="新建文件"
    :width="420"
    ok-text="确定"
    cancel-text="取消"
    :ok-button-props="{ disabled: !isValid }"
    @ok="onOk"
    @cancel="onCancel"
    @after-open="onAfterOpen"
  >
    <a-form layout="vertical">
      <a-form-item label="文件名">
        <a-input
          ref="nameInputRef"
          v-model:value="fileName"
          placeholder="例如：新文件.bin"
          @pressEnter="focusSizeInput"
        />
      </a-form-item>
      <a-form-item label="文件大小（字节）">
        <a-input-number
          ref="sizeInputRef"
          v-model:value="fileSize"
          :min="1"
          :max="1073741824"
          :precision="0"
          :step="1"
          style="width: 100%"
          @pressEnter="onOk"
        />
        <div class="new-file-dialog__hint">初始内容将以 0x00 字节填充</div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'

const editorStore = useEditorStore()
const fileStore = useFileStore()

const fileName = ref('新文件.bin')
const fileSize = ref(256)
const nameInputRef = ref(null)
const sizeInputRef = ref(null)

const isValid = computed(() => {
  const name = fileName.value?.trim()
  return name && name.length > 0 &&
    Number.isInteger(fileSize.value) && fileSize.value >= 1
})

function onAfterOpen() {
  // 对话框打开后重置为默认值，并聚焦文件名输入框
  fileName.value = '新文件.bin'
  fileSize.value = 256
  nextTick(() => {
    nameInputRef.value?.focus()
    // 选中文件名（去掉扩展名部分）方便直接输入
    const input = nameInputRef.value?.$el?.querySelector('input')
    if (input) {
      const dotIdx = fileName.value.lastIndexOf('.')
      input.setSelectionRange(0, dotIdx >= 0 ? dotIdx : fileName.value.length)
    }
  })
}

function focusSizeInput() {
  sizeInputRef.value?.focus()
}

function onOk() {
  if (!isValid.value) return
  fileStore.newFile(fileName.value.trim(), fileSize.value)
  editorStore.closeNewFileDialog()
}

function onCancel() {
  editorStore.closeNewFileDialog()
}
</script>

<style scoped>
.new-file-dialog__hint {
  color: #888;
  font-size: 12px;
  margin-top: 4px;
}
</style>
