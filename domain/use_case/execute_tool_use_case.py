from domain.tools.tool import Tool
from utils.logger import Logger


class ExecuteToolUseCase:
    def __init__(
        self,
        tools: dict[str, Tool],
        logger: Logger,
        working_directory: str,
    ):
        self._tools = tools
        self._logger = logger
        self._working_directory = working_directory

    def execute(self, tool_name: str, arguments: dict) -> str:
        self._logger.info(
            "Executing tool.",
            context={"tool_name": tool_name, "arguments": arguments},
        )
        try:
            tool = self._tools.get(tool_name)
            if not tool:
                raise ValueError(f"Tool '{tool_name}' not found.")

            arguments_copy = arguments.copy()
            arguments_copy["working_directory"] = self._working_directory

            result = tool.execute(**arguments_copy)

            self._logger.info(
                "Tool executed successfully.",
                context={"tool_name": tool_name, "result": result},
            )
            return result
        except Exception as e:
            self._logger.error(
                "Tool execution failed.",
                context={"tool_name": tool_name, "error": str(e)},
            )
            raise e
