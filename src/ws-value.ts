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

    resetValue(){
        this.setValue(undefined);
    }

    abstract setValue(v: T): void;

    protected setValueInternal(v: T) {
        this.value = new Optional<T>(v);
        if (!this.isInitialized && this.value.hasValue) {
            this.isInitialized = true;
            this.propagateInit();
        }
    }

    getValue(): T {
        return this.value.valueOr(null!);
    };

    getValueOr(v: T): T {
        return this.value.valueOr(v);
    };

    onChange(cb: (value: T) => void) {
        this.changeListeners.push(cb);
    }

    onInit(cb: (value: T) => void) {
        if (this.isInitialized) {
            cb(this.getValue());
        } else {
            this.initListeners.push(cb);
        }
    }

    protected propagateChange() {
        const v = this.getValue();
        this.changeListeners.forEach(listener => listener(v));
    }

    protected propagateInit() {
        const v = this.getValue();
        this.initListeners.forEach(listener => listener(v));
    }
}

export class ServerValue<T> extends BasicValue<T> {
    constructor(private server: Server, private name: string) {
        super();
        server.event(name);
        server.register('get-' + name, () => {
            return this.getValue();
        })
        server.register('set-' + name, (params) => {
            this.setValue(params.value);
            // this.propagateChange();
        })
    }

    setValue(v: T): void {
        this.setValueInternal(v);
        this.propagateChange();
        this.server.emit(this.name, v);
    }
}

export class ClientValue<T> extends BasicValue<T> {
    constructor(private client: Client, private name: string) {
        super();
        client.subscribe(name);
        client.on(name, value => {
            this.setValueInternal(<T>value);
            this.propagateChange();
        });
        client.call('get-' + this.name).then(value => {
            this.setValueInternal(<T>value);
        });
    }

    setValue(value: T): void {
        this.client.call('set-' + this.name, {value});
    }
}
