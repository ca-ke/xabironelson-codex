from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from domain.tools.tool import Tool


class ToolModel(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str = Field(
        ...,
        description="The name of the tool",
    )
    description: str = Field(
        ...,
        description="A brief description of the tool's purpose",
    )
    parameters: dict[str, Any] | None = Field(
        None,
        description="Parameters required by the tool",
    )
    instance: Tool | None = Field(
        None,
        exclude=True,
        description="The tool instance implementing the Tool interface",
    )

    @classmethod
    def create(
        cls,
        name: str,
        description: str,
        parameters: dict[str, Any] | None = None,
        instance: Tool | None = None,
    ) -> "ToolModel":
        return cls(
            name=name,
            description=description,
            parameters=parameters,
            instance=instance,
        )
