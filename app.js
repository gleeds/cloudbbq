var noble = require('noble')
var constHelper = require('./constHelper')
var tempHelper = require('./tempHelper')
var mqtt = require('mqtt')
var config = require('config')

var mqttConfig = config.get('adafruitio')

var mqttConnected = false
var msgCount = 0

var client = mqtt.connect(`mqtts://${mqttConfig.username}:${mqttConfig.key}@io.adafruit.com:8883`)

client.on('connect',()=>{
    mqttConnected = true
})

noble.startScanning()

var tempCharacteristic, commandCharacteristic

noble.on('discover',(peripheral)=>{

    // Check out this sample code: https://github.com/noble/noble/issues/179
    if (peripheral.advertisement.localName === 'iBBQ'){
        console.log('iBBQ Discovered')
        noble.stopScanning()

        peripheral.on('disconnect', () => {
            console.log('Lost connection to device.')
            process.exit(0)
        })

        peripheral.connect((error) =>{
            if (error) {
                console.error(error)
            }
            else {
                console.log('Connected to iBBQ')
                peripheral.discoverAllServicesAndCharacteristics((error,services,characteristics)=>{
                    if (error){
                        console.error(error)
                    }
                    else {
                        services.forEach(service => {
                            console.log(`Service: ${service.uuid}`)
                        })
                        characteristics.forEach(characteristic => {
                            console.log(`Characteristic: ${characteristic.name} (${characteristic.uuid})`)
                            characteristic.read((error,data) => {
                                if (error) {
                                    console.error(error)
                                } 
                                else {
                                    if (data) {
                                        console.log(data.toString('utf8'))
                                    }
                                    else {
                                        console.log('No data for characteristic')
                                    }
                                }
                            })
                            if (characteristic.uuid === 'fff5'){
                                console.log('binding command characteristic')
                                commandCharacteristic = characteristic
                                if (commandCharacteristic) {
                                    console.log('sending read versions')
                                    commandCharacteristic.write(constHelper.readVersionsKey(),false)
                                    console.log('sending dianya command')
                                    commandCharacteristic.write(constHelper.dianyaKey(),false)
                                    console.log('setting units')
                                    commandCharacteristic.write(constHelper.setUnitsFKey(),false)
                                    console.log('sending start temp events')
                                    commandCharacteristic.write(constHelper.startTempUpdates(),false)
                                }
                                else {
                                    console.error('can\'t send post pair command, missing characteristic')
                                }
                            }
                            else if (characteristic.uuid === 'fff2') {
                                console.log ('writing handPair key first')
                                characteristic.write(constHelper.handPairKey(),true, (error)=>{
                                    if (error){
                                        console.error(error)
                                    }
                                    else {
                                        console.log('paired')
                                        
                                    }
                                })
                                console.log('writing autoPair key to char fff2')
                                characteristic.write(constHelper.autoPairKey(),true, (error)=>{
                                    if (error){
                                        console.error(error)
                                    }
                                    else {
                                        console.log('paired')
                                        
                                    }
                                })
                            }
                            else if (characteristic.uuid === 'fff1') {
                                console.log('subscribing to fff1 notifications')
                                characteristic.notify(true,(error)=>{
                                    if (error){
                                        console.error(error)
                                    }
                                })
                                characteristic.on('data',(data,isNotification) =>{
                                    console.log('fff1 data:')
                                    console.log(data)
                                    console.log(isNotification)
                                })
                            }
                            else if (characteristic.uuid === 'fff4') {
                                console.log('binding temp characteristic')
                                tempCharacteristic = characteristic
                                console.log(tempCharacteristic.properties)

                                console.log('Enable ff4 notifications')

                                console.log('subscribing to temp characteristic')
                                tempCharacteristic.subscribe((error)=>{
                                    if (error) {
                                        console.error(error)
                                    }
                                })

                                tempCharacteristic.on('data',(data,isNotification) =>{
                                    console.log('fff4 data:')
                                    if (data && data.length>0){
                                        console.log(data)
                                        var probe1Temp = tempHelper.cToF(data.readInt16LE(0)/10)
                                        console.log(`Probe 1: ${probe1Temp}F`)
                                        if (mqttConnected){
                                            msgCount++
                                            if(msgCount%3 == 0) {
                                                client.publish(mqttConfig.topics[0],JSON.stringify({
                                                    value:probe1Temp
                                                }))
                                            }
                                        }
                                    }
                                    else {
                                        console.error('wierd empty buffer')
                                    }
                                })
                            }
                            else if (characteristic.uuid === '2a2c') {
                                console.log('Found Service 2')
                                console.log(characteristic.name)
                            }
                        })
                    }
                })
            }
        })
    }
    else {
        console.log(`Ignoring advertisement for ${peripheral.advertisement.localName}`)
    }
})
