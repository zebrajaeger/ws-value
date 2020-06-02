/*
 * ws-value
 * Copyright (C) 2020  Lars Brandt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Client, Server} from 'rpc-websockets';
import {ClientValue, ServerValue} from './ws-value';
import * as log4js from 'log4js';
import deepEqual = require('deep-equal');

const LOG = log4js.getLogger('deep-equal.test');
LOG.level = "debug";

const getPort = require('get-port');

let server: Server;
let client: Client;


interface MyComplexSubObject1 {
    foo: number;
}

interface MyComplexSubObject2 {
    bar: string;
    bars: string[];
}

interface MyComplexObject {
    o1: MyComplexSubObject1;
    o2: MyComplexSubObject2[];
}

let serverValue: ServerValue<MyComplexObject>;
let clientValue: ClientValue<MyComplexObject>;

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
        // !! Servervalue with custom isEqual function !!!
        serverValue = new ServerValue<MyComplexObject>(server, 'foo', deepEqual);
        serverValue.onInit(v => {
            LOG.debug(`ServerValue EVENT: initial value is '${v}'`);
        });
        serverValue.onChange(v => {
            LOG.debug(`ServerValue CHANGE: new value is '${v}'`);
        });

        client = await initClient(port);
        clientValue = new ClientValue<MyComplexObject>(client, 'foo');
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

function copyObject<T>(o: T): T {
    return JSON.parse(JSON.stringify(o));
}

async function testDeepEqual1() {
    LOG.info('#################### testDeepEqual1 ####################');
    clientValue.onInit(cv => {
        console.log(`CLIENT INITIAL NOTIFICATION`);
        //console.log(`Client value changed to ${cv}`);
    })
    clientValue.onChange(cv => {
        console.log(`CLIENT CHANGE NOTIFICATION`);
        //console.log(`Client value changed to ${cv}`);
    })

    const original: MyComplexObject = {
        o1: {
            foo: 1
        },
        o2: [{
            bar: 'a',
            bars: ['vvv', 'www', 'xxx']
        }, {
            bar: 'b',
            bars: ['w', 'e', 'r']
        }]
    }

    let copy1 = copyObject(original);
    LOG.info(`Set server value to '${copy1}'`);
    LOG.info(`Client must notify`);
    serverValue.setValue(copy1);
    await delay(500);

    LOG.info(`Set server value to same value`);
    LOG.info(`Client must NOT notify`);
    let copy2 = copyObject(original);
    serverValue.setValue(copy2);
    await delay(500);

    let copy3 = copyObject(original);
    copy3.o2[1].bars.push('s');
    LOG.info(`Set server value to '${copy3}'`);
    LOG.info(`Client must  notify`);
    serverValue.setValue(copy3);
    await delay(500);
}

(async () => {
    await startup();
    await testDeepEqual1();
    await shutdown();
})();
