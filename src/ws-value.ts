import {Client, Server} from 'rpc-websockets';
import {None, Optional} from 'optional-typescript';

export abstract class BasicValue<T> {
    protected value_: Optional<T> = None<T>();
    private listeners_ = new Array<(value: T) => void>()

    get value(): Optional<T> {
        return this.value_;
    }

    abstract setValue(v: T): void;

    getValue(): T {
        return this.value_.valueOr(null!);
    };

    onChange(cb: (value: T) => void) {
        this.listeners_.push(cb);
    }

    protected propagateValue() {
        const v = this.getValue();
        this.listeners_.forEach(listener => listener(v));
    }
}

export class ServerValue<T> extends BasicValue<T> {
    constructor(private server: Server, private name: string) {
        super();
        server.event(name);
        server.register('get-' + name, () => {
            console.log(`ServerValue get-${name}()`);
            return this.value_.valueOr(null!);
        })
        server.register('set-' + name, (params) => {
            console.log(`ServerValue set-${name}('${params.value}')`);
            this.setValue(params.value);
            this.propagateValue();
        })
    }

    setValue(v: T): void {
        console.log(`ServerValue setValue('${this.name}', '${v}')`);
        this.value_ = new Optional<T>(v);
        // notify clients
        this.server.emit(this.name, v);
    }
}

export class ClientValue<T> extends BasicValue<T> {
    constructor(private client: Client, private name: string) {
        super();
        client.subscribe(name);
        client.on(name, value => {
            console.log(`ClientValue on-${name}('${value}')`);
            this.value_ = new Optional(value);
            this.propagateValue();
        });
        client.call('get-' + this.name).then(value => {
            console.log(`ClientValue get-${this.name}('${value}')`);
            this.value_ = new Optional<T>(<T>value);
        });
    }

    setValue(value: T): void {
        console.log(`ClientValue set-${this.name}('${value}')`);
        this.client.call('set-' + this.name, {value});
    }
}
