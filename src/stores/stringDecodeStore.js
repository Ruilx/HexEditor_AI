import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * stringDecodeStore — 管理用户手动指定的字符串解码区域
 *
 * 区域结构：
 * {
 *   id: string,
 *   startOffset: number,    // 区域起始偏移量（可能因末尾补全而大于用户选区起点）
 *   endOffset: number,      // 区域结束偏移量（含，可能因末尾补全而大于用户选区终点）
 *   encoding: string,       // TextDecoder 编码名（'utf-8'|'gbk'|'utf-16le'|...）
 *   charMap: Map<number, string>
 *   // offset → ' '  : 多字节序列的前导/续接字节（不显示）
 *   //          char  : 多字节序列最后一字节处显示的字符
 *   //          '\uFFFD' : 无效字节的替代符
 * }
 */
export const useStringDecodeStore = defineStore('stringDecode', () => {
  const regions = ref([])

  // ── 核心解码算法 ──────────────────────────────────────────────

  /**
   * 将字节数组解码为 charMap
   * @param {number} startOffset  区域起始偏移量（用于 map key）
   * @param {Uint8Array} bytes
   * @param {string} encoding
   * @param {boolean} strict  true=首字节出错返回失败；false=出错写替代符继续
   * @returns {{ ok: boolean, reason?: string, charMap: Map, stopOffset?: number }}
   */
  function buildCharMap(startOffset, bytes, encoding, strict) {
    const charMap = new Map()

    let decoder
    try {
      decoder = new TextDecoder(encoding, { fatal: true })
    } catch {
      return { ok: false, reason: `不支持的编码：${encoding}`, charMap }
    }

    const pendingOffsets = []   // 待确认的前导/续接字节 offset 列表
    let stopOffset = startOffset + bytes.length - 1

    for (let i = 0; i < bytes.length; i++) {
      const chunk = bytes.slice(i, i + 1)
      const offset = startOffset + i
      let out = ''
      let invalid = false

      try {
        out = decoder.decode(chunk, { stream: true })
      } catch {
        invalid = true
      }

      if (invalid) {
        if (strict && charMap.size === 0 && pendingOffsets.length === 0) {
          // 首字节就无效
          return { ok: false, reason: `首字节无法作为 ${encoding} 编码的起始字节`, charMap }
        }
        if (strict) {
          // 中途无效：停止并记录停止位置
          stopOffset = offset - 1
          return { ok: true, truncated: true, stopOffset, charMap }
        }
        // 非严格模式：写替代符，重置 pending 并尝试继续
        for (const po of pendingOffsets) {
          charMap.set(po, ' ')
        }
        pendingOffsets.length = 0
        charMap.set(offset, '\uFFFD')
        // 重建 decoder 以重置内部状态
        try {
          decoder = new TextDecoder(encoding, { fatal: true })
        } catch {
          break
        }
        continue
      }

      if (out === '') {
        // 多字节序列续接字节
        pendingOffsets.push(offset)
      } else {
        // 序列完成：pending 字节标记为空格，当前字节存字符
        for (const po of pendingOffsets) {
          charMap.set(po, ' ')
        }
        pendingOffsets.length = 0
        // 一次可能输出多个字符（某些编码下），只取最后一个显示
        charMap.set(offset, out[out.length - 1])
      }
    }

    // 处理末尾可能残留的 pending（未完成的多字节序列）
    for (const po of pendingOffsets) {
      charMap.set(po, ' ')
    }

    return { ok: true, truncated: false, stopOffset, charMap }
  }

  // ── 重叠处理 ──────────────────────────────────────────────────

  /**
   * 将已有区域按新区域的范围裁剪（新区域覆盖旧区域的部分）
   * @param {number} newStart
   * @param {number} newEnd
   */
  function clipExistingRegions(newStart, newEnd) {
    const toRemove = []
    for (const region of regions.value) {
      const s = region.startOffset
      const e = region.endOffset
      if (newStart <= s && newEnd >= e) {
        // 完全覆盖：删除
        toRemove.push(region.id)
      } else if (newStart <= s && newEnd >= s) {
        // 覆盖旧区域头部：旧区域起点后移
        region.startOffset = newEnd + 1
        // 清除 charMap 中被覆盖的部分
        for (let o = s; o <= newEnd; o++) region.charMap.delete(o)
      } else if (newStart <= e && newEnd >= e) {
        // 覆盖旧区域尾部：旧区域终点前移
        region.endOffset = newStart - 1
        for (let o = newStart; o <= e; o++) region.charMap.delete(o)
      } else if (newStart > s && newEnd < e) {
        // 新区域嵌在旧区域中间：将旧区域拆为左右两段
        // 右段作为新区域
        const rightRegion = {
          id: crypto.randomUUID(),
          startOffset: newEnd + 1,
          endOffset: e,
          encoding: region.encoding,
          charMap: new Map()
        }
        for (let o = newEnd + 1; o <= e; o++) {
          if (region.charMap.has(o)) rightRegion.charMap.set(o, region.charMap.get(o))
        }
        regions.value.push(rightRegion)
        // 左段保留
        region.endOffset = newStart - 1
        for (let o = newStart; o <= e; o++) region.charMap.delete(o)
      }
    }
    regions.value = regions.value.filter(r => !toRemove.includes(r.id))
    // 清除长度为 0 的区域
    regions.value = regions.value.filter(r => r.startOffset <= r.endOffset)
  }

  // ── 公开 API ──────────────────────────────────────────────────

  /**
   * 添加字符串解码区域
   * @param {number} start         用户选区起始
   * @param {number} end           用户选区结束（含）
   * @param {string} encoding      编码名称
   * @param {object} fileStore     fileStore 实例
   * @returns {{ ok: boolean, reason?: string, truncated?: boolean, actualEnd?: number }}
   */
  function addRegion(start, end, encoding, fileStore) {
    // 先读取选区字节
    let actualEnd = end
    let bytes = fileStore.getBytes(start, end - start + 1)

    // 尝试检测并补全末尾不完整的多字节序列
    // 用一个宽松解码器检测末尾是否有 pending 字节
    const testDecoder = (() => {
      try { return new TextDecoder(encoding, { fatal: true }) } catch { return null }
    })()

    if (testDecoder) {
      // 先喂入所有字节，看末尾是否有未完成的序列
      let pendingCount = 0
      const tempDecoder = new TextDecoder(encoding, { fatal: true })
      for (let i = 0; i < bytes.length; i++) {
        try {
          tempDecoder.decode(bytes.slice(i, i + 1), { stream: true })
        } catch {
          break
        }
      }
      // 通过 flush 检测末尾 pending
      try {
        tempDecoder.decode(new Uint8Array(0), { stream: false })
      } catch {
        // 末尾有未完成序列，尝试向后补充最多 3 个字节
        for (let extra = 1; extra <= 3; extra++) {
          const nextByte = fileStore.getByte(end + extra)
          if (nextByte === null) break
          const extBytes = new Uint8Array(bytes.length + extra)
          extBytes.set(bytes)
          for (let j = 0; j < extra; j++) {
            const b = fileStore.getByte(end + j + 1)
            if (b === null) break
            extBytes[bytes.length + j] = b
          }
          // 再次测试
          try {
            const tryDecoder = new TextDecoder(encoding, { fatal: true })
            for (let i = 0; i < extBytes.length; i++) {
              tryDecoder.decode(extBytes.slice(i, i + 1), { stream: true })
            }
            tryDecoder.decode(new Uint8Array(0))
            // 成功：接受扩展
            actualEnd = end + extra
            bytes = extBytes
            break
          } catch {
            // 继续尝试更多
          }
        }
      }
    }

    // 执行严格解码
    const result = buildCharMap(start, bytes, encoding, true)
    if (!result.ok) {
      return { ok: false, reason: result.reason }
    }

    // 若中途截断，更新 actualEnd
    if (result.truncated) {
      actualEnd = result.stopOffset
      // 裁剪 charMap 到 actualEnd
      for (const k of [...result.charMap.keys()]) {
        if (k > actualEnd) result.charMap.delete(k)
      }
    }

    // 处理重叠
    clipExistingRegions(start, actualEnd)

    // 创建区域
    const region = {
      id: crypto.randomUUID(),
      startOffset: start,
      endOffset: actualEnd,
      encoding,
      charMap: result.charMap
    }
    regions.value = [...regions.value, region]

    return { ok: true, truncated: result.truncated, actualEnd }
  }

  /**
   * 替换模式写入后，重新解码所有受影响的区域
   * @param {number} writeOffset
   * @param {number} writeLength
   * @param {object} fileStore
   */
  function updateAffectedRegions(writeOffset, writeLength, fileStore) {
    const writeEnd = writeOffset + writeLength - 1
    for (const region of regions.value) {
      if (region.endOffset < writeOffset || region.startOffset > writeEnd) continue
      // 重新读取区域字节
      const len = region.endOffset - region.startOffset + 1
      const bytes = fileStore.getBytes(region.startOffset, len)
      // 宽松解码（fatal:false 模式）：无效字节写替代符
      const result = buildCharMap(region.startOffset, bytes, region.encoding, false)
      region.charMap = result.charMap
    }
  }

  /**
   * 删除字节后调整所有区域偏移量
   */
  function adjustForDeletion(deleteStart, deleteLength, fileStore) {
    const deleteEnd = deleteStart + deleteLength - 1
    const newRegions = []

    for (const region of regions.value) {
      const s = region.startOffset
      const e = region.endOffset

      if (e < deleteStart) {
        newRegions.push(region)
        continue
      }
      if (s > deleteEnd) {
        region.startOffset = s - deleteLength
        region.endOffset = e - deleteLength
        // 重建 charMap（key 偏移量变了）
        const newMap = new Map()
        for (const [k, v] of region.charMap) newMap.set(k - deleteLength, v)
        region.charMap = newMap
        newRegions.push(region)
        continue
      }
      // 与删除区重叠：收缩或删除
      if (s < deleteStart && e > deleteEnd) {
        // 区域跨越删除区：收缩
        region.endOffset = e - deleteLength
        const newMap = new Map()
        for (const [k, v] of region.charMap) {
          if (k < deleteStart) newMap.set(k, v)
          else if (k > deleteEnd) newMap.set(k - deleteLength, v)
        }
        region.charMap = newMap
        if (region.startOffset <= region.endOffset) {
          // 重新解码收缩后的区域
          const len = region.endOffset - region.startOffset + 1
          const bytes = fileStore.getBytes(region.startOffset, len)
          region.charMap = buildCharMap(region.startOffset, bytes, region.encoding, false).charMap
          newRegions.push(region)
        }
      } else if (s >= deleteStart && e <= deleteEnd) {
        // 区域完全在删除范围内：丢弃
      } else if (s < deleteStart) {
        region.endOffset = deleteStart - 1
        for (let o = deleteStart; o <= e; o++) region.charMap.delete(o)
        if (region.startOffset <= region.endOffset) newRegions.push(region)
      } else {
        region.startOffset = deleteStart
        region.endOffset = e - deleteLength
        const newMap = new Map()
        for (const [k, v] of region.charMap) {
          if (k > deleteEnd) newMap.set(k - deleteLength, v)
        }
        region.charMap = newMap
        if (region.startOffset <= region.endOffset) {
          const len = region.endOffset - region.startOffset + 1
          const bytes = fileStore.getBytes(region.startOffset, len)
          region.charMap = buildCharMap(region.startOffset, bytes, region.encoding, false).charMap
          newRegions.push(region)
        }
      }
    }

    regions.value = newRegions
  }

  /**
   * 插入字节后调整所有区域偏移量
   */
  function adjustForInsertion(insertOffset, insertLength, fileStore) {
    for (const region of regions.value) {
      const s = region.startOffset
      const e = region.endOffset
      if (e < insertOffset) continue

      if (s >= insertOffset) {
        // 整体后移
        region.startOffset = s + insertLength
        region.endOffset = e + insertLength
        const newMap = new Map()
        for (const [k, v] of region.charMap) newMap.set(k + insertLength, v)
        region.charMap = newMap
      } else {
        // 插入点在区域内：扩展区域并重新解码
        region.endOffset = e + insertLength
        const len = region.endOffset - region.startOffset + 1
        const bytes = fileStore.getBytes(region.startOffset, len)
        region.charMap = buildCharMap(region.startOffset, bytes, region.encoding, false).charMap
      }
    }
  }

  /**
   * 获取指定偏移量处的字符
   * @param {number} offset
   * @returns {string|null} null = 不在任何区域内
   */
  function getCharAtOffset(offset) {
    for (const region of regions.value) {
      if (offset >= region.startOffset && offset <= region.endOffset) {
        return region.charMap.get(offset) ?? null
      }
    }
    return null
  }

  /**
   * 获取与某行重叠的所有区域
   */
  function getRegionsInRow(rowStart, rowEnd) {
    return regions.value.filter(r => r.startOffset <= rowEnd && r.endOffset >= rowStart)
  }

  /**
   * 删除指定区域
   */
  function removeRegion(id) {
    regions.value = regions.value.filter(r => r.id !== id)
  }

  /**
   * 切换文件时清空所有区域
   */
  function clearAll() {
    regions.value = []
  }

  return {
    regions,
    addRegion,
    updateAffectedRegions,
    adjustForDeletion,
    adjustForInsertion,
    getCharAtOffset,
    getRegionsInRow,
    removeRegion,
    clearAll
  }
})
