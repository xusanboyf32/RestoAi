import os
import json
import re
from groq import Groq
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ai.rag import search_menu, get_all_menu_from_db_sync
from menu.models import MenuItem
from core.logger import setup_logger

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
logger = setup_logger("ai")

_conversation_history: dict[str, list] = {}

SYSTEM_PROMPT = """Sen RestoAI restoranining aqlli AI yordamchisisan. Sening ismingni so'rashsa "RestoAI" deysan.

ASOSIY VAZIFANG:
1. Mijozga real bazadagi taomlardan mos komplekt tavsiya qilish
2. Summa aytsa — o'sha summaga mos taomlar tanlash (xizmat haqi 10% ni hisobga ol)
3. Kasallik aytsa — sog'liq uchun xavfsiz taomlar tavsiya qilish
4. Qiziqishlari bo'yicha filter qilish
5. "Yana tavsiya qil" desa — boshqa variant berish
6. Mijoz yoqtirgan taomlar bo'lsa — o'sha taomlar yoki ularga o'xshash taomlar tavsiya qil

MUHIM QOIDALAR:
- Faqat o'zbek tilida javob ber
- Faqat BAZADA MAVJUD taomlardan tavsiya qil — ID si bor taomlar
- Narxlarni aniq yoz (so'm bilan)
- Summa bo'yicha tavsiya qilganda JAMI narxni hisoblangan holda ko'rsat
- Xizmat haqi 10% — buni ham aytib o't
- Qisqa, aniq, do'stona bo'l
- Tavsiyada 2-4 ta taom yetarli

JAVOB FORMATI — oxirida ALBATTA JSON:
RECOMMENDED_JSON:
[{"menu_item_id": 1, "name": "Taom nomi", "price": 25000}]

Agar menyu yoki restoran bilan bog'liq bo'lmasa — "Kechirasiz, men faqat menyu haqida yordam bera olaman" de."""


def _get_session_history(session_id: str) -> list:
    if session_id not in _conversation_history:
        _conversation_history[session_id] = []
    return _conversation_history[session_id]


def _add_to_history(session_id: str, role: str, content: str):
    history = _get_session_history(session_id)
    history.append({"role": role, "content": content})
    if len(history) > 10:
        _conversation_history[session_id] = history[-10:]


def _parse_budget(message: str) -> int | None:
    msg = message.replace(' ', '').lower()
    k_match = re.search(r'(\d+)k', msg)
    if k_match:
        return int(k_match.group(1)) * 1000
    num_match = re.search(r'\d{4,7}', msg)
    if num_match:
        return int(num_match.group())
    return None


def _filter_by_health(items: list, message: str) -> list:
    msg      = message.lower()
    filtered = items

    if any(w in msg for w in ['diabet', 'qand kasali']):
        filtered = [i for i in filtered if i.get('is_diabetes_safe')]
    if any(w in msg for w in ['yurak', 'qon bosim', 'bosim']):
        filtered = [i for i in filtered if i.get('is_heart_safe') or i.get('is_pressure_safe')]
    if any(w in msg for w in ["me'da", 'oshqozon', 'gastrit']):
        filtered = [i for i in filtered if i.get('is_stomach_safe')]
    if any(w in msg for w in ['gluten', "bug'doy"]):
        filtered = [i for i in filtered if i.get('is_gluten_free')]

    return filtered if filtered else items


def _filter_by_preference(items: list, message: str) -> list:
    msg      = message.lower()
    filtered = list(items)

    if any(w in msg for w in ["yog'li", "yog'"]):
        f = [i for i in filtered if i.get('is_fatty')]
        if f: filtered = f
    if any(w in msg for w in ['vegetarian', "go'shtsiz"]):
        f = [i for i in filtered if i.get('is_vegetarian')]
        if f: filtered = f
    if any(w in msg for w in ['shirin', 'desert', 'shirinlik']):
        f = [i for i in filtered if i.get('food_type') == 'dessert' or i.get('is_sweet')]
        if f: filtered = f
    if any(w in msg for w in ['ichimlik', 'choy', 'qahva', 'sharbat', 'juice']):
        f = [i for i in filtered if i.get('food_type') == 'drink']
        if f: filtered = f
    if any(w in msg for w in ["sho'rva", 'shorva', 'mastava', 'shurpa']):
        f = [i for i in filtered if i.get('food_type') == 'soup']
        if f: filtered = f
    if any(w in msg for w in ['achchiq', 'qizil', 'ziravorli']):
        f = [i for i in filtered if i.get('is_spicy')]
        if f: filtered = f

    return filtered if filtered else items


def _build_budget_combo(items: list, budget: int, prev_combo: list = None) -> list:
    real_budget = int(budget / 1.10)
    prev_ids    = set(i.get('menu_item_id') or i.get('id') for i in (prev_combo or []))

    main_items  = [i for i in items if i.get('food_type') in ('main', 'soup', 'salad')]
    extra_items = [i for i in items if i.get('food_type') in ('drink', 'bread', 'side', 'dessert', 'snack', 'sauce')]
    other_items = [i for i in items if not i.get('food_type') or i.get('food_type') == '']

    main_items.sort(key=lambda x: x['price'])
    extra_items.sort(key=lambda x: x['price'])

    combo    = []
    total    = 0
    used_ids = set()

    # Asosiy taom — oldingilardan farqli
    candidates = main_items if main_items else (other_items + main_items)
    for item in candidates:
        if item['price'] <= real_budget and item['id'] not in used_ids:
            if item['id'] not in prev_ids or not prev_ids:
                combo.append(item)
                total    += item['price']
                used_ids.add(item['id'])
                break

    # Agar topilmasa — oldingilardan ham bo'lsa oladi
    if not combo:
        for item in candidates:
            if item['price'] <= real_budget and item['id'] not in used_ids:
                combo.append(item)
                total    += item['price']
                used_ids.add(item['id'])
                break

    # Qo'shimcha taomlar
    remaining = real_budget - total
    for item in extra_items:
        if item['price'] <= remaining and item['id'] not in used_ids:
            combo.append(item)
            total     += item['price']
            remaining -= item['price']
            used_ids.add(item['id'])
            if len(combo) >= 4:
                break

    return combo


async def chat(
    message:      str,
    db:           AsyncSession,
    session_id:   str  = "default",
    favorite_ids: list = None,
) -> dict:
    logger.info(f"🤖 AI so'rov [{session_id[:8]}]: {message[:60]}")

    try:
        # Real bazadan barcha mavjud taomlar
        result   = await db.execute(
            select(MenuItem).where(
                MenuItem.is_active   == True,
                MenuItem.availability != 'unavailable'
            )
        )
        db_items  = result.scalars().all()
        all_items = get_all_menu_from_db_sync(db_items)

        # Yoqtirgan taomlar konteksti
        fav_context = ""
        if favorite_ids:
            fav_items = [i for i in all_items if i['id'] in favorite_ids]
            if fav_items:
                fav_names   = [i['name'] for i in fav_items]
                fav_context = (
                    f"\nMIJOZ YOQTIRGAN TAOMLAR: {', '.join(fav_names)}\n"
                    f"Shu taomlar va ularga o'xshash taomlardan tavsiya ber.\n"
                )

        # RAG kontekst
        rag_results = search_menu(message, k=8)
        rag_context = "\n".join([doc.page_content for doc in rag_results])

        # Budget
        budget = _parse_budget(message)

        # Filter
        filtered_items = _filter_by_health(all_items, message)
        filtered_items = _filter_by_preference(filtered_items, message)

        # Oldingi tavsiya
        history    = _get_session_history(session_id)
        prev_combo = []
        for h in reversed(history):
            if h['role'] == 'assistant' and 'RECOMMENDED_JSON:' in h['content']:
                try:
                    raw        = h['content'].split('RECOMMENDED_JSON:')[1].strip()
                    raw        = re.sub(r'```json|```', '', raw).strip()
                    prev_combo = json.loads(raw)
                except Exception:
                    pass
                break

        # Budget combo
        budget_combo = []
        budget_text  = ""
        if budget:
            budget_combo = _build_budget_combo(filtered_items, budget, prev_combo)
            if budget_combo:
                total_food  = sum(i['price'] for i in budget_combo)
                service_fee = round(total_food * 0.10)
                total_all   = total_food + service_fee
                budget_text = f"\n\nBUDGET TAHLILI: {budget:,} so'm uchun tanlangan komplekt:\n"
                for item in budget_combo:
                    budget_text += f"- {item['name']}: {item['price']:,.0f} so'm\n"
                budget_text += (
                    f"Taomlar narxi: {total_food:,.0f} so'm\n"
                    f"Xizmat haqi (10%): {service_fee:,.0f} so'm\n"
                    f"JAMI: {total_all:,.0f} so'm\n"
                    f"({'✅ Mos' if total_all <= budget else '⚠️ Ozgina oshadi'})"
                )

        # Mavjud taomlar ro'yxati AI ga
        available_text = "BAZADAGI MAVJUD TAOMLAR (faqat shu taomlardan tavsiya qil):\n"
        for item in filtered_items[:25]:
            available_text += f"- ID:{item['id']} {item['name']} — {item['price']:,.0f} so'm"
            props = []
            if item.get('food_type'):     props.append(item['food_type'])
            if item.get('is_fatty'):      props.append("yog'li")
            if item.get('is_sweet'):      props.append('shirin')
            if item.get('is_salty'):      props.append("sho'r")
            if item.get('is_vegetarian'): props.append('vegetarian')
            if item.get('is_spicy'):      props.append('achchiq')
            if props: available_text += f" [{', '.join(props)}]"
            # Kasallik xavfsizligi
            health = []
            if item.get('is_diabetes_safe'): health.append('diabet')
            if item.get('is_heart_safe'):    health.append('yurak')
            if item.get('is_stomach_safe'):  health.append("me'da")
            if health: available_text += f" (xavfsiz: {', '.join(health)})"
            available_text += "\n"

        user_content = (
            f"{available_text}\n"
            f"{fav_context}"
            f"RAG kontekst:\n{rag_context}\n"
            f"{budget_text}\n"
            f"Mijoz so'rovi: {message}"
        )

        # So'rov
        messages_to_send = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages_to_send += history[-6:]
        messages_to_send.append({"role": "user", "content": user_content})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_to_send,
            temperature=0.7,
            max_tokens=1200,
        )

        ai_text = response.choices[0].message.content

        # JSON parsing
        recommended_items = _parse_recommendations(ai_text)

        # Agar AI JSON bermasa — budget combo dan
        if not recommended_items and budget_combo:
            recommended_items = [
                {"menu_item_id": i["id"], "name": i["name"], "price": i["price"]}
                for i in budget_combo
            ]
            ai_text += f"\n\nRECOMMENDED_JSON:\n{json.dumps(recommended_items, ensure_ascii=False)}"

        # Tarixga saqlash
        _add_to_history(session_id, "user",      message)
        _add_to_history(session_id, "assistant", ai_text)

        logger.info(f"✅ AI javob | tavsiyalar: {len(recommended_items)} ta | budget: {budget}")

        return {
            "message":           _clean_response(ai_text),
            "recommended_items": recommended_items,
        }

    except Exception as e:
        logger.error(f"❌ AI xato: {e}")
        raise


def _parse_recommendations(response: str) -> list:
    try:
        if "RECOMMENDED_JSON:" in response:
            json_part = response.split("RECOMMENDED_JSON:")[1].strip()
            json_part = re.sub(r'```json|```', '', json_part).strip()
            # Faqat birinchi JSON array ni ol
            match = re.search(r'\[.*?\]', json_part, re.DOTALL)
            if match:
                return json.loads(match.group())
    except Exception:
        pass
    return []


def _clean_response(response: str) -> str:
    if "RECOMMENDED_JSON:" in response:
        return response.split("RECOMMENDED_JSON:")[0].strip()
    return response