<template>
  <a-modal
    v-model:open="editorStore.setFileSizeDialogOpen"
    title="设置文件大小"
    :width="420"
    ok-text="确定"
    cancel-text="取消"
    :ok-button-props="{ disabled: !isValid }"
    @ok="onOk"
    @cancel="editorStore.closeSetFileSizeDialog()"
  >
    <a-form layout="vertical">
      <a-form-item label="新的文件大小（字节）">
        <a-input-number
          v-model:value="newSize"
          :min="1"
          :precision="0"
          :step="1"
          style="width: 100%"
          @pressEnter="onOk"
        />
      </a-form-item>
      <div class="set-file-size__hint">
        当前文件大小：{{ currentSize.toLocaleString() }} 字节
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'
import { useStringDecodeStore } from '@/stores/stringDecodeStore'
import { useTagStore } from '@/stores/tagStore'
import { useHistoryStore } from '@/stores/historyStore'
import { ResizeCommand } from '@/core/commands/resizeCommands'

const editorStore = useEditorStore()
const fileStore = useFileStore()
const stringDecodeStore = useStringDecodeStore()
const tagStore = useTagStore()
const historyStore = useHistoryStore()

const newSize = ref(0)

const currentSize = computed(() => fileStore.activeFile?.size ?? 0)

const isValid = computed(() =>
  Number.isInteger(newSize.value) && newSize.value >= 1
)

// 每次打开对话框时，将输入框重置为当前文件大小
watch(() => editorStore.setFileSizeDialogOpen, (open) => {
  if (open) {
    newSize.value = currentSize.value || 1
  }
})

function onOk() {
  if (!isValid.value) return

  const cur = currentSize.value
  const target = newSize.value

  if (target === cur) {
    editorStore.closeSetFileSizeDialog()
    return
  }

  if (target > cur) {
    // 扩展：末尾填充 0x00
    // ResizeCommand.execute 内部会调用 resizeFile，扩展不需要 tag/decode 快照
    const cmd = new ResizeCommand(target, cur, null, [], [], fileStore, tagStore, stringDecodeStore)
    // 扩展的 execute 只调 resizeFile（即尋内 execute 内容）
    historyStore.execute({
      description: `resize ${cur} → ${target}`,
      execute() { fileStore.resizeFile(target) },
      undo() { fileStore.resizeFile(cur) }
    })
    editorStore.closeSetFileSizeDialog()
    return
  }

  // 截断：需要用户二次确认
  const diff = cur - target
  Modal.confirm({
    title: '确认截断文件',
    content: `新的大小小于当前文件大小，会导致最后 ${diff} 字节的数据丢失，确定要这样做吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    onOk() {
      // 操作前保存快照和被截断字节
      const tagsSnap = tagStore.serializeSnapshot()
      const decodeSnap = stringDecodeStore.serializeSnapshot()
      const trimmedBytes = fileStore.getBytes(target, diff)
      const cmd = new ResizeCommand(target, cur, trimmedBytes, tagsSnap, decodeSnap, fileStore, tagStore, stringDecodeStore)
      historyStore.execute(cmd)
      editorStore.closeSetFileSizeDialog()
    }
    // onCancel：主对话框保持打开，不做任何处理
  })
}
</script>

<style scoped>
.set-file-size__hint {
  color: #888;
  font-size: 12px;
  margin-top: -8px;
}
</style>
