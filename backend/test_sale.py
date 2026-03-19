import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as c:
        r = await c.get(
            'http://localhost:8001/menu/items?page=1&limit=20&is_sale=true',
            headers={"Cache-Control": "no-cache"}
        )
        d = r.json()
        for i in d.get('items', []):
            print(
                f"name={i.get('name')} "
                f"is_sale={i.get('is_sale')} "
                f"discount={i.get('discount_percent')} "
                f"discounted_price={i.get('discounted_price')} "
                f"sale_start={i.get('sale_start')} "
                f"sale_end={i.get('sale_end')}"
            )

asyncio.run(test())