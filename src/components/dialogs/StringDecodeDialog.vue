<template>
  <a-modal
    v-model:open="editorStore.stringDecodeDialogOpen"
    title="字符串解码"
    :width="420"
    @ok="onOk"
    @cancel="editorStore.closeStringDecodeDialog()"
    ok-text="解码"
    cancel-text="取消"
  >
    <a-form layout="vertical">
      <a-form-item label="选区范围">
        <span class="str-decode-dialog__range">
          {{ rangeText }}
        </span>
      </a-form-item>

      <a-form-item label="字符编码">
        <a-select v-model:value="selectedEncoding" style="width: 100%">
          <a-select-option value="utf-8">UTF-8</a-select-option>
          <a-select-option value="utf-16le">UTF-16 LE</a-select-option>
          <a-select-option value="utf-16be">UTF-16 BE</a-select-option>
          <a-select-option value="gbk">GBK / GB18030</a-select-option>
          <a-select-option value="big5">Big5</a-select-option>
          <a-select-option value="shift-jis">Shift-JIS</a-select-option>
          <a-select-option value="euc-kr">EUC-KR</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useEditorStore } from '@/stores/editorStore'
import { useFileStore } from '@/stores/fileStore'
import { useStringDecodeStore } from '@/stores/stringDecodeStore'

const editorStore = useEditorStore()
const fileStore = useFileStore()
const stringDecodeStore = useStringDecodeStore()

const selectedEncoding = ref('utf-8')

const rangeText = computed(() => {
  if (editorStore.cursorOffset === null) return '无选区'
  const { start, end } = editorStore.selectionRange
  if (start === end) {
    return `0x${start.toString(16).toUpperCase().padStart(8, '0')}（1 字节）`
  }
  const len = end - start + 1
  return `0x${start.toString(16).toUpperCase().padStart(8, '0')} – 0x${end.toString(16).toUpperCase().padStart(8, '0')}（${len} 字节）`
})

function onOk() {
  if (editorStore.cursorOffset === null) {
    editorStore.closeStringDecodeDialog()
    return
  }

  const { start, end } = editorStore.selectionRange
  const result = stringDecodeStore.addRegion(start, end, selectedEncoding.value, fileStore)

  if (!result.ok) {
    message.error(`无法将选区解码为 ${selectedEncoding.value}：${result.reason}`)
    return
  }

  if (result.truncated) {
    const actualLen = result.actualEnd - start + 1
    message.warning(`解码在偏移量 0x${result.actualEnd.toString(16).toUpperCase()} 处遇到无效字节，已显示前 ${actualLen} 字节的解码结果`)
  }

  editorStore.closeStringDecodeDialog()
}
</script>

<style scoped>
.str-decode-dialog__range {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: #888;
}
</style>
