import os

from domain.tools.tool import Tool

MAX_CHARS_TO_READ = 10000


class ReadFileContentTool(Tool):
    """Tool to read the content of a file."""

    def execute(self, **kwargs) -> str:
        """Read the content of the specified file."""
        self.execute_validations(**kwargs)

        file_path = kwargs.get("file_path")
        working_directory = kwargs.get("working_directory")

        abs_working_dir = os.path.abspath(working_directory)
        abs_file_path = os.path.abspath(os.path.join(working_directory, file_path))

        if not abs_file_path.startswith(abs_working_dir):
            return f'Error: Cannot read "{file_path}" as it is outside the permitted working directory'
        if not os.path.isfile(abs_file_path):
            return f'Error: File not found or is not a regular file: "{file_path}"'

        try:
            with open(abs_file_path, "r", encoding="utf-8") as file:
                content = file.read(MAX_CHARS_TO_READ)
                if os.path.getsize(abs_file_path) > MAX_CHARS_TO_READ:
                    content += f'[...File "{file_path}" truncated at {MAX_CHARS_TO_READ} characters]'
                return content
        except FileNotFoundError:
            return f"Error: The file at {abs_file_path} was not found."
        except Exception as e:
            return f"Error reading file at {abs_file_path}: {str(e)}"

    def execute_validations(self, **kwargs) -> None:
        """Perform any necessary validations before executing the tool."""
        if "file_path" not in kwargs:
            raise ValueError(
                "The 'file_path' argument is required for ReadFileContentTool."
            )
        if "working_directory" not in kwargs:
            raise ValueError(
                "The 'working_directory' argument is required for ReadFileContentTool."
            )
