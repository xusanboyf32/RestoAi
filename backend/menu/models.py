from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    Text, ForeignKey, Enum as SAEnum, Table as SATable, DateTime
)
from sqlalchemy.orm import relationship
import enum
from core.base import Base, TimestampMixin


class FoodTag(str, enum.Enum):
    MEATY      = "meaty"
    VEGETARIAN = "vegetarian"
    SPICY      = "spicy"
    SALTY      = "salty"
    FATTY      = "fatty"
    FOR_KIDS   = "for_kids"
    POPULAR    = "popular"
    NEW        = "new"
    SALE       = "sale"


class FoodAvailability(str, enum.Enum):
    AVAILABLE   = "available"
    LOW_STOCK   = "low_stock"
    UNAVAILABLE = "unavailable"


class FoodType(str, enum.Enum):
    MAIN        = "main"        # Asosiy taom
    SOUP        = "soup"        # Sho'rva
    SALAD       = "salad"       # Salat
    SIDE        = "side"        # Garnitür
    SNACK       = "snack"       # Gazak
    DESSERT     = "dessert"     # Shirinlik
    DRINK       = "drink"       # Ichimlik
    BREAD       = "bread"       # Non
    SAUCE       = "sauce"       # Sous


menu_item_tags = SATable(
    "menu_item_tags",
    Base.metadata,
    Column("menu_item_id", Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), primary_key=True),
    Column("tag", String(50), primary_key=True),
)


class MenuCategory(Base, TimestampMixin):
    __tablename__ = "menu_categories"

    id          = Column(Integer, primary_key=True)
    name        = Column(String(100), nullable=False)
    emoji       = Column(String(10),  nullable=True)
    description = Column(Text,        nullable=True)
    sort_order  = Column(Integer,     default=0)
    is_active   = Column(Boolean,     default=True)

    items = relationship("MenuItem", back_populates="category", lazy="selectin", cascade="all, delete-orphan")


class MenuItem(Base, TimestampMixin):
    __tablename__ = "menu_items"

    id          = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("menu_categories.id", ondelete="CASCADE"), nullable=False)

    name         = Column(String(200), nullable=False)
    description  = Column(Text,        nullable=True)
    price        = Column(Float,       nullable=False)
    image_url    = Column(String(500), nullable=True)
    calories     = Column(Integer,     nullable=True)
    weight_grams = Column(Integer,     nullable=True)

    # Taom turi — AI filtri uchun muhim
    food_type = Column(String(50), nullable=True)  # FoodType qiymatlari

    # Taom xususiyatlari — AI filtri uchun
    is_fatty      = Column(Boolean, default=False, nullable=False)  # Yog'li
    is_salty      = Column(Boolean, default=False, nullable=False)  # Sho'r
    is_sweet      = Column(Boolean, default=False, nullable=False)  # Shirin
    is_spicy      = Column(Boolean, default=False, nullable=False)  # Achchiq
    is_vegetarian = Column(Boolean, default=False, nullable=False)  # Vegetarian
    has_sugar     = Column(Boolean, default=False, nullable=False)  # Shakar bor

    availability = Column(String(50), default="AVAILABLE", nullable=False)

    # Kasalliklar uchun
    is_diabetes_safe = Column(Boolean, nullable=True)
    is_heart_safe    = Column(Boolean, nullable=True)
    is_stomach_safe  = Column(Boolean, nullable=True)
    is_pressure_safe = Column(Boolean, nullable=True)
    is_gluten_free   = Column(Boolean, nullable=True)

    order_count = Column(Integer, default=0, nullable=False)
    is_active   = Column(Boolean, default=True)
    sort_order  = Column(Integer, default=0)

    is_sale          = Column(Boolean,     default=False)
    discount_percent = Column(Float,       nullable=True)
    discount_label   = Column(String(100), nullable=True)
    sale_start       = Column(DateTime,    nullable=True)
    sale_end         = Column(DateTime,    nullable=True)

    category    = relationship("MenuCategory", back_populates="items")
    combo_items = relationship("ComboItem", back_populates="menu_item", lazy="selectin", cascade="all, delete-orphan")


class MenuItemReview(Base, TimestampMixin):
    __tablename__ = "menu_item_reviews"

    id           = Column(Integer, primary_key=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    comment      = Column(Text,    nullable=False)
    rating       = Column(Integer, default=0, nullable=False)
    likes        = Column(Integer, default=0, nullable=False)

    menu_item = relationship("MenuItem", lazy="selectin")


class ComboSet(Base, TimestampMixin):
    __tablename__ = "combo_sets"

    id          = Column(Integer, primary_key=True)
    name        = Column(String(200), nullable=False)
    description = Column(Text,        nullable=True)
    price       = Column(Float,       nullable=False)
    image_url   = Column(String(500), nullable=True)
    is_active   = Column(Boolean,     default=True)

    items = relationship("ComboItem", back_populates="combo", lazy="selectin", cascade="all, delete-orphan")


class ComboItem(Base, TimestampMixin):
    __tablename__ = "combo_items"

    id           = Column(Integer, primary_key=True)
    combo_id     = Column(Integer, ForeignKey("combo_sets.id",   ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id",   ondelete="CASCADE"), nullable=False)
    quantity     = Column(Integer, default=1)
    size_note    = Column(String(100), nullable=True)

    combo     = relationship("ComboSet", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="combo_items")


class Banner(Base, TimestampMixin):
    __tablename__ = "banners"

    id         = Column(Integer, primary_key=True)
    title      = Column(String(200), nullable=False)
    image_url  = Column(String(500), nullable=False)
    link_url   = Column(String(500), nullable=True)
    is_active  = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    end_date   = Column(DateTime, nullable=True)