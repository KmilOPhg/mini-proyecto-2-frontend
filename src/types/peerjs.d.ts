declare module 'peerjs' {
  import type { EventEmitter } from 'eventemitter3';

  export interface CallOption {
    metadata?: Record<string, unknown>;
  }

  export interface PeerJSOption {
    host?: string;
    port?: number;
    path?: string;
    secure?: boolean;
    key?: string;
    config?: RTCConfiguration;
  }

  export class MediaConnection {
    readonly peer: string;
    readonly metadata?: Record<string, unknown>;
    readonly peerConnection: RTCPeerConnection | null;
    answer(stream?: MediaStream): void;
    close(): void;
    on(event: 'stream', callback: (stream: MediaStream) => void): this;
    on(event: 'close', callback: () => void): this;
  }

  export class Peer extends EventEmitter {
    constructor(options?: PeerJSOption);
    constructor(id?: string, options?: PeerJSOption);
    call(peer: string, stream: MediaStream, options?: CallOption): MediaConnection;
    destroy(): void;
    on(event: 'open', callback: (id: string) => void): this;
    on(event: 'error', callback: (err: Error) => void): this;
    on(event: 'call', callback: (call: MediaConnection) => void): this;
  }

  export default Peer;
}
