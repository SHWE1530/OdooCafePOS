import asyncio
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

def broadcast_sync(message: dict):
    """
    Synchronously triggers a WebSocket broadcast task in the active event loop.
    Safe to call from standard synchronous routes.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(manager.broadcast(message))
        else:
            asyncio.run(manager.broadcast(message))
    except Exception as e:
        print(f"WS Broadcast error: {e}")
