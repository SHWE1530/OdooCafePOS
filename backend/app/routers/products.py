from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid

from app.database import get_db
from app.models import Product, Category, User
from app.schemas import ProductCreate, ProductResponse, ProductPaginatedResponse
from app.auth import get_current_user, check_role

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductPaginatedResponse)
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search products by name"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page")
):
    query = db.query(Product).filter(Product.is_deleted == False)
    
    if search:
        query = query.filter(Product.name.contains(search))
    if category_id:
        query = query.filter(Product.category_id == category_id)
        
    total = query.count()
    offset = (page - 1) * limit
    items = query.order_by(Product.name).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

@router.get("/all", response_model=List[ProductResponse])
def get_all_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).filter(Product.is_deleted == False, Product.is_active == True).all()

@router.get("/public", response_model=List[ProductResponse])
def get_public_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_deleted == False, Product.is_active == True).all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    # Check category exists
    category = db.query(Category).filter(Category.id == product_in.category_id, Category.is_deleted == False).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    db_product = Product(
        name=product_in.name,
        category_id=product_in.category_id,
        price=product_in.price,
        unit=product_in.unit,
        tax=product_in.tax,
        description=product_in.description,
        image_url=product_in.image_url,
        stock=product_in.stock,
        min_stock=product_in.min_stock,
        is_active=product_in.is_available
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/{id}", response_model=ProductResponse)
def update_product(
    id: int, 
    product_in: ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_product = db.query(Product).filter(Product.id == id, Product.is_deleted == False).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
        
    category = db.query(Category).filter(Category.id == product_in.category_id, Category.is_deleted == False).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
        
    db_product.name = product_in.name
    db_product.category_id = product_in.category_id
    db_product.price = product_in.price
    db_product.unit = product_in.unit
    db_product.tax = product_in.tax
    db_product.description = product_in.description
    db_product.image_url = product_in.image_url
    db_product.stock = product_in.stock
    db_product.min_stock = product_in.min_stock
    db_product.is_active = product_in.is_available
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(check_role(["admin"]))
):
    db_product = db.query(Product).filter(Product.id == id, Product.is_deleted == False).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Soft delete
    db_product.is_deleted = True
    db.commit()
    return

@router.post("/upload-image")
def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(check_role(["admin"]))
):
    upload_dir = "static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"http://localhost:8000/static/uploads/{unique_filename}"}

