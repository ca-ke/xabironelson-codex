import os
from pathlib import Path

import typer
import yaml
from dotenv import load_dotenv

from constants import CONFIG_FILE_NAME, DEFAULT_CONFIG
from data.client.lite_llm_client import LiteLLMClient
from data.repository.llm_repository import LLMRepositoryImpl
from domain.models.model_errors import LLMError
from domain.use_case.generate_completion_use_case import GenerateCompletionUseCase
from models.config import LLMConfig
from utils.logger import BasicLogger

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
    with open(config_path, "w", encoding="utf-8") as f:
        yaml.dump(DEFAULT_CONFIG, f, allow_unicode=True, sort_keys=False)

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
        with open(config_file, "r", encoding="utf-8") as f:
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
    prompt_config = config.get("prompt", {})
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

    typer.echo("\n[INICIALIZANDO SISTEMA]")
    typer.secho("Configurando dependências manualmente...", fg=typer.colors.BLUE)

    logger = BasicLogger()

    llm_config = LLMConfig(
        model=llm_configuration.get("model", "gpt-4"),
        temperature=llm_configuration.get("temperature", 0.7),
        max_tokens=llm_configuration.get("max_tokens", 1500),
        api_key_env=llm_configuration.get("api_key_env", "LLM_API_KEY"),
    )

    llm_config_adapter = llm_config

    llm_client = LiteLLMClient(
        llm_config=llm_config_adapter,
        logger=logger,
        prompt=prompt_config,
    )

    repository = LLMRepositoryImpl(
        llm_client=llm_client,
        logger=logger,
    )

    use_case = GenerateCompletionUseCase(
        repository=repository,
        logger=logger,
    )

    typer.secho("Sistema inicializado com sucesso!", fg=typer.colors.GREEN)
    typer.echo("\n[EXECUTANDO TAREFA]")

    try:
        typer.secho("Processando...", fg=typer.colors.CYAN)
        result = use_case.execute(task)

        typer.echo("\n[RESULTADO]")
        typer.secho(result.content, fg=typer.colors.GREEN)
        typer.echo(f"\nTokens utilizados: {result.tokens_used}")

    except LLMError as e:
        typer.secho(f"\n[ERRO LLM] {e.message}", fg=typer.colors.RED)
        if verbose and e.cause:
            typer.echo(f"Causa: {e.cause}")
        raise typer.Exit(code=1)
    except Exception as e:
        typer.secho(f"\n[ERRO] {str(e)}", fg=typer.colors.RED)
        if verbose:
            import traceback

            typer.echo(traceback.format_exc())
        raise typer.Exit(code=1)
