from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Customer, Order, User
from app.schemas import CustomerCreate, CustomerResponse
from app.auth import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by name, email, or phone")
):
    query = db.query(Customer).filter(Customer.is_deleted == False)
    if search:
        query = query.filter(
            Customer.name.contains(search) | 
            Customer.email.contains(search) | 
            Customer.phone.contains(search)
        )
    return query.all()

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if duplicate email or phone (if provided)
    if customer_in.email:
        dup = db.query(Customer).filter(Customer.email == customer_in.email, Customer.is_deleted == False).first()
        if dup:
            raise HTTPException(status_code=400, detail="Customer with this email already exists")
    if customer_in.phone:
        dup = db.query(Customer).filter(Customer.phone == customer_in.phone, Customer.is_deleted == False).first()
        if dup:
            raise HTTPException(status_code=400, detail="Customer with this phone number already exists")
            
    db_customer = Customer(
        name=customer_in.name,
        email=customer_in.email,
        phone=customer_in.phone,
        is_active=True
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/{id}/orders", response_model=list)
def get_customer_orders(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve order history for customer
    customer = db.query(Customer).filter(Customer.id == id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return db.query(Order).filter(Order.customer_id == id, Order.is_deleted == False).order_by(Order.created_at.desc()).all()
