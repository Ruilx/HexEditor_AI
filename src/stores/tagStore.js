import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * tagStore — 管理当前文件的标签数据
 *
 * 标签结构：
 * {
 *   id: string,           // UUID
 *   startOffset: number,  // 起始字节偏移量（固定 offset 模式）
 *   endOffset: number,    // 结束字节偏移量（含）
 *   label: string,        // 标签文本
 *   note: string,         // 备注（状态栏显示）
 *   fgColor: string,      // 前景颜色 CSS
 *   bgColor: string,      // 背景颜色 CSS
 *   dynamic: boolean      // 是否为动态 offset 标签（Phase 5+）
 * }
 */
export const useTagStore = defineStore('tag', () => {
  const tags = ref([])

  /**
   * 创建新标签
   * @param {{ startOffset, endOffset, label, note, fgColor, bgColor }} data
   */
  function createTag(data) {
    const tag = {
      id: crypto.randomUUID(),
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      label: data.label ?? '',
      note: data.note ?? '',
      fgColor: data.fgColor ?? '#ffffff',
      bgColor: data.bgColor ?? '#1677ff',
      dynamic: false
    }
    tags.value.push(tag)
    return tag.id
  }

  /**
   * 更新标签属性
   * @param {string} id
   * @param {Partial<Tag>} updates
   */
  function updateTag(id, updates) {
    const tag = tags.value.find(t => t.id === id)
    if (tag) Object.assign(tag, updates)
  }

  /**
   * 删除标签
   * @param {string} id
   */
  function deleteTag(id) {
    const idx = tags.value.findIndex(t => t.id === id)
    if (idx !== -1) tags.value.splice(idx, 1)
  }

  /**
   * 使用指定 id 创建标签（用于 TagDeleteCommand.undo 还原）
   * @param {object} tag 含 id 的完整标签对象
   */
  function createTagWithId(tag) {
    // 避免重复
    if (tags.value.some(t => t.id === tag.id)) return
    tags.value.push({ ...tag })
  }

  /**
   * 用快照还原 tags（用于 InsertCommand / DeleteCommand / ResizeCommand undo）
   * @param {object[]} snapshot  由 serializeSnapshot() 生成的深拷贝数组
   */
  function restoreSnapshot(snapshot) {
    tags.value = snapshot.map(t => ({ ...t }))
  }

  /**
   * 序列化当前 tags 为深拷贝快照（供 Command 构造时调用）
   * @returns {object[]}
   */
  function serializeSnapshot() {
    return tags.value.map(t => ({ ...t }))
  }

  /**
   * 获取指定偏移量处的标签（光标悬停时）
   * @param {number} offset
   * @returns {Tag|null}
   */
  function getTagAtOffset(offset) {
    return tags.value.find(t => offset >= t.startOffset && offset <= t.endOffset) ?? null
  }

  /**
   * 获取与某行（行内字节范围）相交的所有标签
   * @param {number} rowStartOffset
   * @param {number} rowEndOffset
   * @returns {Tag[]}
   */
  function getTagsInRow(rowStartOffset, rowEndOffset) {
    return tags.value.filter(t =>
      t.startOffset <= rowEndOffset && t.endOffset >= rowStartOffset
    )
  }

  /**
   * 按 ID 查找标签
   * @param {string} id
   * @returns {Tag|null}
   */
  function getTagById(id) {
    return tags.value.find(t => t.id === id) ?? null
  }

  /**
   * 清空所有标签（切换文件时使用）
   */
  function clearTags() {
    tags.value = []
  }

  /**
   * 从 .TAG 文件数据批量导入标签
   * @param {Tag[]} tagList
   */
  function importTags(tagList) {
    tags.value = tagList.map(t => ({ ...t }))
  }

  /**
   * 导出标签列表（用于写入 .TAG 文件）
   * @returns {Tag[]}
   */
  function exportTags() {
    return tags.value.map(t => ({ ...t }))
  }

  /**
   * 删除字节后调整所有标签的偏移量
   * @param {number} deleteStart - 删除起始偏移量
   * @param {number} deleteLength - 删除字节数
   */
  function adjustTagsForDeletion(deleteStart, deleteLength) {
    const deleteEnd = deleteStart + deleteLength - 1
    const newTags = []

    for (const tag of tags.value) {
      const s = tag.startOffset
      const e = tag.endOffset

      // 标签完全在删除范围之前：不变
      if (e < deleteStart) {
        newTags.push(tag)
        continue
      }

      // 标签完全在删除范围之后：整体前移
      if (s > deleteEnd) {
        newTags.push({ ...tag, startOffset: s - deleteLength, endOffset: e - deleteLength })
        continue
      }

      // 标签与删除范围重叠
      if (s < deleteStart) {
        if (e <= deleteEnd) {
          // 标签尾部落入删除区：截断尾部
          newTags.push({ ...tag, endOffset: deleteStart - 1 })
        } else {
          // 标签跨越整个删除区：收缩
          newTags.push({ ...tag, endOffset: e - deleteLength })
        }
      } else {
        // 标签起始在删除区内
        if (e <= deleteEnd) {
          // 标签完全在删除区内：移除标签
        } else {
          // 标签尾部在删除区之后：起始移至删除点
          newTags.push({ ...tag, startOffset: deleteStart, endOffset: e - deleteLength })
        }
      }
    }

    tags.value = newTags
  }

  /**
   * 插入字节后调整所有标签的偏移量
   * @param {number} insertOffset - 插入位置
   * @param {number} insertLength - 插入字节数
   */
  function adjustTagsForInsertion(insertOffset, insertLength) {
    tags.value = tags.value.map(tag => {
      const s = tag.startOffset
      const e = tag.endOffset

      // 标签完全在插入点之前：不变
      if (e < insertOffset) return tag

      // 标签起始在插入点处或之后：整体后移
      if (s >= insertOffset) {
        return { ...tag, startOffset: s + insertLength, endOffset: e + insertLength }
      }

      // 标签跨越插入点：扩展尾部
      return { ...tag, endOffset: e + insertLength }
    })
  }

  return {
    tags,
    createTag,
    createTagWithId,
    updateTag,
    deleteTag,
    getTagAtOffset,
    getTagsInRow,
    getTagById,
    clearTags,
    importTags,
    exportTags,
    adjustTagsForDeletion,
    adjustTagsForInsertion,
    restoreSnapshot,
    serializeSnapshot
  }
})
