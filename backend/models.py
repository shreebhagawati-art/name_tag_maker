from typing import List, Literal
from pydantic import BaseModel, Field, field_validator
from .config import MAX_TOTAL_TAGS, MAX_FOOD_NAME_LENGTH

class TagItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=MAX_FOOD_NAME_LENGTH, description="Food or dish name")
    quantity: int = Field(1, ge=1, le=MAX_TOTAL_TAGS, description="Quantity of tags to print for this dish")

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Dish name cannot be empty or only spaces.")
        return cleaned

class PreviewRequest(BaseModel):
    template: Literal["day", "night"] = Field("day", description="Template selection: 'day' or 'night'")
    food_name: str = Field("PANEER BUTTER MASALA", description="Food or dish name to preview")

class PreviewResponse(BaseModel):
    success: bool
    image_base64: str
    template: str
    food_name: str
    font_size_used: float
    lines_count: int

class GenerateRequest(BaseModel):
    template: Literal["day", "night"] = Field(..., description="Template selection: 'day' or 'night'")
    items: List[TagItem] = Field(..., min_length=1, description="List of food items and their quantities")

    @field_validator("items")
    @classmethod
    def validate_total_quantity(cls, items: List[TagItem]) -> List[TagItem]:
        total = sum(item.quantity for item in items)
        if total <= 0:
            raise ValueError("Total quantity must be at least 1.")
        if total > MAX_TOTAL_TAGS:
            raise ValueError(f"Total quantity exceeds the maximum limit of {MAX_TOTAL_TAGS} tags (current total: {total}).")
        return items

class GenerateResponse(BaseModel):
    success: bool
    file_id: str
    filename: str
    total_pages: int
    total_items: int
    message: str
