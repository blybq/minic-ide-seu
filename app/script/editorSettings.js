// 编辑器个性化逻辑

'use strict'

const fs = require('fs')
const path = require('path')
const { dialog } = require('electron').remote
const jsonPath = path.join(__dirname, '../../config/AppSettings.json')

const $ = document.querySelector.bind(document)

let appSettings
const fontSizeDOM = $('[name="font-size"]')
const themeDOM = $('[name="theme"]')
const themeTable = ['ambiance', 'chaos', 'chrome', 'xcode', 'vibrant_ink', 'terminal', 'sqlserver', 'github']

// 读取配置，初始化菜单选项
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
    fontSizeDOM.value = appSettings.font_size
    themeTable.forEach(theme => {
      const node = document.createElement('option')
      node.innerHTML = theme
      node.value = theme
      themeDOM.appendChild(node)
    })
    themeDOM.selectedIndex = themeTable.indexOf(appSettings.theme)
  }
})

$('#btn-confirm').onclick = function () {
  appSettings.font_size = parseInt(fontSizeDOM.value)
  appSettings.theme = themeDOM.options[themeDOM.selectedIndex].value
  fs.writeFile(jsonPath, JSON.stringify(appSettings, null, 2), async err => {
    if (err) {
      console.error(err)
      dialog.showMessageBox({
        type: 'error',
        title: '错误',
        message: '保存配置文件失败',
        button: ['确定'],
      })
    } else {
      // 实时预览
      window.opener.eval(
        `window.editor.setFontSize(${appSettings.font_size});window.editor.setTheme('ace/theme/${appSettings.theme}');`
      )
      await dialog.showMessageBox({
        type: 'info',
        title: '提示',
        message: '修改成功！',
        button: ['确定'],
      })
      window.close()
    }
  })
}

$('#btn-quit').onclick = function () {
  window.close()
}
