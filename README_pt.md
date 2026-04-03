<p align="center">
  <img src="./assets/claude-code-multi-harness.png" alt="CLAUDE CODE MULTI HARNESS" width="100%" />
</p>

[![](https://img.shields.io/badge/%F0%9F%87%BA%F0%9F%87%B8-English%20README-1f6feb?style=flat)](README.md)

# Claude Multi-Team Harness

Um runtime multi-team/multi-agent focado em **Claude Code TUI + Claude Code Router (CCR)**.

Modelo operacional:
- `orchestrator`
- `team leads`
- `workers`

## O Que Esta Branch Entrega

- Launcher único para Claude TUI com crews: `run:crew`
- Geração automática de custom agents a partir de `.claude/crew/<crew>/multi-team.yaml`
- Roteamento por policy via CCR
- Hierarquia strict por padrão (`orchestrator -> leads`)
- Opt-out da hierarquia com `--no-hierarchy`
- Configuração MCP compatível com o formato esperado pelo Claude (`mcpServers`)

## Estrutura

- [`.claude/crew/`](./.claude/crew): definição dos crews
- [`.claude/scripts/`](./.claude/scripts): launcher e utilitários
- [`.claude/package.json`](./.claude/package.json): comandos de runtime
- [`.claude/ccr/`](./.claude/ccr): router custom e route map
- [`.mcp.json`](./.mcp.json): configuração MCP no formato Claude

## Pré-Requisitos

- Node.js
- `claude` CLI disponível no PATH
- `ccr` disponível no PATH

## Instalação

```bash
npm --prefix .claude install
```

## CLI Curta (`ccmh`)

Instale a CLI de atalho uma vez:

```bash
npm --prefix .claude run ccmh:install
```

Use os comandos `ccmh`:

```bash
ccmh list:crews
ccmh use marketing
ccmh use --marketing
ccmh --use marketing
ccmh run --crew marketing
```

## Comandos Principais

Listar crews:

```bash
ccmh list:crews
```

Selecionar crew ativo:

```bash
ccmh use <crew>
```

Limpar crew ativo:

```bash
ccmh clear
```

Abrir Claude TUI com multi-team (alias principal):

```bash
ccmh run --crew marketing
```

Retomar sessão (`-c`):

```bash
ccmh run --crew marketing -- -c
```

Espelhar metadados da sessão no diretório da crew (opcional):

```bash
ccmh run --crew marketing --session-mirror
```

## UX de Hierarquia

Strict hierarchy (padrão):
- O catálogo de agentes da sessão root expõe apenas os `leads`.
- O orchestrator recebe regras explícitas para evitar delegação direta para workers.

Relaxar hierarquia:

```bash
ccmh run --crew marketing --no-hierarchy
```

Forçar hierarquia strict explicitamente:

```bash
ccmh run --crew marketing --hierarchy
```

## Roteamento no CCR

Instalar router custom + route map:

```bash
ccmh ccr:install-router
ccmh ccr:sync-route-map
```

Executar com policy:

```bash
ccmh run --crew marketing --policy economy
```

Forçar roteamento do root/orchestrator:

```bash
ccmh run --crew marketing \
  --root-route --root-model lmstudio,nvidia/nemotron-3-nano-4b
```

## MCP (Formato Claude)

Arquivo válido para Claude:
- [`.mcp.json`](./.mcp.json)

Formato:

```json
{
  "mcpServers": {
    "server-name": {
      "transport": "stdio",
      "command": "...",
      "args": []
    }
  }
}
```

## Troubleshooting Rápido

Mostrar help do launcher:

```bash
ccmh run --help
```

Executar diagnóstico do ambiente:

```bash
ccmh doctor
```

Se o CCR não aplicar mudanças de rota:

```bash
ccr restart
```

Se quiser validar o comando sem abrir a TUI:

```bash
ccmh run --crew marketing --dry-run -- --version
```

## Checks de Contribuição

Validar arquivos do runtime:

```bash
npm --prefix .claude run check:runtime
```

Executar smoke tests:

```bash
npm --prefix .claude run test:smoke
```

## Suporte e Patrocínio

Se este projeto te ajuda, considere apoiar:

- Buy Me a Coffee: https://buymeacoffee.com/alyssonm
