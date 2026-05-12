<template>
  <div class="context-menu" v-if="visible" :style="menuStyle" @contextmenu.prevent>
    <!-- 选中时菜单 -->
    <template v-if="type === 'selection'">
      <div class="context-menu__item" @click="emit('cut')">剪切</div>
      <div class="context-menu__item" @click="emit('copy')">复制</div>
      <div class="context-menu__item" @click="emit('paste')">粘贴</div>
      <div class="context-menu__divider" />
      <div class="context-menu__item" @click="emit('copyOffsetDec')">按十进制复制偏移量</div>
      <div class="context-menu__item" @click="emit('copyOffsetHex')">按十六进制复制偏移量</div>
      <div class="context-menu__divider" />
      <div class="context-menu__item" @click="emit('createTag')">创建标签</div>
      <div class="context-menu__item" @click="emit('stringDecode')">字符串解码…</div>
      <div class="context-menu__submenu-trigger">
        复制为…
        <span class="context-menu__arrow">›</span>
      </div>
      <div class="context-menu__submenu-trigger">
        编码…
        <span class="context-menu__arrow">›</span>
      </div>
      <div class="context-menu__submenu-trigger">
        哈希…
        <span class="context-menu__arrow">›</span>
      </div>
    </template>

    <!-- 未选中时菜单 -->
    <template v-else-if="type === 'empty'">
      <div class="context-menu__item" @click="emit('setFileSize')">调整文件大小</div>
      <div class="context-menu__item" @click="emit('paste')">粘贴到光标处</div>
      <div class="context-menu__divider" />
      <div class="context-menu__item" @click="emit('displaySettings')">显示设置</div>
    </template>

    <!-- 标签菜单 -->
    <template v-else-if="type === 'tag'">
      <div class="context-menu__item" @click="emit('editTag')">编辑标签…</div>
      <div class="context-menu__item" @click="emit('deleteTag')">删除标签</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  // 'selection' | 'empty' | 'tag'
  type: { type: String, default: 'empty' }
})

const emit = defineEmits([
  'cut', 'copy', 'paste',
  'copyOffsetDec', 'copyOffsetHex',
  'createTag', 'editTag', 'deleteTag',
  'stringDecode',
  'setFileSize', 'displaySettings'
])

const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: #2d2d2d;
  border: 1px solid #3e3e3e;
  border-radius: 4px;
  padding: 4px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  color: #d4d4d4;
}

.context-menu__item,
.context-menu__submenu-trigger {
  padding: 5px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

.context-menu__item:hover,
.context-menu__submenu-trigger:hover {
  background: #094771;
}

.context-menu__divider {
  height: 1px;
  background: #3e3e3e;
  margin: 4px 0;
}

.context-menu__arrow {
  color: #888;
}
</style>
