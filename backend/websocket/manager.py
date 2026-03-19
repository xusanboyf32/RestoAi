from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        self.chef_connections: List[WebSocket] = []
        # ofitsiant user_id → websocket lar
        self.waiter_connections: Dict[int, List[WebSocket]] = {}
        self.order_connections: Dict[int, List[WebSocket]] = {}

    # ─── ULASH ───────────────────────────────────────────

    async def connect_chef(self, websocket: WebSocket):
        await websocket.accept()
        self.chef_connections.append(websocket)

    async def connect_waiter(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.waiter_connections:
            self.waiter_connections[user_id] = []
        self.waiter_connections[user_id].append(websocket)

    async def connect_order(self, websocket: WebSocket, order_id: int):
        await websocket.accept()
        if order_id not in self.order_connections:
            self.order_connections[order_id] = []
        self.order_connections[order_id].append(websocket)

    # ─── UZISH ───────────────────────────────────────────

    def disconnect_chef(self, websocket: WebSocket):
        if websocket in self.chef_connections:
            self.chef_connections.remove(websocket)

    def disconnect_waiter(self, websocket: WebSocket, user_id: int):
        if user_id in self.waiter_connections:
            if websocket in self.waiter_connections[user_id]:
                self.waiter_connections[user_id].remove(websocket)

    def disconnect_order(self, websocket: WebSocket, order_id: int):
        if order_id in self.order_connections:
            if websocket in self.order_connections[order_id]:
                self.order_connections[order_id].remove(websocket)

    # ─── XABAR YUBORISH ──────────────────────────────────

    async def notify_chef(self, message: dict):
        for ws in self.chef_connections:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def notify_waiter_by_table(self, table_number: int, message: dict, waiters: list):
        """
        Stol raqami bo'yicha tegishli ofitsiantni topib signal yuboradi.
        waiters — DB dan kelgan barcha ofitsiantlar ro'yxati (assigned_tables bilan).
        """
        for waiter in waiters:
            assigned = waiter.assigned_tables or []
            if table_number in assigned:
                user_id = waiter.id
                if user_id in self.waiter_connections:
                    for ws in self.waiter_connections[user_id]:
                        try:
                            await ws.send_json(message)
                        except Exception:
                            pass
                return

        # Hech qaysi ofitsiantga biriktirilmagan bo'lsa — hammaga yuboramiz
        await self.notify_all_waiters(message)

    async def notify_all_waiters(self, message: dict):
        for connections in self.waiter_connections.values():
            for ws in connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    async def notify_order(self, order_id: int, message: dict):
        if order_id in self.order_connections:
            for ws in self.order_connections[order_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()