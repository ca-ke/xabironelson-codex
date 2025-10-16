from pydantic import BaseModel


class CommandResult(BaseModel):
    message: str
    should_exit: bool = False
