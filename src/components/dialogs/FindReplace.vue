<template>
  <a-modal
    v-model:open="editorStore.findDialogOpen"
    title="查找 / 替换"
    :footer="null"
    :width="480"
    :mask-closable="false"
    @cancel="editorStore.closeFindDialog()"
  >
    <div class="find-replace">
      <div class="find-replace__row">
        <label class="find-replace__label">查找（十六进制）</label>
        <a-input
          v-model:value="findHex"
          placeholder="例如：FF 00 1A"
          class="find-replace__input"
          @keydown.enter="onFind"
          allow-clear
        />
      </div>

      <div class="find-replace__row">
        <label class="find-replace__label">替换为（十六进制）</label>
        <a-input
          v-model:value="replaceHex"
          placeholder="例如：00 00 00"
          class="find-replace__input"
          allow-clear
        />
      </div>

      <div class="find-replace__actions">
        <a-button @click="onFind">查找下一个</a-button>
        <a-button @click="onFindAll">查找全部</a-button>
        <a-button type="primary" @click="onReplace">替换</a-button>
        <a-button danger @click="onReplaceAll">全部替换</a-button>
      </div>

      <div v-if="resultMessage" class="find-replace__result">{{ resultMessage }}</div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editorStore'

const editorStore = useEditorStore()

const findHex = ref('')
const replaceHex = ref('')
const resultMessage = ref('')

function parseHexInput(str) {
  return str.trim().split(/\s+/).filter(Boolean).map(h => parseInt(h, 16)).filter(n => !isNaN(n))
}

function onFind() {
  const pattern = parseHexInput(findHex.value)
  if (pattern.length === 0) return
  const found = editorStore.findNext(pattern)
  resultMessage.value = found ? '' : '未找到匹配内容'
}

function onFindAll() {
  const pattern = parseHexInput(findHex.value)
  if (pattern.length === 0) return
  const count = editorStore.findAll(pattern)
  resultMessage.value = `共找到 ${count} 处匹配`
}

function onReplace() {
  const pattern = parseHexInput(findHex.value)
  const replacement = parseHexInput(replaceHex.value)
  if (pattern.length === 0) return
  const done = editorStore.replaceCurrent(pattern, replacement)
  resultMessage.value = done ? '已替换' : '未找到匹配内容'
}

function onReplaceAll() {
  const pattern = parseHexInput(findHex.value)
  const replacement = parseHexInput(replaceHex.value)
  if (pattern.length === 0) return
  const count = editorStore.replaceAll(pattern, replacement)
  resultMessage.value = `已替换 ${count} 处`
}
</script>

<style scoped>
.find-replace {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.find-replace__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.find-replace__label {
  font-size: 12px;
  color: #888;
}

.find-replace__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.find-replace__result {
  font-size: 12px;
  color: #888;
}
</style>
