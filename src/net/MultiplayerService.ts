import Peer, { DataConnection } from 'peerjs';
import { NetworkMessage, RoomId } from './protocol';

type MessageCallback = (msg: NetworkMessage) => void;
type ConnectionCallback = (peerId: string) => void;

class MultiplayerService {
    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();
    private roomId: string | null = null;
    private onMessage: MessageCallback | null = null;
    private onPeerJoin: ConnectionCallback | null = null;
    public myPeerId: string = '';
    public isHost: boolean = false;

    constructor() { }

    async initialize(): Promise<string> {
        if (this.peer) return this.myPeerId;

        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.peer = new Peer(id); // Use random ID or let server assign

            this.peer.on('open', (id) => {
                console.log('My Peer ID:', id);
                this.myPeerId = id;
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS Error:', err);
                reject(err);
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });
        });
    }

    // Host creates a room (essentially just listening)
    createRoom(): RoomId {
        this.isHost = true;
        this.roomId = this.myPeerId; // RoomID is Host PeerID
        return this.roomId;
    }

    // Client joins a room
    connectToRoom(roomId: RoomId) {
        this.isHost = false;
        this.roomId = roomId;
        if (!this.peer) throw new Error("Peer not initialized");

        const conn = this.peer.connect(roomId);
        this.handleConnection(conn);
    }

    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log(`Connected to: ${conn.peer}`);
            this.connections.set(conn.peer, conn);
            if (this.onPeerJoin) this.onPeerJoin(conn.peer);

            // Send initial hello if needed?
        });

        conn.on('data', (data) => {
            if (this.onMessage) {
                this.onMessage(data as NetworkMessage);
            }
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            console.log(`Connection closed: ${conn.peer}`);
        });

        conn.on('error', (err) => {
            console.error(`Conn error: ${err}`);
        });
    }

    broadcast(msg: NetworkMessage) {
        this.connections.forEach(conn => {
            if (conn.open) conn.send(msg);
        });
    }

    sendToHost(msg: NetworkMessage) {
        if (this.isHost) return; // Should not happen
        if (this.roomId) {
            const conn = this.connections.get(this.roomId);
            if (conn && conn.open) {
                conn.send(msg);
            }
        }
    }

    setMessageHandler(cb: MessageCallback) {
        this.onMessage = cb;
    }

    setJoinHandler(cb: ConnectionCallback) {
        this.onPeerJoin = cb;
    }
}

export const multiplayerService = new MultiplayerService();
