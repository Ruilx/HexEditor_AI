<template>
  <div class="offset-column">
    <div
      v-for="row in rows"
      :key="row.rowIndex"
      class="offset-column__item"
    >
      {{ formatOffset(row.offset) }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  rows: { type: Array, default: () => [] }
})

function formatOffset(offset) {
  return offset.toString(16).toUpperCase().padStart(8, '0')
}
</script>

<style scoped>
.offset-column {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  color: #888;
  background: #252526;
  border-right: 1px solid #3e3e3e;
  flex: 0 0 auto;
  user-select: none;
}

.offset-column__item {
  height: 22px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
</style>
