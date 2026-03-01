type MessageHandler = (data: any) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectInterval: number = 3000;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private messageHandlers: MessageHandler[] = [];
    private isIntentionallyClosed: boolean = false;

    constructor(url?: string) {
        this.url = url || import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        this.isIntentionallyClosed = false;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📨 WebSocket message:', data);

                    // Notify all registered handlers
                    this.messageHandlers.forEach(handler => handler(data));
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');

                // Auto-reconnect if not intentionally closed
                if (!this.isIntentionallyClosed) {
                    console.log(`Reconnecting in ${this.reconnectInterval}ms...`);
                    this.reconnectTimer = setTimeout(() => {
                        this.connect();
                    }, this.reconnectInterval);
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
        }
    }

    disconnect() {
        this.isIntentionallyClosed = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    onMessage(handler: MessageHandler) {
        this.messageHandlers.push(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
        };
    }

    send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected. Message not sent:', data);
        }
    }
}

// Create singleton instance
const wsService = new WebSocketService();

export default wsService;
