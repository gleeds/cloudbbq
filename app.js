var noble = require('@abandonware/noble')
var constHelper = require('./constHelper')
var tempHelper = require('./tempHelper')
var mqtt = require('mqtt')
var config = require('config')
var program = require('commander')
var path = require('path')
var GoogleAssistant = require('google-assistant')

var mqttConfig = config.get('mqtt')
var notificationConfig = config.get('notifications')
var deviceConfig = config.get('device')
var localizationConfig = config.get('localization')

var mqttConnected = false
var msgCount = 0

//TODO: build this dynamically based of probe count
program
    .version('1.1.0')
    .option('-p1, --probe1 <n>','Probe 1 Target Temperature(F)',parseInt)
    .option('-p2, --probe2 <n>','Probe 2 Target Temperature(F)',parseInt)
    .option('-p3, --probe3 <n>','Probe 3 Target Temperature(F)',parseInt)
    .option('-p4, --probe4 <n>','Probe 4 Target Temperature(F)',parseInt)
    .option('-p5, --probe5 <n>','Probe 5 Target Temperature(F)',parseInt)
    .option('-p6, --probe6 <n>','Probe 6 Target Temperature(F)',parseInt)
    .parse(process.argv)

notificationConfig.targets = [
    program.probe1,
    program.probe2,
    program.probe3,
    program.probe4,
    program.probe5,
    program.probe6]
notificationConfig.set = [true,true,true,true,true,true]

const googleConfig = {
    auth: {
        keyFilePath: path.resolve(__dirname,notificationConfig.googleAssistant.oAuthSecretsFile),
        // where you want the tokens to be saved
        // will create the directory if not already there
        savedTokensPath: path.resolve(__dirname, 'config/tokens.json'),
    }
}
const assistant = notificationConfig.googleAssistant.enabled ? new GoogleAssistant(googleConfig.auth) : null

var mqttConnString = `${mqttConfig.protocol}://${mqttConfig.username}:${mqttConfig.key}@${mqttConfig.url}`
var client = mqtt.connect(mqttConnString)

client.on('connect',()=>{
    mqttConnected = true
})

noble.startScanning()

var pairCharacteristic, tempCharacteristic, commandCharacteristic

noble.on('discover',(peripheral)=>{

    // Check out this sample code: https://github.com/noble/noble/issues/179
    if (peripheral.advertisement.localName === 'iBBQ' ||
        (peripheral.advertisement.serviceUuids && 
            peripheral.advertisement.serviceUuids.includes('fff0'))){
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

    if (localizationConfig.units === 'F') {
        console.log('setting units')
        commandCharacteristic.write(constHelper.setUnitsFKey(),false)
    }
    console.log('sending start temp events')
    commandCharacteristic.write(constHelper.startTempUpdates(),false)

}

function handleTempEvent(data) {
    if (data && data.length == (deviceConfig.probes*2)){
        var probeTemps = []
        var logMsg = 'Probes '
        for (var i = 0; i< deviceConfig.probes; i++) {
            var rawTemp = data.readInt16LE(i*2)
            if (rawTemp != -10) {
                if (localizationConfig.units === 'F') {
                    probeTemps.push(tempHelper.cToF(rawTemp/10))
                }
                else {
                    probeTemps.push(rawTemp/10)
                }
                
            }
            else {
                probeTemps.push(null)
            }
            logMsg+=`${i+1}: ${probeTemps[i]||'--'}${localizationConfig.units} `
            
        }

        console.log(logMsg)

        if (mqttConnected){
            msgCount++
            for (var j = 0; j < deviceConfig.probes; j++){
                if(msgCount % mqttConfig.probeMessagePerPublish == 0 && probeTemps[j] != null) {
                    client.publish(mqttConfig.topics[j],JSON.stringify({
                        value:probeTemps[j]
                    }))
                }
            }            
        }

        if (notificationConfig.googleAssistant.enabled){
            for (var k = 0; k < deviceConfig.probes; k++){
                if (notificationConfig.set[k] && notificationConfig.targets[k]) {
                    if(probeTemps[k]>notificationConfig.targets[k]) {
                        notificationConfig.set[k] = false
                        sendGoogleNotification(k+1,probeTemps[k])
                    }
                }
            }
        }
    }
    else if (!data){
        console.error('Probe data empty')
    }
    else {
        console.error(`Probe data length ${data.length} but expected ${deviceConfig.probes*2} for a ${deviceConfig.probes} probe device. Check your device config json.`)
    }
}

function sendGoogleNotification(probe,temp) {
    assistant.start({'textQuery':`broadcast Probe ${probe} has reached ${temp} degrees ${localizationConfig.units === 'F' ? 'fahrenheit':'celsius'}.`})
}
