// Ace Editor逻辑

'use strict'

const fs = require('fs')
const path = require('path')
const { dialog } = require('electron').remote
// 新建 ace editor 实例
const editor = ace.edit('editor')

let appSettings
const jsonPath = path.join(__dirname, '../../config/AppSettings.json')
fs.readFile(jsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error(err)
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: '读取配置文件失败',
      button: ['确定'],
    })
  } else {
    appSettings = JSON.parse(data)
    editor.setTheme('ace/theme/' + appSettings.theme)
    // 语法高亮
    editor.session.setMode(null)
    editor.setFontSize(appSettings.font_size)
    // 选中行高亮
    editor.setHighlightActiveLine(true)
    // 代码补全
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true,
    })
  }
})

// 自定义代码联想内容。
let completerListJson
const completerDatabasePath = path.join(__dirname, '../../config/CompleterDatabase.json')
fs.readFile(completerDatabasePath, 'utf8', (err, data) => {
  if (err) {
    console.error(err)
    dialog.showMessageBox({
      type: 'error',
      title: '错误',
      message: '读取自定义代码联想文件失败',
      button: ['确定'],
    })
  } else {
    completerListJson = JSON.parse(data)['db']
  }
})
const langTools = ace.require('ace/ext/language_tools')
const setCompleterData = function (completerList) {
  langTools.addCompleter({
    getCompletions: function (editor, session, pos, prefix, callback) {
      if (prefix.length === 0) {
        return callback(null, [])
      } else {
        return callback(null, completerList)
      }
    },
  })
}
setCompleterData(completerListJson)
// 挂载Ace Editor对象到window
window.editor = editor

/**
 * 编辑器搜索功能
 */
const find = needle => {
  return function () {
    editor.find(needle, {
      backwards: false,
      warp: false,
      caseSensitive: false,
      wholeWord: false,
      regExp: false,
    })
  }
}
module.exports.find = find
