from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Category, User
from app.schemas import CategoryCreate, CategoryResponse
from app.auth import get_current_user, check_role

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Category).filter(Category.is_deleted == False).all()

@router.get("/public", response_model=List[CategoryResponse])
def get_public_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_deleted == False, Category.is_active == True).all()

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    # Check if category name already exists
    existing = db.query(Category).filter(Category.name == category_in.name, Category.is_deleted == False).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    db_cat = Category(
        name=category_in.name,
        color=category_in.color,
        is_active=True
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.put("/{id}", response_model=CategoryResponse)
def update_category(
    id: int, 
    category_in: CategoryCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_cat = db.query(Category).filter(Category.id == id, Category.is_deleted == False).first()
    if not db_cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Check if updated name collides with another category
    existing = db.query(Category).filter(
        Category.name == category_in.name, 
        Category.id != id, 
        Category.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
    
    db_cat.name = category_in.name
    db_cat.color = category_in.color
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_cat = db.query(Category).filter(Category.id == id, Category.is_deleted == False).first()
    if not db_cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    # Soft delete
    db_cat.is_deleted = True
    db.commit()
    return
