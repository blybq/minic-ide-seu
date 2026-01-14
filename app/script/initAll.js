// 初始化事件监听

'use strict'

try {
  require('./sidebar.js').initSideBar()
} catch (err) {
  console.error('初始化侧边栏失败:', err)
}

// 菜单现在在主进程中设置（app/script/index.js），不再在渲染进程中设置
// require('./mainMenu.js').initMainMenu()

require('./toolbar.js').initToolBar()

try {
  require('./activityBar.js').initActivityBar()
} catch (err) {
  console.error('初始化活动栏失败:', err)
}

// 初始化文件和目录右键菜单
const { setupDirectoryContextMenu, setupFileContextMenu } = require('./fileContextMenu')
setupDirectoryContextMenu()
setupFileContextMenu()

// 初始化终端（延迟初始化，等待DOM加载完成）
setTimeout(() => {
  const { initTerminal } = require('./terminal')
  initTerminal()
}, 500)
