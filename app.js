// Minisys IDE 运行入口

// 加载热重载插件
if (process.env.NODE_ENV && process.env.NODE_ENV.trim() == 'development') {
  try {
    require('electron-reloader')(module, {
      ignore: ['./config/AppSettings.json', './config/CompleterDatabase.json', './config/ToolchainSettings.json'],
    })
  } catch (_) {}
}

// 加载首页
require('./app/script/index')
