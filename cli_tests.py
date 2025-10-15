"""
Testes focados apenas no encoding UTF-8 dos comandos init e solve
"""
import unittest
import os
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch
from typer.testing import CliRunner
import yaml

from cli import app
from constants import CONFIG_FILE_NAME


class TestUTF8Encoding(unittest.TestCase):
    """Testa se encoding UTF-8 está sendo usado corretamente"""
    
    def setUp(self):
        """Criar diretório temporário para testes"""
        self.runner = CliRunner()
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)
    
    def tearDown(self):
        """Limpar diretório temporário"""
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_init_writes_with_utf8(self):
        """
        Testa se o comando 'init' escreve o arquivo com encoding UTF-8
        Verifica: with open(config_path, "w", encoding="utf-8")
        """
        result = self.runner.invoke(app, ["init"])
        self.assertEqual(result.exit_code, 0)
        
        with open(CONFIG_FILE_NAME, "r", encoding="utf-8") as f:
            content = f.read()
        
        portuguese_chars = ["Você", "código", "é", "usuário"]
        for char in portuguese_chars:
            self.assertIn(
                char, 
                content, 
                f"Caractere '{char}' não encontrado - encoding pode estar errado"
            )
        
        self.assertNotIn(
            "\\x", 
            content, 
            "Encontrado \\xNN no arquivo - encoding UTF-8 não foi usado!"
        )
        
    def test_init_yaml_has_allow_unicode(self):
        """
        Testa se yaml.dump está usando allow_unicode=True
        Isso garante que caracteres UTF-8 não sejam escapados
        """
        self.runner.invoke(app, ["init"])
        
        with open(CONFIG_FILE_NAME, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
        
        prompt_value = config.get("prompt", {}).get("value", "")
        
        self.assertIn("Você", prompt_value)
        self.assertIn("código", prompt_value)
        self.assertIn("é", prompt_value)
        self.assertIn("raciocínio", prompt_value)
        self.assertIn("usuário", prompt_value)
        self.assertIn("ação", prompt_value)
        self.assertIn("sequência", prompt_value)

        with open(CONFIG_FILE_NAME, "r", encoding="utf-8") as f:
            raw_content = f.read()
        
        self.assertNotIn("\\xe", raw_content.lower())
        self.assertNotIn("\\u00", raw_content)        
    
    def test_solve_reads_with_utf8(self):
        """
        Testa se o comando 'solve' lê o arquivo com encoding UTF-8
        Verifica: with open(config_file, "r", encoding="utf-8")
        """
        # Criar arquivo de config com caracteres especiais
        test_config = {
            "max_steps": 10,
            "tools": {"planner": True},
            "prompt": {
                "value": "Você é um agente. Tarefa: depurar código com atenção.",
                "metadata": {"version": "1.0", "description": "Test"}
            },
            "llm": {
                "model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 1500,
                "api_key_env": "LLM_API_KEY"
            }
        }
        
        with open(CONFIG_FILE_NAME, "w", encoding="utf-8") as f:
            yaml.dump(test_config, f, allow_unicode=True)
        
        with patch.dict(os.environ, {"LLM_API_KEY": "test-key-123"}):
            result = self.runner.invoke(app, ["solve", "test task"])
        
        self.assertNotIn("UnicodeDecodeError", result.stdout)
        self.assertNotIn("codec", result.stdout.lower())
        
        self.assertIn("CONFIGURAÇÕES CARREGADAS", result.stdout)
        print(result.stdout)
        
    
    def test_solve_handles_utf8_in_config(self):
        """
        Testa se solve processa corretamente um config com UTF-8
        """
        self.runner.invoke(app, ["init"])
        
        with patch.dict(os.environ, {"LLM_API_KEY": "fake-key"}):
            result = self.runner.invoke(app, ["solve", "criar função"])
        
        self.assertEqual(result.exit_code, 0)
        self.assertIn("gpt-4", result.stdout)
        print(result.stdout)
        
    
    
    def test_init_then_solve_utf8_flow(self):
        """
        Testa o fluxo completo: init (escreve UTF-8) -> solve (lê UTF-8)
        """
        init_result = self.runner.invoke(app, ["init"])
        self.assertEqual(init_result.exit_code, 0)
        
        with open(CONFIG_FILE_NAME, "r", encoding="utf-8") as f:
            content = f.read()
        
        self.assertIn("Você", content)
        self.assertNotIn("\\x", content)
        
        with patch.dict(os.environ, {"LLM_API_KEY": "key"}):
            solve_result = self.runner.invoke(app, ["solve", "tarefa"])
        
        self.assertEqual(solve_result.exit_code, 0)
        self.assertIn("CONFIGURAÇÕES CARREGADAS", solve_result.stdout)
        print(solve_result.stdout)
        
    
    
    def test_utf8_with_various_special_chars(self):
        """
        Testa vários caracteres especiais
        """
        special_chars = {
            "á": "acentos agudos",
            "â": "acentos circunflexos", 
            "ã": "til",
            "ç": "cedilha",
            "é": "e acentuado",
            "ê": "e circunflexo",
            "í": "i acentuado",
            "ó": "o acentuado",
            "õ": "o til",
            "ú": "u acentuado",
            "ü": "u trema"
        }
        
        test_prompt = " ".join(special_chars.keys())
        test_config = {
            "max_steps": 10,
            "tools": {"planner": True},
            "prompt": {"value": test_prompt, "metadata": {"version": "1.0", "description": "Test"}},
            "llm": {"model": "gpt-4", "temperature": 0.7, "max_tokens": 1500}
        }
        
        with open(CONFIG_FILE_NAME, "w", encoding="utf-8") as f:
            yaml.dump(test_config, f, allow_unicode=True)
        
        with open(CONFIG_FILE_NAME, "r", encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
        
        loaded_prompt = loaded["prompt"]["value"]
        for char, description in special_chars.items():
            self.assertIn(
                char, 
                loaded_prompt, 
                f"Caractere '{char}' ({description}) não preservado"
            )



if __name__ == "__main__":
    unittest.main(verbosity=2)