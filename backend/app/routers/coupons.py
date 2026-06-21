from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Coupon, User
from app.schemas import CouponCreate, CouponResponse
from app.auth import get_current_user, check_role

router = APIRouter(prefix="/coupons", tags=["Coupons"])

@router.get("", response_model=List[CouponResponse])
def get_coupons(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Coupon).filter(Coupon.is_deleted == False).all()

@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
def create_coupon(
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
):
    existing = db.query(Coupon).filter(Coupon.code == coupon_in.code, Coupon.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
        
    db_coupon = Coupon(
        code=coupon_in.code.upper(),
        type=coupon_in.type,
        value=coupon_in.value,
        expiry_date=coupon_in.expiry_date,
        usage_limit=coupon_in.usage_limit,
        usage_count=0,
        is_active=True
    )
    db.add(db_coupon)
    db.commit()
    db.refresh(db_coupon)
    return db_coupon

@router.put("/{id}", response_model=CouponResponse)
def update_coupon(
    id: int,
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
):
    db_coupon = db.query(Coupon).filter(Coupon.id == id, Coupon.is_deleted == False).first()
    if not db_coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    existing = db.query(Coupon).filter(
        Coupon.code == coupon_in.code,
        Coupon.id != id,
        Coupon.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
        
    db_coupon.code = coupon_in.code.upper()
    db_coupon.type = coupon_in.type
    db_coupon.value = coupon_in.value
    db_coupon.expiry_date = coupon_in.expiry_date
    db_coupon.usage_limit = coupon_in.usage_limit
    
    db.commit()
    db.refresh(db_coupon)
    return db_coupon

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_role(["admin"]))
):
    db_coupon = db.query(Coupon).filter(Coupon.id == id, Coupon.is_deleted == False).first()
    if not db_coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    db_coupon.is_deleted = True
    db.commit()
    return
