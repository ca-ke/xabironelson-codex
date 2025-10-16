import os
from pathlib import Path

import typer
import yaml
from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table

from constants import CONFIG_FILE_NAME, DEFAULT_CONFIG
from data.client.lite_llm_client import LiteLLMClient
from data.repository.llm_repository import LLMRepositoryImpl
from domain.commands.registry import COMMAND_REGISTRY
from domain.models.model_errors import LLMError
from domain.use_case.command_use_case import CommandUseCase
from domain.use_case.generate_completion_use_case import GenerateCompletionUseCase
from models.config import LLMConfig
from utils.logger import BasicLogger

app = typer.Typer(help="Xabironelson Codex")
console = Console()


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
def repl(
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
    llm_configuration, prompt_config, _, _ = initialize_system(config_file=config_file)
    use_case = create_use_case(llm_configuration, prompt_config)
    command_use_case = create_command_use_case(llm_configuration)

    console.print()
    welcome_panel = Panel(
        "[bold cyan]Bem-vindo ao Xabironelson Codex REPL! 🤖[/bold cyan]\n\n"
        "💡 [dim]Digite 'sair', 'exit' ou 'quit' para encerrar[/dim]\n"
        "💡 [dim]Use Ctrl+C ou Ctrl+D para sair também[/dim]",
        border_style="bright_cyan",
        expand=False,
    )
    console.print(welcome_panel)
    console.print()

    conversation_turns = 0
    total_tokens = 0

    while True:
        try:
            typer.echo()
            user_input = typer.prompt(
                typer.style("╭─[", fg=typer.colors.BRIGHT_BLACK)
                + typer.style("👤 Usuário", fg=typer.colors.YELLOW, bold=True)
                + typer.style("]", fg=typer.colors.BRIGHT_BLACK)
                + typer.style("\n╰─➤ ", fg=typer.colors.BRIGHT_BLACK),
                default="",
            )

        except typer.Abort:
            console.print()
            exit_table = Table(show_header=False, box=None, padding=(0, 1))
            exit_table.add_column(justify="left")
            exit_table.add_row(
                "[bright_magenta]🔴 Encerrando Xabiro...[/bright_magenta]"
            )
            exit_table.add_row(
                f"[bright_black]📊 Conversas: {conversation_turns}  |  Tokens totais: {total_tokens}[/bright_black]"
            )

            console.print(
                Panel(exit_table, border_style="bright_magenta", expand=False)
            )
            break
        except EOFError:
            console.print()
            exit_table = Table(show_header=False, box=None, padding=(0, 1))
            exit_table.add_column(justify="left")
            exit_table.add_row(
                "[bright_magenta]🔴 Encerrando Xabiro...[/bright_magenta]"
            )
            exit_table.add_row(
                f"[bright_black]📊 Conversas: {conversation_turns}  |  Tokens totais: {total_tokens}[/bright_black]"
            )

            console.print(
                Panel(exit_table, border_style="bright_magenta", expand=False)
            )
            break

        # TODO: O negócio chama XabiroNelsonCodex o token de saída vai ser em pt
        if user_input.lower().strip() in ["sair"]:
            console.print()
            exit_table = Table(show_header=False, box=None, padding=(0, 1))
            exit_table.add_column(justify="left")
            exit_table.add_row(
                "[bold bright_magenta]👋 Até mais![/bold bright_magenta]"
            )
            exit_table.add_row(
                f"[bright_black]📊 Conversas: {conversation_turns}  |  Tokens totais: {total_tokens}[/bright_black]"
            )

            console.print(
                Panel(exit_table, border_style="bright_magenta", expand=False)
            )
            break

        if not user_input.strip():
            continue

        if user_input.strip().startswith("/"):
            console.print()
            console.print("[dim cyan]   ⏳ Processando sua solicitação...[/dim cyan]")
            console.print()
            try:
                command_result = command_use_case.execute(user_input.strip())
                command_panel = Panel(
                    command_result.message,
                    title="[bold bright_blue]💻 Comando[/bold bright_blue]",
                    border_style="bright_blue",
                    expand=False,
                )
                console.print(command_panel)

                if command_result.should_exit:
                    break

            except Exception as e:
                error_panel = Panel(
                    f"[bold red]❌ Erro ao processar o comando:[/bold red]\n{str(e)}",
                    border_style="red",
                    expand=False,
                )
                console.print(error_panel)
        else:
            try:
                console.print()
                console.print(
                    "[dim cyan]   ⏳ Processando sua solicitação...[/dim cyan]"
                )
                console.print()

                result = use_case.execute(user_input)
                conversation_turns += 1
                total_tokens += result.tokens_used

                response_content = Markdown(result.content)
                metadata_text = f"[bright_black]💬 Turno: {conversation_turns}  |  🎫 Tokens: {result.tokens_used}  |  📊 Total: {total_tokens}[/bright_black]"

                response_panel = Panel(
                    response_content,
                    title="[bold bright_cyan]🤖 Xabiro[/bold bright_cyan]",
                    subtitle=metadata_text,
                    border_style="bright_cyan",
                    expand=False,
                )
                console.print(response_panel)

            except LLMError as e:
                console.print()
                error_table = Table(show_header=False, box=None, padding=(0, 1))
                error_table.add_column(justify="left")
                error_table.add_row("[bold red]❌ ERRO LLM[/bold red]")
                error_table.add_row(f"[red]{e.message}[/red]")

                console.print(Panel(error_table, border_style="red", expand=False))
            except Exception as e:
                console.print()
                error_table = Table(show_header=False, box=None, padding=(0, 1))
                error_table.add_column(justify="left")
                error_table.add_row("[bold red]❌ ERRO INESPERADO[/bold red]")
                error_table.add_row(f"[red]{str(e)}[/red]")

                console.print(Panel(error_table, border_style="red", expand=False))


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
    llm_configuration, prompt_config, verbose, _ = initialize_system(config_file)
    use_case = create_use_case(llm_configuration, prompt_config)

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


def create_command_use_case(llm_configuration):
    command_registry = COMMAND_REGISTRY

    # TODO: To ligado que ta duplicado, mas logo menos vamos meter uma DI aqui
    logger = BasicLogger()

    llm_config = LLMConfig(
        model=llm_configuration.get("model", "gpt-4"),
        temperature=llm_configuration.get("temperature", 0.7),
        max_tokens=llm_configuration.get("max_tokens", 1500),
        api_key_env=llm_configuration.get("api_key_env", "LLM_API_KEY"),
    )

    command_use_case = CommandUseCase(
        command_registry=command_registry,
        llm_config=llm_config,
        logger=logger,
    )
    return command_use_case


def create_use_case(llm_configuration, prompt_config):
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
    return use_case


def initialize_system(config_file: Path):
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

    if llm_configuration:
        typer.echo(f" Modelo: {llm_configuration.get('model', 'N/A')}")
        typer.echo(f" Temperatura: {llm_configuration.get('temperature', 'N/A')}")
        typer.echo(f" Max Tokens: {llm_configuration.get('max_tokens', 'N/A')}")
        typer.secho(
            f" Chave API carregada de: {env_var_name} (OK)", fg=typer.colors.GREEN
        )
        typer.echo(f" Modo Verbose: {verbose}")

    typer.echo("\n[INICIALIZANDO SISTEMA]")
    return llm_configuration, prompt_config, verbose, env_var_name
