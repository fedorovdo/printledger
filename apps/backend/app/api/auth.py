from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password, hash_password
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import ChangePasswordRequest, CurrentUserRead, LoginRequest, TokenResponse
from app.services.users import authenticate_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_current_user(request: Request) -> CurrentUserRead:
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return CurrentUserRead(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        is_active=user["is_active"],
    )


def require_admin(current_user: CurrentUserRead = Depends(get_current_user)) -> CurrentUserRead:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор")
    return current_user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.username, payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return TokenResponse(access_token=create_access_token(user.username, role=user.role.value, user_id=user.id))


@router.get("/me", response_model=CurrentUserRead)
def me(current_user: CurrentUserRead = Depends(get_current_user)) -> CurrentUserRead:
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUserRead = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    user = db.get(User, current_user.id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Новый пароль должен быть не короче 8 символов.")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий пароль неверен.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "ok"}


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"status": "ok"}
