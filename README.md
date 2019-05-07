# Cloud BBQ
A Bluetooth to MQTT bridge for the [Tenergy Solis Digital Meat Thermometer](https://www.amazon.com/Tenergy-Thermometer-Controlled-Bluetooth-Stainless/dp/B077821Z4C).

This code should run on MacOS or Linux.   Ideally you could run this on a Raspberry Pi to act as a small dedicated bridge device.

This code will also likely work with other similar Bluetooth probes that show up with the bluetooth device name "iBBQ", but may require a different pairing key.  See `autoPairKey` in `constHelper.js`.

## Using Cloud BBQ
* After cloning, run `npm install` or `yarn install`
* Edit `/config/default.json` or create a new file `/config/development.json` with your MQTT information.
Tested with [Adafruit IO](https://io.adafruit.com)
* Start with `npm start` or `yarn start`.  You may need to use `sudo` depending on your OS.

### MacOS
Xcode is required for Noble's node-gyp compilation.

### Linux setup
See the [Noble Linux setup](https://github.com/noble/noble).

## Known Issues
Cloud BBQ depends on the noble library for Bluetooth LE which in turn depends on node-xpc-connection which currently doesn't work in NodeJS 10.  Cloud BBQ makes use of a PR branch of node-xpc-connection to add NodeJS 10 support, but this branch still only seems to work on MacOS.  For linux, using NodeJS 8 appears to be the only solution for now.

## Using with Adafruit IO
To setup to work with Adafruit IO, create a group, and then add 6 topics, then edit your default.json to look something like this:

```json
{
    "mqtt": {
        "username" : "USERNAME",
        "key":"KEY",
        "protocol":"mqtts",
        "url":"io.adafruit.com:8883",
        "topics":[
            "USERNAME/feeds/ibbq1",
            "USERNAME/feeds/ibbq2",
            "USERNAME/feeds/ibbq3",
            "USERNAME/feeds/ibbq4",
            "USERNAME/feeds/ibbq5",
            "USERNAME/feeds/ibbq6"
        ],
        "probeMessagePerPublish":12
    }
}
```

Note that Adafruit IO will only accept 30 messages per minute, and each message can only have 1 data point, so you need to dial down `probeMessagePerPublish` to keep under that limit.  The Solis sends one update per second, so you can set this to 2 if you have only one probe connected, or leave it at 12 if you have all 6 probes connected. 

### Other MQTT Options
Cloud BBQ should be generally compatible with other MQTT services, however some like AWS IoT may require an additional library to make authentication easier.  Starting with Adafruit is recommended since it's both easy and has out of the box support for live updating graphs of temperature.

## Optional: Using with Google Home and Google Assistant for Notifications
Cloud BBQ can be configured to send a notification to Google Home devices using the Google Assistant's Broadcast functionality.  Unfortunately the setup is a bit convoluted, especially if you're not already comfortable with GCP.

### Configuration
1. Follow the instructions here [Configure Google Assistant API](https://developers.google.com/assistant/sdk/guides/service/python/embed/config-dev-project-and-account) (This should be free, but still require setting up a Google Cloud Platform account I already had an account so I'm not sure)
2. Create a "OAuth client ID" on the [Credentials](https://console.developers.google.com/apis/credentials) screen.  Make sure you have your newly created project selected.  Select the type of "Other".
3. Click the Download icon next to your new client ID and save the file into the `/config` folder of Cloud BBQ.
4. Update `default.json` with the name of your downloaded file, and set `enabled` to `true`.

### Usage
1. Set targets for any probe by starting Cloud BBQ with `node app.js --probe1 150 --probe3 175`  (`npm` doesn't seem to pass the arguments right)
2. The first time it starts, your browser will launch asking you to grant permission to connect your instance of Cloud BBQ to your Google Account.  THis should be the account that your Google Home devices are associated to if you used a different account Google Cloud Platform.
3. You will be given a code to copy from your browser and past into your terminal.
4. Subsequent launches should not require steps 2-3.  When a probe crosses the set threshold, you should get a broadcast on every Google Home device in your house.
5. Probes will only broadcast once each, even if they later fall below the set threshold.  Restarting Cloud BBQ will reset this.