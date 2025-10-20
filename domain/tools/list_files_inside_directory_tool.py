import os

from domain.tools.tool import Tool


class ListFilesInsideDirectoryTool(Tool):
    """Tool to list files inside a directory."""

    def execute(self, **kwargs) -> str:
        """List files inside the specified directory."""
        self.execute_validations(**kwargs)

        directory_path = kwargs.get("directory_path")
        working_directory = kwargs.get("working_directory")

        abs_working_dir = os.path.abspath(working_directory)
        abs_directory_path = os.path.abspath(
            os.path.join(working_directory, directory_path)
        )

        if not abs_directory_path.startswith(abs_working_dir):
            return f'Error: Cannot list files in "{directory_path}" as it is outside the permitted working directory'

        if not os.path.isdir(abs_directory_path):
            return (
                f'Error: Directory not found or is not a directory: "{directory_path}"'
            )

        try:
            files = os.listdir(abs_directory_path)
            return (
                "\n".join(files)
                if files
                else f'No files found in directory "{directory_path}".'
            )
        except FileNotFoundError:
            return f"Error: The directory at {abs_directory_path} was not found."
        except Exception as e:
            return f"Error listing files in directory at {abs_directory_path}: {str(e)}"

    def execute_validations(self, **kwargs) -> None:
        """Perform any necessary validations before executing the tool."""
        if "directory_path" not in kwargs:
            raise ValueError(
                "The 'file_path' argument is required for ListFilesInsideDirectoryTool."
            )
        if "working_directory" not in kwargs:
            raise ValueError(
                "The 'working_directory' argument is required for ListFilesInsideDirectoryTool."
            )
