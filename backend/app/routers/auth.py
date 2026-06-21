from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, Token, UserLogin, UserUpdate, PasswordChange, PasswordReset
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, check_role

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email, User.is_deleted == False).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # Create new user
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm gets username as email
    user = db.query(User).filter(User.email == form_data.username, User.is_deleted == False).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# Add support for JSON login body as well, just in case Axios sends it
@router.post("/login-json", response_model=Token)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email, User.is_deleted == False).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(check_role(["admin"]))):
    return db.query(User).filter(User.is_deleted == False).all()

# --- Admin User Management CRUD ---

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def admin_create_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(check_role(["admin"]))):
    existing_user = db.query(User).filter(User.email == user_in.email, User.is_deleted == False).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    db_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/users/{id}", response_model=UserResponse)
def admin_update_user(id: int, user_in: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(check_role(["admin"]))):
    db_user = db.query(User).filter(User.id == id, User.is_deleted == False).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Check email conflict
    email_conflict = db.query(User).filter(User.email == user_in.email, User.id != id, User.is_deleted == False).first()
    if email_conflict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        
    db_user.name = user_in.name
    db_user.email = user_in.email
    db_user.role = user_in.role
    db_user.is_active = user_in.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/users/{id}/reset-password", response_model=UserResponse)
def admin_reset_password(id: int, data: PasswordReset, db: Session = Depends(get_db), current_user: User = Depends(check_role(["admin"]))):
    db_user = db.query(User).filter(User.id == id, User.is_deleted == False).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    db_user.password_hash = get_password_hash(data.password)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(id: int, db: Session = Depends(get_db), current_user: User = Depends(check_role(["admin"]))):
    db_user = db.query(User).filter(User.id == id, User.is_deleted == False).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Prevent self-deletion
    if db_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
        
    db_user.is_deleted = True
    db.commit()
    return

# --- User Profile Settings ---

@router.put("/profile", response_model=UserResponse)
def update_profile(user_in: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Check email conflict
    email_conflict = db.query(User).filter(User.email == user_in.email, User.id != current_user.id, User.is_deleted == False).first()
    if email_conflict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        
    db_user.name = user_in.name
    db_user.email = user_in.email
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/profile/change-password", response_model=UserResponse)
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if not verify_password(data.old_password, db_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
        
    db_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    db.refresh(db_user)
    return db_user

