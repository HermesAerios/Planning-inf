from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models.user import User
from ..schemas.user import Token, UserInDB
from ..utils.auth import verify_password, create_access_token
from ..config import settings
from typing import Annotated
from ..config import settings
from typing import Annotated
from ..limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

@router.post("/login", response_model=Token)
@limiter.limit("100/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    print(f"DEBUG LOGIN: received username={repr(form_data.username)} len={len(form_data.username)}, password={repr(form_data.password)} len={len(form_data.password)}")
    user = db.query(User).filter(User.username == form_data.username).first()
    if user:
        print(f"DEBUG LOGIN: user found! ID={user.id}")
    else:
        print(f"DEBUG LOGIN: user not found!")
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "id": user.id},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    try:
        from jose import JWTError, jwt
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        token_data = {"username": username}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

@router.get("/me", response_model=UserInDB)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return current_user
