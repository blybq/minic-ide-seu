// 工具链配置逻辑

'use strict'

const fs = require('fs')
const { setPriority } = require('os')
const path = require('path')
const { dialog } = require('electron').remote
const jsonPath = path.join(__dirname, '../../config/ToolchainSettings.json')

const $ = document.querySelector.bind(document)

let toolchainSettings
const compilerPathDOM = $('[name="compiler-path"]')
const assemblerPathDOM = $('[name="assembler-path"]')
const serialportPathDOM = $('[name="serialport-path"]')
// const serialportNumDOM = $('[name="serialport-num"]')
// const serialportBaudDOM = $('[name="serialport-baud"]')

// const serialportNum = Array(16)
//   .fill(0)
//   .map((_, i) => 'COM' + (i + 1))
// const serialportBaud = ['1200', '2400', '4800', '9600', '14400', '19200', '38400', '56000']

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
    toolchainSettings = JSON.parse(data)
    compilerPathDOM.value = toolchainSettings.compiler_path
    assemblerPathDOM.value = toolchainSettings.assembler_path
    serialportPathDOM.value = toolchainSettings.serialport_path
    // serialportNum.forEach(v => {
    //   const node = document.createElement('option')
    //   node.innerHTML = v
    //   node.value = +v.replace('COM', '')
    //   serialportNumDOM.appendChild(node)
    // })
    // serialportNumDOM.selectedIndex = serialportNum.indexOf(toolchainSettings.serialport_num)

    // serialportBaud.forEach(v => {
    //   const node = document.createElement('option')
    //   node.innerHTML = v
    //   node.value = v
    //   serialportBaudDOM.appendChild(node)
    // })
    // serialportBaudDOM.selectedIndex = serialportBaud.indexOf(toolchainSettings.serialport_baud)
  }
})

document.querySelectorAll('.btn-path').forEach(
  v =>
    (v.onclick = function () {
      dialog
        .showOpenDialog({
          title: '选择文件...',
          filters: [
            {
              name: v.id == 'btn-serialport-path' ? 'exe可执行文件' : 'js文件',
              extensions: v.id == 'btn-serialport-path' ? ['exe'] : ['js'],
            },
          ],
        })
        .then(res => {
          if (res.filePaths[0]) {
            if (v.id == 'btn-compiler-path') {
              compilerPathDOM.value = res.filePaths[0]
            } else if (v.id == 'btn-assembler-path') {
              assemblerPathDOM.value = res.filePaths[0]
            } else if (v.id == 'btn-serialport-path') {
              serialportPathDOM.value = res.filePaths[0]
            }
          }
        })
    })
)

$('#btn-confirm').onclick = function () {
  toolchainSettings.compiler_path = compilerPathDOM.value
  toolchainSettings.assembler_path = assemblerPathDOM.value
  toolchainSettings.serialport_path = serialportPathDOM.value
  // toolchainSettings.serialport_num = serialportNum[serialportNumDOM.selectedIndex]
  // toolchainSettings.serialport_baud = serialportBaud[serialportBaudDOM.selectedIndex]
  fs.writeFile(jsonPath, JSON.stringify(toolchainSettings, null, 2), async err => {
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
      await dialog.showMessageBox({
        type: 'info',
        title: '提示',
        message: '保存成功！',
        button: ['确定'],
      })
      window.close()
    }
  })
}

$('#btn-quit').onclick = function () {
  window.close()
}
