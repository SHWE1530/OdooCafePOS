from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models import KitchenOrder, Order, User
from app.schemas import KitchenOrderResponse, KitchenOrderUpdate
from app.auth import get_current_user, check_role
from app.websocket import broadcast_sync

router = APIRouter(prefix="/kitchen", tags=["Kitchen"])

@router.get("/orders", response_model=List[KitchenOrderResponse])
def get_kitchen_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    return db.query(KitchenOrder).filter(
        or_(
            KitchenOrder.status.in_(["TO_COOK", "PREPARING"]),
            (KitchenOrder.status == "COMPLETED") & (KitchenOrder.updated_at >= two_hours_ago)
        )
    ).order_by(KitchenOrder.created_at.asc()).all()

@router.get("/orders/all", response_model=List[KitchenOrderResponse])
def get_all_kitchen_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(KitchenOrder).order_by(KitchenOrder.created_at.desc()).all()

@router.put("/orders/{id}/status", response_model=KitchenOrderResponse)
def update_kitchen_order_status(
    id: int,
    status_update: KitchenOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin", "kitchen", "employee"]))
):
    new_status = status_update.status
    if new_status not in ["TO_COOK", "PREPARING", "COMPLETED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be TO_COOK, PREPARING, or COMPLETED"
        )
        
    kitchen_order = db.query(KitchenOrder).filter(KitchenOrder.id == id).first()
    if not kitchen_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kitchen order not found"
        )
        
    kitchen_order.status = new_status
    kitchen_order.updated_at = datetime.utcnow()
    
    # Propagate status to main Order
    order = db.query(Order).filter(Order.id == kitchen_order.order_id).first()
    if order:
        if new_status == "PREPARING":
            order.status = "cooking"
            order.preparing_at = datetime.utcnow()
        elif new_status == "COMPLETED":
            order.status = "ready" # Ready for cashier checkout
            order.completed_at = datetime.utcnow()
            
    db.commit()
    db.refresh(kitchen_order)
    
    table_id = order.table_id if order else None
    broadcast_sync({"event": "kitchen_updated"})
    broadcast_sync({"event": "order_updated", "table_id": table_id})
    broadcast_sync({"event": "dashboard_updated"})
    
    return kitchen_order
