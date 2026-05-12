import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * settingsStore — 用户首选项配置
 */
export const useSettingsStore = defineStore('settings', () => {
  // 字体
  const fontFamily = ref("'Consolas', 'Courier New', monospace")
  const fontSize = ref(13)

  // 布局
  const bytesPerRow = ref(16)

  // 字节序
  const endian = ref('le')  // 'le' | 'be'

  // 已启用的解释器列表
  const enabledInterpreters = ref([
    'binary',
    'octal',
    'integer',
    'fp16',
    'float32',
    'float64',
    'guid',
    'ascii',
    'utf8',
    'utf16',
    'utf32',
    'gbk',
    'md5',
    'sha1',
    'crc32'
  ])

  // 默认不显示的解释器（用户可在设置中开启）
  // 'fp8', 'shiftjis', 'big5', 'dosdatetime', 'float128'

  // 偏移量显示列数（字符数，默认8位十六进制）
  const offsetDigits = ref(8)

  return {
    fontFamily,
    fontSize,
    bytesPerRow,
    endian,
    enabledInterpreters,
    offsetDigits
  }
})
