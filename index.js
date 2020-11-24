var migrate = require('migrate')
global = require('./config')

migrate.load({
  stateStore: '.migrate'
}, function (err, set) {
  if (err) {
    throw err
  }
  set.up(function (err) {
    if (err) {
      throw err
    }
    console.log('Migration successfully completed')
  })
})