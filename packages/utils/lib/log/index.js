// 日志打印

const log = require('npmlog')

// 默认等级是info
log.level=process.env.LOG_LEVEL?process.env.LOG_LEVEL:'info'

// 自定义头部，也就是每次打印时，出现在第一位的东西
log.heading = 'imc'

// 自定义success日志
log.addLevel('success', 2000, { fg: 'green', blod: true })
// 自定义notice日志
log.addLevel('notice', 2000, { fg: 'green', bg: 'black' })

module.exports  = log