// 工具方法

'use strict'

const path = require('path')

/**
 * 获取暂存配置
 */
module.exports.getProperty = function (key) {
  return window.minisys_ide[key]
}

/**
 * 配置暂存
 */
module.exports.setProperty = function (key, val) {
  window.minisys_ide = window.minisys_ide || {}
  window.minisys_ide[key] = val
}

/**
 * 方便DOM元素选取
 */
module.exports.$ = document.querySelector.bind(document)

/**
 * 根据扩展名获取高亮模式
 */
module.exports.getHighlightMode = function (extName) {
  !extName.startsWith('.') && (extName = '.' + extName)
  const table = {
    '.c': 'ace/mode/c_cpp',
    '.cpp': 'ace/mode/c_cpp',
    '.asm': 'ace/mode/mips',
  }
  return table[extName] || null
}

/**
 * 根据扩展名获取文件图标
 * @param {'file' | 'directory'} type
 * @param {string} filename
 * @param {'on' | 'off'} status
 */
module.exports.getIcon = function (type, filename, status) {
  let icon = ''
  if (type == 'directory') icon = `folder${status}_icon1.png`
  else {
    const ext = path.extname(filename).substring(1)
    const extToIcon = {
      asm: 'asm_icon.png',
      c: 'c_icon.png',
    }
    const defaultIcon = 'default_icon.png'
    icon = extToIcon[ext] || defaultIcon
  }
  const iconUrl = '../../asset/' + icon
  return iconUrl
}
