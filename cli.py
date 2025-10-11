import typer
import yaml
import os
from pathlib import Path
from constants import CONFIG_FILE_NAME, DEFAULT_CONFIG
from dotenv import load_dotenv

app = typer.Typer(help="Xabironelson Codex")


@app.callback()
def main_callback():
    pass


@app.command()
def test():
    typer.echo("Hello from Xabironelson Codex")


@app.command()
def init():
    config_path = Path.cwd() / CONFIG_FILE_NAME
    if config_path.exists():
        typer.confirm(
            f"O arquivo {CONFIG_FILE_NAME} já existe. Deseja sobrescrevê-lo?",
            abort=True,
        )
    with open(config_path, "w") as f:
        yaml.dump(DEFAULT_CONFIG, f, sort_keys=False)

    typer.secho(
        f"Arquivo de configuração '{CONFIG_FILE_NAME}' criado com sucesso!",
        fg=typer.colors.GREEN,
    )


@app.command()
def solve(
    task: str = typer.Argument(
        ..., help="Descrição da tarefa que o agente deve realizar."
    ),
    config_file: Path = typer.Option(
        CONFIG_FILE_NAME,
        "--config",
        "-c",
        exists=True,
        file_okay=True,
        dir_okay=False,
        writable=False,
        help="Caminho para o arquivo de configuração.",
    ),
):
    typer.secho("Carregando variáveis de ambiente...", fg=typer.colors.BLUE)
    load_dotenv()

    typer.secho(f"Carregando configurações de: {config_file}", fg=typer.colors.CYAN)

    try:
        with open(config_file, "r") as f:
            config = yaml.safe_load(f)
    except yaml.YAMLError as e:
        typer.secho(
            f"Erro ao carregar o arquivo de configuração: {e}", fg=typer.colors.RED
        )
        raise typer.Exit(code=1)
    except FileNotFoundError:
        typer.secho(
            f"Erro: Arquivo de configuração '{config_file}' não encontrado.",
            fg=typer.colors.RED,
        )
        raise typer.Exit(code=1)

    llm_configuration = config.get("llm", {})
    verbose = config.get("verbose", False)

    env_var_name = llm_configuration.get("api_key_env", "LLM_API_KEY")
    api_key = os.getenv(env_var_name)

    if not api_key:
        typer.secho("\nERRO: Chave API não encontrada!", fg=typer.colors.RED)
        typer.echo(f"A variável de ambiente '{env_var_name}' não foi definida.")
        typer.echo("Certifique-se de criar um arquivo .env ou exportar a variável.")
        raise typer.Exit(code=1)

    typer.echo("\n[CONFIGURAÇÕES CARREGADAS]")
    typer.secho(f" Tarefa: {task}", fg=typer.colors.YELLOW)

    if llm_configuration:
        typer.echo(f" Modelo: {llm_configuration.get('model', 'N/A')}")
        typer.echo(f" Temperatura: {llm_configuration.get('temperature', 'N/A')}")
        typer.echo(f" Max Tokens: {llm_configuration.get('max_tokens', 'N/A')}")
        typer.secho(
            f" Chave API carregada de: {env_var_name} (OK)", fg=typer.colors.GREEN
        )
        typer.echo(f" Modo Verbose: {verbose}")
