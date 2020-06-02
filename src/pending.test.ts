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

const LOG = log4js.getLogger('pending.test');
LOG.level = "debug";

const getPort = require('get-port');

let server: Server;
let client: Client;

let serverValue: ServerValue<number>;
let clientValue: ClientValue<number>;

function startupClient(port: number) {
    return new Promise(async (resolve) => {

        // init client part
        client = new Client('ws://localhost:' + port, {
            max_reconnects: 0
        });
        // dont wait for client connection (no server = no connection)
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

function startupServer(port: number) {
    return new Promise(async (resolve) => {

        // init server part
        server = new Server({port, host: '127.0.0.1'});
        serverValue = new ServerValue<number>(server, 'foo');
        serverValue.onInit(v => {
            LOG.debug(`ServerValue EVENT: initial value is '${v}'`);
        });
        serverValue.onChange(v => {
            LOG.debug(`ServerValue CHANGE: new value is '${v}'`);
        });

        resolve();
    });
}

function shutdownClient() {
    return new Promise(async (resolve) => {
        await client.close();
        resolve();
    });
}

function shutdownServer() {
    return new Promise(async (resolve) => {
        await server.close();
        resolve();
    });
}

function delay(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

function setClientValue(value){
    LOG.warn(`setValue(${value})`);
    clientValue.setValue(value);
}

(async () => {
    let port = await getPort()
    LOG.warn('start client');
    await startupClient(port);
    setClientValue(999);

    LOG.debug('999 should be overwritten by 666 and never reach anything');

    setClientValue(666);
    LOG.warn('start server');
    await startupServer(port);

    LOG.debug('we should see 666 within next 2000ms');
    await delay(2000);

    setClientValue(555);
    LOG.debug('we should see 555 within next 500ms');
    await delay(500);

    LOG.warn('kill server');
    await shutdownServer();
    await delay(500);

    setClientValue(444);
    LOG.debug('444 should not be visible and stored until server is up again.');
    await delay(500);

    LOG.warn('start server');
    await startupServer(port);
    LOG.debug('we should see 444 within next 3000ms');
    await delay(3000);

    LOG.warn('kill client');
    await shutdownClient();
    LOG.warn('kill server');
    await shutdownServer();

    LOG.info('done.');
})();
