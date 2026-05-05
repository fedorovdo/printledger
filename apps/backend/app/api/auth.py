from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import create_access_token, verify_admin_credentials
from app.schemas.auth import CurrentUserRead, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_current_user(request: Request) -> CurrentUserRead:
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return CurrentUserRead(username=user["username"], role=user["role"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    if not verify_admin_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    return TokenResponse(access_token=create_access_token(payload.username, role="admin"))


@router.get("/me", response_model=CurrentUserRead)
def me(current_user: CurrentUserRead = Depends(get_current_user)) -> CurrentUserRead:
    return current_user


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"status": "ok"}
