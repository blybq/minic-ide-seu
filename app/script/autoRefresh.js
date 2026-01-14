// 自动刷新资源管理器

'use strict'

const { getProperty, $ } = require('./utils')
const { initSideBarLow } = require('./sidebar')

/**
 * 刷新资源管理器
 */
function refreshExplorer() {
  const currentPath = getProperty('currentPath')
  const treeView = $('#tree-view')
  
  if (!currentPath) {
    return
  }
  
  if (!treeView) {
    // 延迟重试
    setTimeout(() => {
      const retryTreeView = $('#tree-view')
      if (retryTreeView && getProperty('currentPath')) {
        try {
          initSideBarLow(getProperty('currentPath'), retryTreeView, true)
        } catch (err) {
          console.error('刷新资源管理器失败:', err)
        }
      }
    }, 200)
    return
  }
  
  try {
    // 使用setTimeout确保DOM更新完成后再刷新
    setTimeout(() => {
      initSideBarLow(currentPath, treeView, true)
    }, 50)
  } catch (err) {
    console.error('刷新资源管理器失败:', err)
  }
}

module.exports = {
  refreshExplorer
}
