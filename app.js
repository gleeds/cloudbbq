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

var pairCharacteristic, tempCharacteristic, commandCharacteristic

noble.on('discover',(peripheral)=>{

    // Check out this sample code: https://github.com/noble/noble/issues/179
    if (peripheral.advertisement.localName === 'iBBQ'){
        console.log('iBBQ Discovered')
        noble.stopScanning()

        peripheral.on('disconnect', () => {
            console.log('Lost connection to device.')
            noble.startScanning()
        })

        peripheral.connect((error)=>{
            if (error){
                console.error(error)
            }
            else {
                connectToIBBQ(peripheral)
            }
        })
    }
})



function connectToIBBQ(peripheral) {
    //peripheral.discoverSomeServicesAndCharacteristics(['fff0'],['fff2','fff4','fff5'],(error,services,characteristics)=>{
    peripheral.discoverAllServicesAndCharacteristics((error,services,characteristics)=>{
        if(error){
            console.error(error)
        }
        else{
            for (let characteristic of characteristics){
                console.log('mapping characteristic ' + characteristic.uuid)
                switch(characteristic.uuid){
                    case 'fff2':
                        pairCharacteristic = characteristic
                        break
                    case 'fff4':
                        tempCharacteristic = characteristic
                        break
                    case 'fff5':
                        commandCharacteristic = characteristic
                        break
                }
            }

            pairToDevice()
        }
    })
}

function pairToDevice() {
    console.log(pairCharacteristic.uuid)
    pairCharacteristic.write(constHelper.autoPairKey(),true, (error)=>{
        if (error){
            console.error(error)
        }
        else {
            console.log('paired')
            subscribeToEvents()
        }
    })
}

function subscribeToEvents() {
    tempCharacteristic.subscribe((error)=>{
        if (error) {
            console.error(error)
        }
    })
    tempCharacteristic.on('data',(data) => handleTempEvent(data))

    console.log('setting units')
    commandCharacteristic.write(constHelper.setUnitsFKey(),false)
    console.log('sending start temp events')
    commandCharacteristic.write(constHelper.startTempUpdates(),false)

}

function handleTempEvent(data) {
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
}
