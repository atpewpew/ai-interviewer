from fastapi import APIRouter, HTTPException, status
from config import db
from dependencies import hash_password, verify_password, create_access_token
from models.schemas import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    from datetime import datetime, timezone

    user_doc = {
        "email": req.email,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "name": req.name,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    token = create_access_token(
        {"sub": str(result.inserted_id), "role": req.role}
    )
    return TokenResponse(access_token=token, role=req.role, name=req.name)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(
        {"sub": str(user["_id"]), "role": user["role"]}
    )
    return TokenResponse(
        access_token=token, role=user["role"], name=user["name"]
    )
