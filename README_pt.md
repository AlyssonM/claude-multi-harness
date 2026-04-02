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
- [`.mcp.json`](./.mcp.json) e [`.claude/mcp.json`](./.claude/mcp.json): configuração MCP no formato Claude

## Pré-Requisitos

- Node.js
- `claude` CLI disponível no PATH
- `ccr` disponível no PATH

## Instalação

```bash
npm --prefix .claude install
```

## Comandos Principais

Listar crews:

```bash
npm --prefix .claude run list:crews
```

Selecionar crew ativo:

```bash
npm --prefix .claude run use:crew -- <crew>
```

Limpar crew ativo:

```bash
npm --prefix .claude run clear:crew
```

Abrir Claude TUI com multi-team (alias principal):

```bash
npm --prefix .claude run run:crew -- --crew marketing
```

Também disponível como:

```bash
npm --prefix .claude run run:crew:claude -- --crew marketing
```

Retomar sessão (`-c`):

```bash
npm --prefix .claude run run:crew -- --crew marketing -- -c
```

Espelhar metadados da sessão no diretório da crew (opcional):

```bash
npm --prefix .claude run run:crew -- --crew marketing --session-mirror
```

Notas:
- O runtime canônico da conversa continua em `~/.claude/projects/...`.
- Com `--session-mirror`, o launcher cria um espelho em `.claude/crew/<crew>/sessions/...` com `manifest.json`, `session_index.json`, `events.jsonl` e um ponteiro/symlink para `conversation.jsonl`.

## UX de Hierarquia

Strict hierarchy (padrão):
- O catálogo de agentes da sessão root expõe apenas os `leads`.
- O orchestrator recebe regras explícitas para evitar delegação direta para workers.

Relaxar hierarquia:

```bash
npm --prefix .claude run run:crew -- --crew marketing --no-hierarchy
```

Forçar hierarquia strict explicitamente:

```bash
npm --prefix .claude run run:crew -- --crew marketing --hierarchy
```

## Roteamento no CCR

Instalar router custom + route map:

```bash
npm --prefix .claude run ccr:install-router
npm --prefix .claude run ccr:sync-route-map
```

Executar com policy:

```bash
npm --prefix .claude run run:crew -- --crew marketing --policy economy
```

Forçar roteamento do root/orchestrator:

```bash
npm --prefix .claude run run:crew -- --crew marketing \
  --root-route --root-model lmstudio,nvidia/nemotron-3-nano-4b
```

## MCP (Formato Claude)

Arquivos válidos para Claude:
- [`.mcp.json`](./.mcp.json)
- [`.claude/mcp.json`](./.claude/mcp.json)

Ambos usam:

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
npm --prefix .claude run run:crew -- --help
```

Se o CCR não aplicar mudanças de rota:

```bash
ccr restart
```

Se quiser validar o comando sem abrir a TUI:

```bash
npm --prefix .claude run run:crew -- --crew marketing --dry-run -- --version
```

## Suporte e Patrocínio

Se este projeto te ajuda, considere apoiar:

- Buy Me a Coffee: https://buymeacoffee.com/alyssonm
