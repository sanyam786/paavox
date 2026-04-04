from pydantic import BaseModel
from typing import Optional


class ConnectedAccount(BaseModel):
    id: str
    platform: str
    platform_username: Optional[str] = None
    platform_user_id: Optional[str] = None
    created_at: str


class ConnectedAccountsResponse(BaseModel):
    accounts: list[ConnectedAccount]
