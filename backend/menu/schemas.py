# menu/schemas.py
from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FoodTag(str, Enum):
    MEATY      = "meaty"
    VEGETARIAN = "vegetarian"
    SPICY      = "spicy"
    SALTY      = "salty"
    FATTY      = "fatty"
    FOR_KIDS   = "for_kids"
    POPULAR    = "popular"
    NEW        = "new"
    SALE       = "sale"


class FoodAvailability(str, Enum):
    AVAILABLE   = "available"
    LOW_STOCK   = "low_stock"
    UNAVAILABLE = "unavailable"


class FoodType(str, Enum):
    MAIN    = "main"
    SOUP    = "soup"
    SALAD   = "salad"
    SIDE    = "side"
    SNACK   = "snack"
    DESSERT = "dessert"
    DRINK   = "drink"
    BREAD   = "bread"
    SAUCE   = "sauce"


FOOD_TYPE_LABELS = {
    "main":    "Asosiy taom",
    "soup":    "Shorva",
    "salad":   "Salat",
    "side":    "Garnitur",
    "snack":   "Gazak",
    "dessert": "Shirinlik",
    "drink":   "Ichimlik",
    "bread":   "Non",
    "sauce":   "Sous",
}


# ── Category ─────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name:        str           = Field(..., min_length=1, max_length=100)
    emoji:       Optional[str] = None
    description: Optional[str] = None
    sort_order:  int           = 0


class CategoryUpdate(BaseModel):
    name:        Optional[str]  = None
    emoji:       Optional[str]  = None
    description: Optional[str]  = None
    sort_order:  Optional[int]  = None
    is_active:   Optional[bool] = None


class CategoryResponse(BaseModel):
    id:          int
    name:        str
    emoji:       Optional[str]
    description: Optional[str]
    sort_order:  int
    is_active:   bool
    model_config = {"from_attributes": True}


# ── MenuItem ─────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    category_id:  int
    name:         str           = Field(..., min_length=1, max_length=200)
    description:  Optional[str] = None
    price:        float         = Field(..., gt=0)
    image_url:    Optional[str] = None
    calories:     Optional[int] = None
    weight_grams: Optional[int] = None
    sort_order:   int           = 0
    tags:         List[FoodTag] = []
    food_type:    Optional[str] = None

    is_fatty:      bool = False
    is_salty:      bool = False
    is_sweet:      bool = False
    is_spicy:      bool = False
    is_vegetarian: bool = False
    has_sugar:     bool = False

    is_diabetes_safe: Optional[bool] = None
    is_heart_safe:    Optional[bool] = None
    is_stomach_safe:  Optional[bool] = None
    is_pressure_safe: Optional[bool] = None
    is_gluten_free:   Optional[bool] = None


class MenuItemUpdate(BaseModel):
    name:         Optional[str]              = None
    description:  Optional[str]              = None
    price:        Optional[float]            = Field(None, gt=0)
    image_url:    Optional[str]              = None
    calories:     Optional[int]              = None
    weight_grams: Optional[int]              = None
    sort_order:   Optional[int]              = None
    is_active:    Optional[bool]             = None
    availability: Optional[FoodAvailability] = None
    tags:         Optional[List[FoodTag]]    = None
    food_type:    Optional[str]              = None

    is_fatty:      Optional[bool] = None
    is_salty:      Optional[bool] = None
    is_sweet:      Optional[bool] = None
    is_spicy:      Optional[bool] = None
    is_vegetarian: Optional[bool] = None
    has_sugar:     Optional[bool] = None

    is_diabetes_safe: Optional[bool] = None
    is_heart_safe:    Optional[bool] = None
    is_stomach_safe:  Optional[bool] = None
    is_pressure_safe: Optional[bool] = None
    is_gluten_free:   Optional[bool] = None

    is_sale:          Optional[bool]     = None
    discount_percent: Optional[float]    = Field(None, ge=1, le=100)
    discount_label:   Optional[str]      = None
    sale_start:       Optional[datetime] = None
    sale_end:         Optional[datetime] = None


class MenuItemResponse(BaseModel):
    id:           int
    category_id:  int
    name:         str
    description:  Optional[str]
    price:        float
    image_url:    Optional[str]
    calories:     Optional[int]
    weight_grams: Optional[int]
    availability: str = "available"
    tags:         List[FoodTag] = []
    order_count:  int
    is_active:    bool
    sort_order:   int
    food_type:    Optional[str] = None

    is_fatty:      bool = False
    is_salty:      bool = False
    is_sweet:      bool = False
    is_spicy:      bool = False
    is_vegetarian: bool = False
    has_sugar:     bool = False

    is_diabetes_safe: Optional[bool] = None
    is_heart_safe:    Optional[bool] = None
    is_stomach_safe:  Optional[bool] = None
    is_pressure_safe: Optional[bool] = None
    is_gluten_free:   Optional[bool] = None

    is_sale:          bool            = False
    discount_percent: Optional[float] = None
    discount_label:   Optional[str]   = None
    sale_start:       Optional[datetime] = None
    sale_end:         Optional[datetime] = None
    discounted_price: Optional[float]   = None

    # Reyting — DB dan hisoblanib keladi
    avg_rating:   Optional[float] = None
    review_count: int             = 0

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def calc_discounted_price(self):
        now = datetime.utcnow()
        if (
            self.is_sale
            and self.discount_percent
            and self.sale_start
            and self.sale_end
            and self.sale_start <= now <= self.sale_end
        ):
            self.discounted_price = round(self.price - self.price * self.discount_percent / 100, 0)
        else:
            self.is_sale          = False
            self.discounted_price = None
        return self

    @field_validator('availability', mode='before')
    @classmethod
    def normalize_availability(cls, v):
        if v:
            return str(v).lower()
        return "available"

# ── Pagination ───────────────────────────────────────────

class MenuItemListResponse(BaseModel):
    items:       List[MenuItemResponse]
    total:       int
    page:        int
    limit:       int
    total_pages: int


# ── Combo ────────────────────────────────────────────────

class ComboItemCreate(BaseModel):
    menu_item_id: int
    quantity:     int           = Field(default=1, ge=1)
    size_note:    Optional[str] = None


class ComboCreate(BaseModel):
    name:        str                    = Field(..., min_length=1, max_length=200)
    description: Optional[str]         = None
    price:       float                 = Field(..., gt=0)
    image_url:   Optional[str]         = None
    items:       List[ComboItemCreate] = []


class ComboUpdate(BaseModel):
    name:        Optional[str]   = None
    description: Optional[str]  = None
    price:       Optional[float] = Field(None, gt=0)
    image_url:   Optional[str]  = None
    is_active:   Optional[bool] = None


class ComboItemResponse(BaseModel):
    id:           int
    menu_item_id: int
    quantity:     int
    size_note:    Optional[str]
    menu_item:    MenuItemResponse
    model_config = {"from_attributes": True}


class ComboResponse(BaseModel):
    id:          int
    name:        str
    description: Optional[str]
    price:       float
    image_url:   Optional[str]
    is_active:   bool
    items:       List[ComboItemResponse] = []
    model_config = {"from_attributes": True}


class CategoryWithItems(CategoryResponse):
    items: List[MenuItemResponse] = []
    model_config = {"from_attributes": True}


class FullMenuResponse(BaseModel):
    categories: List[CategoryWithItems]
    combos:     List[ComboResponse]


# ── Banner ───────────────────────────────────────────────

class BannerCreate(BaseModel):
    title:      str                = Field(..., min_length=1, max_length=200)
    image_url:  str
    link_url:   Optional[str]      = None
    sort_order: int                = 0
    start_date: Optional[datetime] = None
    end_date:   Optional[datetime] = None


class BannerResponse(BaseModel):
    id:         int
    title:      str
    image_url:  str
    link_url:   Optional[str]
    is_active:  bool
    sort_order: int
    start_date: Optional[datetime]
    end_date:   Optional[datetime]
    model_config = {"from_attributes": True}