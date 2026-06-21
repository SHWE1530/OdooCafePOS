import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class AuditModel:
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

class User(Base, AuditModel):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="employee", nullable=False) # admin, employee, kitchen
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    orders = relationship("Order", back_populates="user")
    sessions = relationship("Session", back_populates="user")

class Category(Base, AuditModel):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#7C5DFA", nullable=False) # hex code or CSS color class
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    products = relationship("Product", back_populates="category")

class Product(Base, AuditModel):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    price = Column(Float, nullable=False)
    unit = Column(String, default="pcs", nullable=False) # pcs, ml, g, etc.
    tax = Column(Float, default=5.0, nullable=False) # Tax percentage (e.g. 5.0 for 5%)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    stock = Column(Integer, default=50, nullable=False)
    min_stock = Column(Integer, default=10, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    @property
    def is_available(self) -> bool:
        return self.is_active

    @is_available.setter
    def is_available(self, value: bool):
        self.is_active = value

    # Relationships
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Floor(Base, AuditModel):
    __tablename__ = "floors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    tables = relationship("Table", back_populates="floor", cascade="all, delete-orphan")

class Table(Base, AuditModel):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(String, nullable=False)
    seats = Column(Integer, default=4, nullable=False)
    status = Column(String, default="available", nullable=False) # available, occupied, reserved
    floor_id = Column(Integer, ForeignKey("floors.id"), nullable=False)
    x_pos = Column(Integer, default=0, nullable=False) # Coordinates for layout
    y_pos = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    floor = relationship("Floor", back_populates="tables")
    orders = relationship("Order", back_populates="table")

class Customer(Base, AuditModel):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    orders = relationship("Order", back_populates="customer")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="active", nullable=False) # active, closed
    start_balance = Column(Float, default=0.0, nullable=False)
    end_balance = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")
    orders = relationship("Order", back_populates="session")

class Order(Base, AuditModel):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True) # Nullable for takeaway/delivery
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="draft", nullable=False) # draft, sent_to_kitchen, paid, cancelled
    total_amount = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    net_amount = Column(Float, default=0.0, nullable=False)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    sent_to_kitchen_at = Column(DateTime, nullable=True)
    preparing_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="orders")
    table = relationship("Table", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    session = relationship("Session", back_populates="orders")
    coupon = relationship("Coupon", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    kitchen_order = relationship("KitchenOrder", back_populates="order", uselist=False, cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    price = Column(Float, nullable=False) # Snapshot price at purchase
    tax_rate = Column(Float, default=5.0, nullable=False) # Tax rate snapshot
    discount_amount = Column(Float, default=0.0, nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    transaction_ref = Column(String, nullable=True)
    change_amount = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="payments")
    payment_method = relationship("PaymentMethod", back_populates="payments")

class PaymentMethod(Base, AuditModel):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # Cash, Card, UPI, etc.
    type = Column(String, nullable=False) # cash, card, upi
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    payments = relationship("Payment", back_populates="payment_method")

class Coupon(Base, AuditModel):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, nullable=False) # percentage, fixed
    value = Column(Float, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    orders = relationship("Order", back_populates="coupon")

class Promotion(Base, AuditModel):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # product, order
    min_quantity = Column(Integer, nullable=True) # for product promotion
    discount_value = Column(Float, nullable=False) # percentage discount or fixed discount
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True) # for product promotion
    min_order_amount = Column(Float, nullable=True) # for order promotion
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    product = relationship("Product")

class KitchenOrder(Base):
    __tablename__ = "kitchen_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    status = Column(String, default="TO_COOK", nullable=False) # TO_COOK, PREPARING, COMPLETED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="kitchen_order")

    @property
    def table_number(self):
        if self.order and self.order.table:
            return self.order.table.table_number
        return None

    @property
    def floor_name(self):
        if self.order and self.order.table and self.order.table.floor:
            return self.order.table.floor.name
        return None

    @property
    def items(self):
        result = []
        if self.order:
            for item in self.order.order_items:
                product_name = item.product.name if item.product else "Unknown Product"
                result.append({
                    "product_name": product_name,
                    "quantity": item.quantity,
                    "note": item.note
                })
        return result

    @property
    def elapsed_minutes(self):
        import datetime as dt
        if self.status != "COMPLETED":
            delta = dt.datetime.utcnow() - self.created_at
        else:
            delta = self.updated_at - self.created_at
        return int(delta.total_seconds() / 60)

    @property
    def is_delayed(self):
        return self.status != "COMPLETED" and self.elapsed_minutes > 15

    @property
    def order_created_at(self):
        return self.order.created_at if self.order else None

    @property
    def sent_to_kitchen_at(self):
        return self.order.sent_to_kitchen_at if self.order else None

    @property
    def preparing_at(self):
        return self.order.preparing_at if self.order else None

    @property
    def completed_at(self):
        return self.order.completed_at if self.order else None

    @property
    def paid_at(self):
        return self.order.paid_at if self.order else None


class Feedback(Base, AuditModel):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    rating = Column(Integer, nullable=False) # 1-5
    comment = Column(Text, nullable=True)

    # Relationships
    order = relationship("Order")

