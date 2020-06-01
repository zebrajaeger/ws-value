# ws-value

Distribute values via websocket

![Overview](./doc/overview.png | width=100px)

## Example in TS

### MyInterface
 
Common stuff for Client and server 

```typescript
// complex objects (may have sub-objects)
export interface Status {
  foo: number;
  bar: string;
}
```

### Client

```typescript
import {Status} from 'MyInterface';
import {Client} from 'rpc-websockets';
import {ClientValue} from '@zebrajaeger/ws-value';

// We create a service class because we use angular but this is not required 
export class MyService {
  private readonly client: Client;
    
  // simple value
  public counter: ClientValue<number>;
  
  // complex value
  public status: ClientValue<Status>;

  constructor() {
    this.client = new Client('ws://192.168.178.68:8081');
    this.client.on('open', () => {
  
      // register value with name 'counter' and type 'number'
      this.counter = new ClientValue<number>(this.client, 'counter');

      // register value with name 'status' and type 'Status'
      this.status = new ClientValue<Status>(this.client, 'status');
    });
  }
   
  setDefaultStatus() {
    this.status.setValue({ foo: 1, bar: 'narf' });
  } 

  setIncCounter() {
    const v = this.counter.getValue() || 0;
    this.counter.setValue(v + 1);
  }
}
```

### Server

```typescript
import {Status} from 'MyInterface';
import {Server} from 'rpc-websockets';
import {ServerValue} from '@zebrajaeger/ws-value';

// bind server to all interfaces and port 8081
const server = new Server({port: 8081, host: '0.0.0.0'});

// register server value of type 'Status' with name 'status'
let status = new ServerValue<Status>(server, 'status');

// set initial value
status.setValue({foo: 666, bar: 'hello'});
```




