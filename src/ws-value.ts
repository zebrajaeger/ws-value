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
import {None, Optional} from 'optional-typescript';

export abstract class BasicValue<T> {
    private value: Optional<T> = None<T>();
    private changeListeners = new Array<(value: T) => void>()
    private initListeners = new Array<(value: T) => void>()
    private isInitialized = false;

    /**
     * set value to undefined
     */
    resetValue() {
        this.setValue(undefined);
    }

    /**
     * Set new Value see ClientValue and ServerValue
     * @param v the new Value
     */
    abstract setValue(v: T): void;

    /**
     * Set local value to value and notify the init listeners (but NOT the change listeners!).
     * @param v the new Value
     */
    protected setLocalValue(v: T) {
        this.value = new Optional<T>(v);
        if (!this.isInitialized && this.value.hasValue) {
            this.isInitialized = true;
            this.propagateInit();
        }
    }

    /**
     * get local stored value
     */
    getValue(): T {
        return this.value.valueOr(null!);
    };

    /**
     * get local stored value or - if unset - the provided value
     */
    getValueOr(v: T): T {
        return this.value.valueOr(v);
    };

    /**
     * called if values has been changed
     * @param cb
     */
    onChange(cb: (value: T) => void) {
        this.changeListeners.push(cb);
    }

    /**
     * Called once.
     * If not initialized the callback function will called when initialized.
     * If already initialized, the callback function is called immediately.
     * @param cb
     */
    onInit(cb: (value: T) => void) {
        if (this.isInitialized) {
            cb(this.getValue());
        } else {
            this.initListeners.push(cb);
        }
    }

    /**
     * send notification to all change listeners.
     */
    protected propagateChange() {
        const v = this.getValue();
        this.changeListeners.forEach(listener => listener(v));
    }

    /**
     * send notification to all init listeners.
     */
    protected propagateInit() {
        const v = this.getValue();
        this.initListeners.forEach(listener => listener(v));
    }
}

/**
 * The Value proxy for server-side use. This is the master of the data model.
 * Clients sending value-change-requests to this ServerValue. After value change of the server-value, the change is propagated up to all clients.
 * The setValue function changes the local value (server side) directly and propagate it to all clients.
 */
export class ServerValue<T> extends BasicValue<T> {

    constructor(private server: Server,
                private name: string,
                public isEqual: (o1: T, o2: T) => boolean = (o1, o2) => o1 === o2) {
        super();
        server.event(name);
        server.register('get-' + name, () => {
            return this.getValue();
        })
        server.register('set-' + name, (params) => {
            this.setValue(params.value);
        })
    }

    setValue(v: T): void {
        // trigger change process if value has been changed. This prevents sending the same value multible times
        if (!this.isEqual(this.getValue(), v)) {
            this.setLocalValue(v);
            this.propagateChange();
            this.server.emit(this.name, v);
        }
    }
}

/**
 * The Value proxy for client-side use. This is the slave of the data model.
 * The setValue function does not set the local value, it only makes a call to server to change the value.
 * If the server changes its value to the new one, the server propagates it back - up to this client value.
 */
export class ClientValue<T> extends BasicValue<T> {
    constructor(private client: Client, private name: string) {
        super();
        client.subscribe(name);
        client.on(name, value => {
            this.setLocalValue(<T>value);
            this.propagateChange();
        });
        client.call('get-' + this.name).then(value => {
            this.setLocalValue(<T>value);
            this.propagateChange();
        });
    }

    setValue(value: T): void {
        this.client.call('set-' + this.name, {value});
    }
}
