var migrate = require('migrate')
global = {
    config: {
        sourceMongodb: "mongodb://localhost/redbox",
        targetMongodb: "mongodb://localhost/redbox-storage",
    }
}


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