from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from websocket.manager import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/chef")
async def chef_ws(websocket: WebSocket):
    await manager.connect_chef(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_chef(websocket)


@router.websocket("/ws/waiter/{user_id}")
async def waiter_ws(websocket: WebSocket, user_id: int):
    """Ofitsiant user_id bilan ulanadi."""
    await manager.connect_waiter(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_waiter(websocket, user_id)


@router.websocket("/ws/order/{order_id}")
async def order_ws(websocket: WebSocket, order_id: int):
    await manager.connect_order(websocket, order_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_order(websocket, order_id)