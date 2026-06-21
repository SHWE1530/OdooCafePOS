from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.database import get_db
from app.models import Order, OrderItem, Product, Table, Customer, Session as POSSession, User, Coupon, Promotion, KitchenOrder, Feedback
from app.schemas import OrderCreate, OrderResponse, OrderUpdateItems, FeedbackCreate, FeedbackResponse, OrderCreatePublic
from app.auth import get_current_user
from app.websocket import broadcast_sync
from app.routers.payments import generate_upi_qr

router = APIRouter(prefix="/orders", tags=["Orders"])

def calculate_order_totals(order: Order, db: Session):
    """
    Recalculates order subtotal, tax, discounts, and net total.
    Applies active automatic promotions (product-level and order-level) and coupons.
    """
    total_amount = 0.0      # Sum of (item.price * item.quantity)
    discount_amount = 0.0   # Sum of all discounts (product-level + order-level + coupon)
    tax_amount = 0.0        # Sum of tax on items
    
    # 1. Fetch active promotions
    promotions = db.query(Promotion).filter(Promotion.is_active == True, Promotion.is_deleted == False).all()
    product_promos = {p.product_id: p for p in promotions if p.type == "product" and p.product_id is not None}
    order_promos = [p for p in promotions if p.type == "order"]
    
    # 2. Process and calculate item-level values
    for item in order.order_items:
        # Fetch the current product to get price & tax rate if not snapshot
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
            
        item.price = product.price
        item.tax_rate = product.tax
        
        item_total = item.price * item.quantity
        total_amount += item_total
        
        # Check for automatic product promotion
        item_discount = 0.0
        if product.id in product_promos:
            promo = product_promos[product.id]
            if item.quantity >= (promo.min_quantity or 1):
                # Apply product discount (we treat discount_value as a percentage)
                item_discount = item_total * (promo.discount_value / 100.0)
                
        item.discount_amount = item_discount
        discount_amount += item_discount
        
        # Calculate tax on the discounted item price
        item_taxable = item_total - item_discount
        item_tax = item_taxable * (item.tax_rate / 100.0)
        tax_amount += item_tax
        
    # 3. Process order-level automatic promotions
    # Find the best order promotion (highest discount)
    applicable_order_promo_discount = 0.0
    for promo in order_promos:
        min_amt = promo.min_order_amount or 0.0
        if total_amount >= min_amt:
            # We treat discount_value as a percentage for order promo
            promo_discount = total_amount * (promo.discount_value / 100.0)
            if promo_discount > applicable_order_promo_discount:
                applicable_order_promo_discount = promo_discount
                
    discount_amount += applicable_order_promo_discount
    
    # 4. Process Coupon (if any)
    if order.coupon_id:
        coupon = db.query(Coupon).filter(Coupon.id == order.coupon_id, Coupon.is_active == True, Coupon.is_deleted == False).first()
        if coupon:
            coupon_discount = 0.0
            if coupon.type == "percentage":
                coupon_discount = (total_amount - discount_amount) * (coupon.value / 100.0)
            elif coupon.type == "fixed":
                coupon_discount = coupon.value
                
            # Clamp coupon discount to remaining total amount
            current_net = total_amount - discount_amount
            if coupon_discount > current_net:
                coupon_discount = current_net
                
            discount_amount += coupon_discount
            
    # Calculate net total
    net_amount = (total_amount - discount_amount) + tax_amount
    if net_amount < 0:
        net_amount = 0.0
        
    order.total_amount = round(total_amount, 2)
    order.discount_amount = round(discount_amount, 2)
    order.tax_amount = round(tax_amount, 2)
    order.net_amount = round(net_amount, 2)
    order.updated_at = datetime.utcnow()

@router.get("", response_model=List[OrderResponse])
def get_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, description="Filter by order status"),
    table_id: Optional[int] = Query(None)
):
    query = db.query(Order).filter(Order.is_deleted == False)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if table_id:
        query = query.filter(Order.table_id == table_id)
        
    return query.order_by(Order.created_at.desc()).all()

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify active cashier session
    session = db.query(POSSession).filter(
        POSSession.user_id == current_user.id,
        POSSession.status == "active"
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must open a POS session before creating an order"
        )
        
    # Generate unique order number (e.g., ORD-YYYYMMDD-XXXX)
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_str = str(uuid.uuid4().hex[:4]).upper()
    order_number = f"ORD-{date_str}-{random_str}"
    
    # Check table status if table_id is provided
    if order_in.table_id:
        table = db.query(Table).filter(Table.id == order_in.table_id, Table.is_deleted == False).first()
        if not table:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Table not found")
        if table.status == "occupied":
            # Find if there is an active draft order for this table
            existing_order = db.query(Order).filter(
                Order.table_id == table.id,
                Order.status.in_(["draft", "sent_to_kitchen", "cooking", "ready"]),
                Order.is_deleted == False
            ).first()
            if existing_order:
                return existing_order # Return existing order instead of creating new
            
    db_order = Order(
        order_number=order_number,
        table_id=order_in.table_id,
        customer_id=order_in.customer_id,
        session_id=session.id,
        user_id=current_user.id,
        status="draft",
        total_amount=0.0,
        discount_amount=0.0,
        tax_amount=0.0,
        net_amount=0.0
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Process items if provided
    if order_in.items:
        for item in order_in.items:
            product = db.query(Product).filter(Product.id == item.product_id, Product.is_deleted == False).first()
            if not product:
                continue
            db_item = OrderItem(
                order_id=db_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=product.price,
                tax_rate=product.tax,
                discount_amount=0.0,
                note=item.note
            )
            db.add(db_item)
        db.commit()
        db.refresh(db_order)
        
    calculate_order_totals(db_order, db)
    db.commit()
    
    # Update table status to occupied
    if db_order.table_id:
        table = db.query(Table).filter(Table.id == db_order.table_id).first()
        if table:
            table.status = "occupied"
            db.commit()
            
    broadcast_sync({"event": "order_updated", "table_id": db_order.table_id})
    broadcast_sync({"event": "dashboard_updated"})
    return db_order

@router.get("/{id}", response_model=OrderResponse)
def get_order_details(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order

@router.put("/{id}/items", response_model=OrderResponse)
def update_order_items(
    id: int,
    items_in: OrderUpdateItems,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status not in ["draft", "sent_to_kitchen", "cooking", "ready"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update items of a paid or cancelled order"
        )
        
    # Delete old items
    db.query(OrderItem).filter(OrderItem.order_id == id).delete()
    
    # Add new items
    for item in items_in.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_deleted == False).first()
        if not product:
            continue
        db_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.price,
            tax_rate=product.tax,
            discount_amount=0.0,
            note=item.note
        )
        db.add(db_item)
        
    db.commit()
    db.refresh(order)
    calculate_order_totals(order, db)
    db.commit()
    broadcast_sync({"event": "order_updated", "table_id": order.table_id})
    return order

@router.post("/{id}/send-to-kitchen", response_model=OrderResponse)
def send_to_kitchen(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is already sent or processed")
        
    order.status = "cooking"
    order.sent_to_kitchen_at = datetime.utcnow()
    
    # Create or update KitchenOrder
    kitchen_order = db.query(KitchenOrder).filter(KitchenOrder.order_id == id).first()
    if not kitchen_order:
        kitchen_order = KitchenOrder(
            order_id=id,
            status="TO_COOK"
        )
        db.add(kitchen_order)
    else:
        kitchen_order.status = "TO_COOK"
        
    db.commit()
    db.refresh(order)
    broadcast_sync({"event": "kitchen_updated"})
    broadcast_sync({"event": "order_updated", "table_id": order.table_id})
    return order

@router.post("/{id}/apply-coupon", response_model=OrderResponse)
def apply_coupon(id: int, coupon_code: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    coupon = db.query(Coupon).filter(
        Coupon.code == coupon_code,
        Coupon.is_active == True,
        Coupon.is_deleted == False
    ).first()
    
    if not coupon:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive coupon code")
        
    if coupon.expiry_date and coupon.expiry_date < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon has expired")
        
    if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon usage limit reached")
        
    order.coupon_id = coupon.id
    calculate_order_totals(order, db)
    db.commit()
    db.refresh(order)
    return order

@router.post("/{id}/remove-coupon", response_model=OrderResponse)
def remove_coupon(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    order.coupon_id = None
    calculate_order_totals(order, db)
    db.commit()
    db.refresh(order)
    return order

@router.post("/{id}/feedback", response_model=FeedbackResponse)
def submit_feedback(
    id: int,
    feedback_in: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    feedback = Feedback(
        order_id=id,
        rating=feedback_in.rating,
        comment=feedback_in.comment
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    broadcast_sync({"event": "dashboard_updated"})
    return feedback

@router.get("/public/active")
def get_active_table_order(table_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(
        Order.table_id == table_id,
        Order.is_deleted == False,
        Order.status.in_(["draft", "sent_to_kitchen", "cooking", "ready", "paid"])
    ).order_by(Order.updated_at.desc()).first()
    
    if not order:
        return None
        
    if order.status == "paid":
        if not order.paid_at or (datetime.utcnow() - order.paid_at).total_seconds() > 30:
            return None
            
    items = []
    for item in order.order_items:
        product_name = item.product.name if item.product else "Unknown Product"
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": product_name,
            "quantity": item.quantity,
            "price": item.price,
            "note": item.note,
            "total": item.price * item.quantity
        })
        
    upi_qr_base64 = None
    if order.status != "paid":
        upi_qr_base64 = generate_upi_qr(order.net_amount, order.order_number)
        
    return {
        "id": order.id,
        "order_number": order.order_number,
        "table_id": order.table_id,
        "status": order.status,
        "total_amount": order.total_amount,
        "discount_amount": order.discount_amount,
        "tax_amount": order.tax_amount,
        "net_amount": order.net_amount,
        "items": items,
        "upi_qr": upi_qr_base64,
        "paid_at": order.paid_at,
        "coupon": {
            "id": order.coupon.id,
            "code": order.coupon.code,
            "value": order.coupon.value,
            "type": order.coupon.type
        } if order.coupon else None
    }

@router.post("/public/self-order")
def place_self_order(order_in: OrderCreatePublic, db: Session = Depends(get_db)):
    table = db.query(Table).filter(Table.id == order_in.table_id, Table.is_deleted == False).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    cashier = db.query(User).filter(User.role.in_(["admin", "employee"])).first()
    if not cashier:
        raise HTTPException(status_code=400, detail="No active cashier found to assign order")
        
    session = db.query(POSSession).filter(POSSession.status == "active").first()
    session_id = session.id if session else None
    
    date_str = datetime.utcnow().strftime("%Y%m%d")
    random_str = str(uuid.uuid4().hex[:4]).upper()
    order_number = f"ORD-{date_str}-{random_str}"
    
    db_order = Order(
        order_number=order_number,
        table_id=table.id,
        customer_id=None,
        session_id=session_id,
        user_id=cashier.id,
        status="cooking",
        sent_to_kitchen_at=datetime.utcnow(),
        total_amount=0.0,
        discount_amount=0.0,
        tax_amount=0.0,
        net_amount=0.0
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    for item in order_in.items:
        product = db.query(Product).filter(Product.id == item.product_id, Product.is_deleted == False).first()
        if not product:
            continue
        db_item = OrderItem(
            order_id=db_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=product.price,
            tax_rate=product.tax,
            discount_amount=0.0,
            note=item.note
        )
        db.add(db_item)
    db.commit()
    db.refresh(db_order)
    
    if order_in.coupon_code:
        coupon = db.query(Coupon).filter(
            Coupon.code == order_in.coupon_code,
            Coupon.is_active == True,
            Coupon.is_deleted == False
        ).first()
        if coupon:
            db_order.coupon_id = coupon.id
            
    calculate_order_totals(db_order, db)
    db.commit()
    
    kitchen_order = KitchenOrder(
        order_id=db_order.id,
        status="TO_COOK"
    )
    db.add(kitchen_order)
    db.commit()
    
    table.status = "occupied"
    db.commit()
    
    broadcast_sync({"event": "kitchen_updated"})
    broadcast_sync({"event": "order_updated", "table_id": table.id})
    broadcast_sync({"event": "dashboard_updated"})
    
    return db_order

@router.post("/public/{id}/apply-coupon")
def apply_coupon_public(id: int, coupon_code: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    coupon = db.query(Coupon).filter(
        Coupon.code == coupon_code,
        Coupon.is_active == True,
        Coupon.is_deleted == False
    ).first()
    
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code")
        
    order.coupon_id = coupon.id
    calculate_order_totals(order, db)
    db.commit()
    db.refresh(order)
    
    broadcast_sync({"event": "order_updated", "table_id": order.table_id})
    return order

@router.post("/public/{id}/remove-coupon")
def remove_coupon_public(id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order.coupon_id = None
    calculate_order_totals(order, db)
    db.commit()
    db.refresh(order)
    
    broadcast_sync({"event": "order_updated", "table_id": order.table_id})
    return order

@router.post("/public/{id}/feedback")
def submit_feedback_public(id: int, feedback_in: FeedbackCreate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == id, Order.is_deleted == False).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    feedback = Feedback(
        order_id=id,
        rating=feedback_in.rating,
        comment=feedback_in.comment
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    broadcast_sync({"event": "dashboard_updated"})
    return feedback

