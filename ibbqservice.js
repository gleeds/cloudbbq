class iBBQService {

    constructor(peripheral) {
        this.peripheral = peripheral
    }

    async start() {
        await this.connect()

    }

    async connect() {
        try {
            await this.peripheral.connect()
        }
        catch(error) {
            console.error(error)
        }
        console.log('connected')
    }

}

module.exports = iBBQService
