var noble = require('noble-promise')
//var constHelper = require('./constHelper')
var iBBQService = require('./ibbqservice')

noble.startScanning()

noble.on('discover',(peripheral)=>{
    if (peripheral.advertisement.localName === 'iBBQ'){
        console.log('iBBQ Found')
        noble.startScanning()
        var service = new iBBQService(peripheral)
        service.start()
    }
})