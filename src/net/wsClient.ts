
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private onStateChange: (state: any) => void;
    private onError: (msg: string) => void;
    private onRoomJoined: (roomId: string, playerId: number) => void;

    constructor(
        onStateChange: (state: any) => void,
        onError: (msg: string) => void,
        onRoomJoined: (roomId: string, playerId: number) => void
    ) {
        this.onStateChange = onStateChange;
        this.onError = onError;
        this.onRoomJoined = onRoomJoined;
    }

    connect(url: string) {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('Connected to Game Server');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'SYNC_STATE':
                        this.onStateChange(data.payload);
                        break;
                    case 'ROOM_CREATED':
                    case 'ROOM_JOINED':
                        this.onRoomJoined(data.payload.roomId, data.payload.playerId);
                        if (data.payload.state) this.onStateChange(data.payload.state);
                        break;
                    case 'ERROR':
                        this.onError(data.payload.message);
                        break;
                }
            } catch (e) {
                console.error('WS Parse Error', e);
            }
        };

        this.ws.onclose = () => {
            this.onError('Desconectado del servidor');
        };
    }

    createRoom(playerName: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'CREATE_ROOM',
                payload: { playerName }
            }));
        }
    }

    joinRoom(roomId: string, playerName: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'JOIN_ROOM',
                payload: { roomId, playerName }
            }));
        }
    }

    sendGameAction(actionType: string, payload?: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'GAME_ACTION',
                payload: { actionType, payload }
            }));
        }
    }
}
