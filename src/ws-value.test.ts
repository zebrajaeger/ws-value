import {Client, Server} from 'rpc-websockets';
import {ClientValue, ServerValue} from './ws-value';
import * as log4js from 'log4js';

const LOG = log4js.getLogger('ws-value.test');
LOG.level = "debug";

const getPort = require('get-port');

let server: Server;
let client: Client;

let serverValue: ServerValue<number>;
let clientValue: ClientValue<number>;

function initClient(port: number): Promise<Client> {
    return new Promise(resolve => {
        const c = new Client('ws://localhost:' + port);
        c.on('open', () => {
            resolve(c);
        });
    });
}

function startup() {
    return new Promise(async (resolve) => {
        let port = await getPort()

        server = new Server({port, host: '127.0.0.1'});
        serverValue = new ServerValue<number>(server, 'foo');
        serverValue.onInit(v => {
            LOG.debug(`ServerValue EVENT: initial value is '${v}'`);
        });
        serverValue.onChange(v => {
            LOG.debug(`ServerValue CHANGE: new value is '${v}'`);
        });

        client = await initClient(port);
        clientValue = new ClientValue<number>(client, 'foo');
        clientValue.onInit(v => {
            LOG.debug(`ClientValue EVENT: initial value is '${v}'`);
        });
        clientValue.onChange(v => {
            LOG.debug(`ClientValue CHANGE: new value is '${v}'`);
        });

        resolve();
    });
}

function shutdown() {
    return new Promise(async (resolve) => {
        await server.close();
        await client.close();
        resolve();
    });
}

function delay(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

async function testInitialValue() {
    LOG.info(`Initial value`);
    await delay(500);
    const cv = clientValue.getValue();
    const sv = serverValue.getValue();
    LOG.debug(`Server value is '${sv}' -> ${!sv ? 'ok' : 'fail'}`);
    LOG.debug(`Client value is '${cv}' -> ${!cv ? 'ok' : 'fail'}`);
}

async function testSetServerValue(sv: any) {
    LOG.info(`Set server value to '${sv}'`);
    serverValue.setValue(sv);
    await delay(500);
    const cv = clientValue.getValue();
    LOG.debug(`Client value is '${cv}' -> ${sv === cv ? 'ok' : 'fail'}`);
}

async function testResetServerValue() {
    LOG.info(`Reset server value`);
    serverValue.resetValue();
    await delay(500);
    const cv = clientValue.getValue();
    LOG.debug(`Client value is '${cv}' -> ${!cv ? 'ok' : 'fail'}`);
}

async function testSetClientValue(cv: any) {
    LOG.info(`Set client value to '${cv}'`);
    clientValue.setValue(cv);
    await delay(500);
    const sv = serverValue.getValue();
    LOG.debug(`Server value is '${sv}' -> ${sv === cv ? 'ok' : 'fail'}`);
}

async function testResetClientValue() {
    LOG.info(`Reset client value`);
    clientValue.resetValue();
    await delay(500);
    const sv = serverValue.getValue();
    LOG.debug(`Client value is '${sv}' -> ${!sv ? 'ok' : 'fail'}`);
}


// test("FizzBuzz test",
(async () => {
    await startup();
    await testInitialValue();
    await testSetServerValue(666);
    await testSetServerValue(123);
    await testResetServerValue();
    await testSetClientValue(777);
    await testSetClientValue(888);
    await testResetClientValue();
    await shutdown();
})();
