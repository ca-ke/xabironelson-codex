from pydantic import BaseModel

class ResponseModel(BaseModel):
    content: str
    tokens_used: int
