var noble = require('noble')
var constHelper = require('./constHelper')
var tempHelper = require('./tempHelper')
var mqtt = require('mqtt')
var config = require('config')

var mqttConfig = config.get('mqtt')

var mqttConnected = false
var msgCount = 0

var mqttConnString = `${mqttConfig.protocol}://${mqttConfig.username}:${mqttConfig.key}@${mqttConfig.url}`
var client = mqtt.connect(mqttConnString)

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
    peripheral.discoverAllServicesAndCharacteristics((error,services,characteristics)=>{
        if(error){
            console.error(error)
        }
        else{
            for (let characteristic of characteristics){
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
    if (data && data.length == 12){
        var probeTemps = []
        for (var i = 0; i< 6; i++) {
            var rawTemp = data.readInt16LE(i*2)
            if (rawTemp != -10) {
                probeTemps.push(tempHelper.cToF(rawTemp/10))
            }
            else {
                probeTemps.push(null)
            }
            
        }
        console.log(`Probes 1: ${probeTemps[0]}F 2: ${probeTemps[1]}F 3: ${probeTemps[2]}F `+
            `4: ${probeTemps[3]}F 5: ${probeTemps[4]}F 5: ${probeTemps[5]}F`)
        if (mqttConnected){
            msgCount++
            for (var j = 0; j < 6; j++){
                if(msgCount % mqttConfig.probeMessagePerPublish == 0 && probeTemps[j] != null) {
                    client.publish(mqttConfig.topics[j],JSON.stringify({
                        value:probeTemps[j]
                    }))
                }
            }
            
        }
    }
    else {
        console.error('wierd empty or wrong size buffer')
    }
}
