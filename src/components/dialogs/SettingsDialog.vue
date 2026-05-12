<template>
  <a-modal
    v-model:open="editorStore.settingsDialogOpen"
    title="设置"
    :width="500"
    @ok="onOk"
    @cancel="onCancel"
    ok-text="确定"
    cancel-text="取消"
  >
    <a-tabs v-model:activeKey="activeTab">
      <!-- 字体设置 -->
      <a-tab-pane key="font" tab="字体">
        <a-form layout="vertical">
          <a-form-item label="字体">
            <a-input v-model:value="draft.fontFamily" placeholder="Consolas, 'Courier New', monospace" />
          </a-form-item>
          <a-form-item label="字号">
            <a-input-number v-model:value="draft.fontSize" :min="6" :max="72" />
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <!-- 每行字节数 -->
      <a-tab-pane key="bytesPerRow" tab="每行字节数">
        <a-form layout="vertical">
          <a-form-item label="每行显示字节数">
            <a-select v-model:value="draft.bytesPerRow">
              <a-select-option :value="8">8</a-select-option>
              <a-select-option :value="16">16（默认）</a-select-option>
              <a-select-option :value="32">32</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="字节序">
            <a-radio-group v-model:value="draft.endian">
              <a-radio value="le">小端（Little-Endian）</a-radio>
              <a-radio value="be">大端（Big-Endian）</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <!-- 数据信息设置 -->
      <a-tab-pane key="dataInfo" tab="显示信息">
        <a-form layout="vertical">
          <a-form-item label="启用的解释器">
            <a-checkbox-group v-model:value="draft.enabledInterpreters" :options="interpreterOptions" />
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { useSettingsStore } from '@/stores/settingsStore'

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()

const activeTab = ref('font')

// 显式复制各属性，避免 Pinia setup store $state 返回 Ref 对象的问题
function createDraft() {
  return {
    fontFamily: settingsStore.fontFamily,
    fontSize: settingsStore.fontSize,
    bytesPerRow: settingsStore.bytesPerRow,
    endian: settingsStore.endian,
    enabledInterpreters: [...settingsStore.enabledInterpreters],
    offsetDigits: settingsStore.offsetDigits,
  }
}

const draft = ref(createDraft())

const interpreterOptions = [
  { label: '二进制', value: 'binary' },
  { label: '八进制', value: 'octal' },
  { label: '十进制（有符号/无符号）', value: 'integer' },
  { label: 'FP8 (E4M3/E5M2)', value: 'fp8' },
  { label: 'FP16', value: 'fp16' },
  { label: 'Float32', value: 'float32' },
  { label: 'Float64', value: 'float64' },
  { label: 'GUID', value: 'guid' },
  { label: 'ASCII', value: 'ascii' },
  { label: 'UTF-8', value: 'utf8' },
  { label: 'UTF-16', value: 'utf16' },
  { label: 'UTF-32', value: 'utf32' },
  { label: 'GBK/GB18030', value: 'gbk' },
  { label: 'SHIFT-JIS', value: 'shiftjis' },
  { label: 'BIG-5', value: 'big5' },
  { label: 'DOS 日期时间', value: 'dosdatetime' },
  { label: 'MD5', value: 'md5' },
  { label: 'SHA1', value: 'sha1' },
  { label: 'CRC32', value: 'crc32' }
]

watch(() => editorStore.settingsDialogOpen, (open) => {
  if (open) {
    draft.value = createDraft()
    if (editorStore.settingsDialogTab) {
      activeTab.value = editorStore.settingsDialogTab
    }
  }
})

function onOk() {
  // 使用 $patch 逐属性更新，确保 Pinia 响应式正确触发
  settingsStore.$patch({
    fontFamily: draft.value.fontFamily,
    fontSize: draft.value.fontSize,
    bytesPerRow: draft.value.bytesPerRow,
    endian: draft.value.endian,
    enabledInterpreters: [...draft.value.enabledInterpreters],
    offsetDigits: draft.value.offsetDigits,
  })
  editorStore.closeSettingsDialog()
}

function onCancel() {
  editorStore.closeSettingsDialog()
}
</script>
