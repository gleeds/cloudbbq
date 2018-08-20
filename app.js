var noble = require('noble')
var constHelper = require('./constHelper')
var tempHelper = require('./tempHelper')
var mqtt = require('mqtt')
var config = require('config')
// var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString
// var Message = require('azure-iot-device').Message


// var client = clientFromConnectionString(connectionString)

// var azureClientOpen = false

// client.open(((error)=>{
//     if (!error){
//         azureClientOpen = true
//     }

//     client.on('disconnect', function () {
//         azureClientOpen = false
//     })
// }))
// var awsIot = require('aws-iot-device-sdk')



// awsDevice.on('connect', function() {
//     console.log('aws iot connect')
// })

// awsDevice.on('error', function(error) {
//     console.log('aws iot error', error)
// })

// awsDevice.on('message',(topic,payload)=>{
//     console.log(`${topic}: ${payload}`)
// } )

// awsDevice.subscribe('temp_topic')

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
                                    
                                    //console.log('Setting test Target Temp')
                                    //commandCharacteristic.write(constHelper.setTargetTempKey(0,-3000,3020),false)
                                    // console.log('sending fuwei command')
                                    // commandCharacteristic.write(constHelper.fuweiKey(),false)
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

                                // characteristic.discoverDescriptors((error,descriptors)=>{
                                //     if (error){
                                //         console.error(error)
                                //     }
                                //     else {
                                //         descriptors.forEach((d)=>{
                                //             console.log(`Descriptor: ${d.name} (${d.uuid})`)
                                //             if (d.uuid === '2902'){
                                //                 console.log('writing descriptor for ff1')
                                //                 d.writeValue(new Buffer([0x01, 0x00]),(error)=>{
                                //                     if (error){
                                //                         console.error(error)
                                //                     }
                                //                 })
                                //             }
                                //         })
                                //     }
                                // })
                            }
                            else if (characteristic.uuid === 'fff4') {
                                console.log('binding temp characteristic')
                                tempCharacteristic = characteristic
                                console.log(tempCharacteristic.properties)

                                console.log('Enable ff4 notifications')
                                // tempCharacteristic.discoverDescriptors((error,descriptors)=>{
                                //     if (error){
                                //         console.error(error)
                                //     }
                                //     else {
                                //         descriptors.forEach((d)=>{
                                //             console.log(`Descriptor: ${d.name} (${d.uuid})`)
                                //             if (d.uuid === '2902'){
                                //                 console.log('writing descriptor')
                                //                 d.writeValue(new Buffer([0x01, 0x00]),(error)=>{
                                //                     if (error){
                                //                         console.error(error)
                                //                     }
                                //                 })
                                //             }
                                //         })
                                //     }
                                // })
                                console.log('subscribing to temp characteristic')
                                tempCharacteristic.subscribe((error)=>{
                                    if (error) {
                                        console.error(error)
                                    }
                                })
                                // tempCharacteristic.notify(true,(error)=>{
                                //     if (error){
                                //         console.log('notify error')
                                //         console.error(error)
                                //     }                                       
                                // })
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
                                        //awsDevice.publish('temp_topic',JSON.stringify())
                                    }
                                    else {
                                        console.error('wierd empty buffer')
                                    }

                                    // if (error){
                                    //     console.error(error)
                                    // }
                                    // else {
                                    //     tempCharacteristic.read((error,data) => {
                                    //         if (error) {
                                    //             console.error(error)
                                    //         } 
                                    //         else {
                                    //             if (data) {
                                    //                 console.log(data.toString('utf8'))
                                    //             }
                                    //             else {
                                    //                 //console.log('Temp Characteristic empty')
                                    //             }
                                    //         }
                                    //     })
                                    // }
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
