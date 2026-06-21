from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- Token & Authentication ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str = "employee" # admin, employee, kitchen

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    color: str = "#7C5DFA"

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    category_id: int
    price: float
    unit: str = "pcs"
    tax: float = 5.0
    description: Optional[str] = None
    image_url: Optional[str] = None
    stock: int = 50
    min_stock: int = 10
    is_available: bool = True

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    is_active: bool
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True

class ProductPaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ProductResponse]

    class Config:
        from_attributes = True

# --- Table & Floor ---
class TableBase(BaseModel):
    table_number: str
    seats: int = 4
    status: str = "available" # available, occupied, reserved
    x_pos: int = 0
    y_pos: int = 0

class TableCreate(TableBase):
    floor_id: int

class TableResponse(TableBase):
    id: int
    floor_id: int
    is_active: bool

    class Config:
        from_attributes = True

class FloorBase(BaseModel):
    name: str

class FloorCreate(FloorBase):
    pass

class FloorResponse(FloorBase):
    id: int
    is_active: bool
    tables: List[TableResponse] = []

    class Config:
        from_attributes = True

# --- Customer ---
class CustomerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

# --- Session ---
class SessionBase(BaseModel):
    start_balance: float = 0.0
    notes: Optional[str] = None

class SessionCreate(SessionBase):
    pass

class SessionResponse(BaseModel):
    id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    start_balance: float
    end_balance: float
    notes: Optional[str] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class SessionClose(BaseModel):
    end_balance: float
    notes: Optional[str] = None

# --- Coupon & Promotion ---
class CouponBase(BaseModel):
    code: str
    type: str # percentage, fixed
    value: float
    expiry_date: Optional[datetime] = None
    usage_limit: Optional[int] = None

class CouponCreate(CouponBase):
    pass

class CouponResponse(CouponBase):
    id: int
    usage_count: int
    is_active: bool

    class Config:
        from_attributes = True

class PromotionBase(BaseModel):
    name: str
    type: str # product, order
    min_quantity: Optional[int] = None
    discount_value: float
    product_id: Optional[int] = None
    min_order_amount: Optional[float] = None

class PromotionCreate(PromotionBase):
    pass

class PromotionResponse(PromotionBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

# --- Order Items ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = 1
    note: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    price: float
    tax_rate: float
    discount_amount: float
    note: Optional[str] = None
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# --- Payments & Methods ---
class PaymentMethodBase(BaseModel):
    name: str
    type: str # cash, card, upi

class PaymentMethodCreate(PaymentMethodBase):
    pass

class PaymentMethodResponse(PaymentMethodBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    amount: float
    payment_method_id: int
    transaction_ref: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    order_id: int
    change_amount: float
    created_at: datetime
    payment_method: Optional[PaymentMethodResponse] = None

    class Config:
        from_attributes = True

# --- Kitchen Orders ---
class KitchenOrderBase(BaseModel):
    status: str = "TO_COOK" # TO_COOK, PREPARING, COMPLETED
    notes: Optional[str] = None

class KitchenOrderUpdate(BaseModel):
    status: str

class KitchenOrderItemResponse(BaseModel):
    product_name: str
    quantity: int
    note: Optional[str] = None

class KitchenOrderResponse(KitchenOrderBase):
    id: int
    order_id: int
    created_at: datetime
    updated_at: datetime
    table_number: Optional[str] = None
    floor_name: Optional[str] = None
    items: List[KitchenOrderItemResponse] = []
    elapsed_minutes: Optional[int] = None
    is_delayed: bool = False
    order_created_at: Optional[datetime] = None
    sent_to_kitchen_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Order ---
class OrderBase(BaseModel):
    table_id: Optional[int] = None
    customer_id: Optional[int] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = []

class OrderUpdateItems(BaseModel):
    items: List[OrderItemCreate]

class OrderResponse(BaseModel):
    id: int
    order_number: str
    table_id: Optional[int] = None
    customer_id: Optional[int] = None
    session_id: Optional[int] = None
    user_id: int
    status: str
    total_amount: float
    discount_amount: float
    tax_amount: float
    net_amount: float
    coupon_id: Optional[int] = None
    sent_to_kitchen_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    order_items: List[OrderItemResponse] = []
    payments: List[PaymentResponse] = []
    table: Optional[TableResponse] = None
    customer: Optional[CustomerResponse] = None
    coupon: Optional[CouponResponse] = None
    kitchen_order: Optional[KitchenOrderResponse] = None

    class Config:
        from_attributes = True

# --- Feedback ---
class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: int
    order_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- User CRUD & Profile ---
class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: str
    is_active: bool

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordReset(BaseModel):
    password: str

class OrderCreatePublic(BaseModel):
    table_id: int
    items: List[OrderItemCreate]
    coupon_code: Optional[str] = None



