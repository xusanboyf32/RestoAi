# ai/rag.py
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import asyncio
import shutil
import os

from menu.models import MenuItem

CHROMA_DIR = "./ai/chroma_db"

_embeddings = None


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        print("Embedding modeli yuklanmoqda...")
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            cache_folder="D:/hf_cache"
        )
        print("Embedding modeli yuklandi!")
    return _embeddings


def _get_vectorstore():
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=_get_embeddings()
    )


async def index_menu(db: AsyncSession):
    result = await db.execute(select(MenuItem).where(MenuItem.is_active == True))
    items  = result.scalars().all()

    texts     = []
    metadatas = []

    for item in items:
        desc      = item.description if item.description else "mavjud emas"
        calories  = str(item.calories) if item.calories else "noma'lum"

        if item.is_sale and item.discount_percent:
            price_val = item.price - (item.price * item.discount_percent / 100)
        else:
            price_val = item.price

        props = []
        if item.is_fatty:      props.append("yog'li")
        if item.is_salty:      props.append("sho'r")
        if item.is_sweet:      props.append("shirin")
        if item.is_spicy:      props.append("achchiq")
        if item.is_vegetarian: props.append("vegetarian")
        if item.has_sugar:     props.append("shakarli")

        health = []
        if item.is_diabetes_safe: health.append("diabet uchun xavfsiz")
        if item.is_heart_safe:    health.append("yurak uchun xavfsiz")
        if item.is_stomach_safe:  health.append("meda uchun xavfsiz")
        if item.is_pressure_safe: health.append("bosim uchun xavfsiz")
        if item.is_gluten_free:   health.append("glutensiz")

        food_type   = item.food_type if item.food_type else "noma'lum"
        props_text  = ", ".join(props)  if props  else "yoq"
        health_text = ", ".join(health) if health else "belgilanmagan"

        if item.is_sale and item.discount_percent:
            aksiya_text = "ha, -" + str(item.discount_percent) + "%"
        else:
            aksiya_text = "yoq"

        text = (
            "Taom: " + item.name + "\n"
            "Turi: " + food_type + "\n"
            "Narx: " + str(int(price_val)) + " som\n"
            "Tavsif: " + desc + "\n"
            "Kaloriya: " + calories + "\n"
            "Xususiyatlar: " + props_text + "\n"
            "Soglik: " + health_text + "\n"
            "Aksiyada: " + aksiya_text + "\n"
        )

        texts.append(text)
        metadatas.append({
            "menu_item_id":   item.id,
            "name":           item.name,
            "price":          float(price_val),
            "food_type":      item.food_type if item.food_type else "",
            "is_fatty":       item.is_fatty      if item.is_fatty      else False,
            "is_sweet":       item.is_sweet      if item.is_sweet      else False,
            "is_vegetarian":  item.is_vegetarian if item.is_vegetarian else False,
            "has_sugar":      item.has_sugar     if item.has_sugar     else False,
            "is_diabetes_safe": item.is_diabetes_safe if item.is_diabetes_safe else False,
            "is_heart_safe":    item.is_heart_safe    if item.is_heart_safe    else False,
        })

    def _do_index():
        try:
            loader     = TextLoader("./ai/data/resto_info.txt", encoding="utf-8")
            docs       = loader.load()
            splitter   = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            resto_docs = splitter.split_documents(docs)
        except Exception:
            resto_docs = []

        if os.path.exists(CHROMA_DIR):
            shutil.rmtree(CHROMA_DIR)

        vectorstore = _get_vectorstore()
        if texts:
            vectorstore.add_texts(texts=texts, metadatas=metadatas)
        if resto_docs:
            vectorstore.add_documents(resto_docs)
        return len(items)

    count = await asyncio.get_event_loop().run_in_executor(None, _do_index)
    print(str(count) + " ta taom ChromaDB ga yuklandi")


def search_menu(query: str, k: int = 8):
    vectorstore = _get_vectorstore()
    return vectorstore.similarity_search(query, k=k)


def get_all_menu_from_db_sync(db_items: list) -> list:
    result = []
    for item in db_items:
        if item.is_sale and item.discount_percent:
            price_val = item.price - (item.price * item.discount_percent / 100)
        else:
            price_val = item.price

        result.append({
            "id":             item.id,
            "name":           item.name,
            "price":          float(price_val),
            "food_type":      item.food_type      if item.food_type      else "",
            "is_fatty":       item.is_fatty        if item.is_fatty        else False,
            "is_salty":       item.is_salty        if item.is_salty        else False,
            "is_sweet":       item.is_sweet        if item.is_sweet        else False,
            "is_spicy":       item.is_spicy        if item.is_spicy        else False,
            "is_vegetarian":  item.is_vegetarian   if item.is_vegetarian   else False,
            "has_sugar":      item.has_sugar       if item.has_sugar       else False,
            "is_diabetes_safe": item.is_diabetes_safe if item.is_diabetes_safe else False,
            "is_heart_safe":    item.is_heart_safe    if item.is_heart_safe    else False,
            "is_stomach_safe":  item.is_stomach_safe  if item.is_stomach_safe  else False,
            "is_pressure_safe": item.is_pressure_safe if item.is_pressure_safe else False,
            "is_gluten_free":   item.is_gluten_free   if item.is_gluten_free   else False,
            "calories":         item.calories,
        })
    return result