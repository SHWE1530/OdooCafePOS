from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Promotion, User, Product
from app.schemas import PromotionCreate, PromotionResponse
from app.auth import get_current_user, check_role

router = APIRouter(prefix="/promotions", tags=["Promotions"])

@router.get("", response_model=List[PromotionResponse])
def get_promotions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Promotion).filter(Promotion.is_deleted == False).all()

@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
def create_promotion(
    promo_in: PromotionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
):
    if promo_in.type == "product" and not promo_in.product_id:
        raise HTTPException(status_code=400, detail="Product ID is required for product promotions")
    if promo_in.type == "order" and promo_in.min_order_amount is None:
        raise HTTPException(status_code=400, detail="Min order amount is required for order promotions")
        
    if promo_in.product_id:
        # Check product exists
        product = db.query(Product).filter(Product.id == promo_in.product_id, Product.is_deleted == False).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
    db_promo = Promotion(
        name=promo_in.name,
        type=promo_in.type,
        min_quantity=promo_in.min_quantity,
        discount_value=promo_in.discount_value,
        product_id=promo_in.product_id,
        min_order_amount=promo_in.min_order_amount,
        is_active=True
    )
    db.add(db_promo)
    db.commit()
    db.refresh(db_promo)
    return db_promo

@router.put("/{id}", response_model=PromotionResponse)
def update_promotion(
    id: int,
    promo_in: PromotionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
):
    db_promo = db.query(Promotion).filter(Promotion.id == id, Promotion.is_deleted == False).first()
    if not db_promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
        
    if promo_in.type == "product" and not promo_in.product_id:
        raise HTTPException(status_code=400, detail="Product ID is required for product promotions")
    if promo_in.type == "order" and promo_in.min_order_amount is None:
        raise HTTPException(status_code=400, detail="Min order amount is required for order promotions")
        
    if promo_in.product_id:
        product = db.query(Product).filter(Product.id == promo_in.product_id, Product.is_deleted == False).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
    db_promo.name = promo_in.name
    db_promo.type = promo_in.type
    db_promo.min_quantity = promo_in.min_quantity
    db_promo.discount_value = promo_in.discount_value
    db_promo.product_id = promo_in.product_id
    db_promo.min_order_amount = promo_in.min_order_amount
    
    db.commit()
    db.refresh(db_promo)
    return db_promo

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_promotion(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
):
    db_promo = db.query(Promotion).filter(Promotion.id == id, Promotion.is_deleted == False).first()
    if not db_promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
        
    db_promo.is_deleted = True
    db.commit()
    return
