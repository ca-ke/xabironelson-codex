from typing import List
from pydantic import BaseModel, Field


class PromptMetadata(BaseModel):
    """Metadados do prompt, permitindo versionamento e descrição."""

    version: str = Field(
        ..., description="Versão do prompt, para controle de mudanças."
    )
    description: str = Field(..., description="Descrição da finalidade deste prompt.")


class LLMConfig(BaseModel):
    """Configurações de parâmetros de chamada para a LLM."""

    model: str = Field("gpt-4", description="Nome do modelo de LLM a ser utilizado.")
    temperature: float = Field(
        0.7, description="Temperatura de amostragem da LLM (0.0 a 2.0)."
    )
    max_tokens: int = Field(
        1500, description="Limite máximo de tokens para a resposta da LLM."
    )
    api_key_env: str = Field(
        "LLM_API_KEY",
        description="Nome da variável de ambiente que contém a chave API.",
    )


class Tool(BaseModel):
    """Representa uma única ferramenta que o agente pode utilizar."""

    name: str = Field(
        ..., description="Nome de invocação da ferramenta (ex: 'file_manager')."
    )
    description: str = Field(
        ..., description="Descrição detalhada da ferramenta para o raciocínio da LLM."
    )


class PromptConfig(BaseModel):
    """Contém o valor (a string do prompt) e seus metadados."""

    value: str = Field(..., description="O corpo do system_prompt injetado na LLM.")
    metadata: PromptMetadata = Field(
        ..., description="Metadados do prompt, incluindo a versão."
    )


class AgentConfig(BaseModel):
    """Modelo de configuração raiz para toda a aplicação do agente."""

    max_steps: int = Field(
        10, description="Número máximo de passos no ciclo Thought-Action-Observation."
    )
    tools: List[Tool] = Field(
        ..., description="Lista de ferramentas disponíveis para o agente."
    )
    prompt: PromptConfig = Field(
        ..., description="Configurações e valor do prompt de sistema."
    )
    llm: LLMConfig = Field(
        ..., description="Configurações específicas do modelo de linguagem."
    )
