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

## Diferenças Entre Claude Code e Claude Multi-Team Harness

| Área | Claude Code puro | Claude Multi-Team Harness |
| --- | --- | --- |
| Modelo de sessão | Uma sessão interativa com um agente principal | Runtime hierárquico com `orchestrator -> leads -> workers` |
| Estrutura de times | Uso manual de agentes | Topologia de crew declarada em `.claude/crew/<crew>/multi-team.yaml` |
| Roteamento | Seleção direta de modelo ou CCR simples | Roteamento por policy via CCR com resolução por role/team/intent |
| Guardrails de delegação | Dependem do operador | Hierarquia strict por padrão, com visibilidade apenas dos leads na root |
| Ownership dos agentes | Ad hoc | Prompts, expertise, tools, skills e domínio por agente |
| Uso de MCP | Manual por sessão | Estratégia compartilhada de MCP embutida na topologia e nos prompts |
| Validação | Checks manuais | `ccmh doctor`, `ccmh check:runtime`, validação de route map e smoke tests |
| Repetibilidade | Depende da disciplina do operador | Definições de crew reexecutáveis e topologia multi-agent reutilizável |

## O Que Este Projeto Entrega

- Launcher único para Claude TUI com crews: `run:crew`
- Geração automática de custom agents a partir de `.claude/crew/<crew>/multi-team.yaml`
- Roteamento por policy via CCR
- Hierarquia strict por padrão (`orchestrator -> leads`)
- Opt-out da hierarquia com `--no-hierarchy`
- Configuração MCP compatível com o formato esperado pelo Claude (`mcpServers`)
- Expertise durável por agente com tool MCP local: `update_mental_model`

## Estrutura

- [`.claude/crew/`](./.claude/crew): definição dos crews
- [`.claude/crew/<crew>/expertise/`](./.claude/crew): arquivos de mental model durável por agente
- [`.claude/scripts/`](./.claude/scripts): launcher e utilitários
- [`.claude/package.json`](./.claude/package.json): comandos de runtime
- [`.claude/ccr/`](./.claude/ccr): router custom e route map
- [`.mcp.json`](./.mcp.json): configuração MCP no formato Claude
- [`docs/mental-model.md`](./docs/mental-model.md): guia de expertise durável e comportamento do updater

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

Validar o route map e detectar drift de sync:

```bash
ccmh ccr:validate-route-map
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

Precedência de roteamento e resolução por escopo:
- [docs/routing.md](./docs/routing.md)

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

Este runtime também inclui um servidor MCP local:

- `mental-model` -> expõe `update_mental_model`
- usado pelos agentes para persistir expertise durável sem abrir write amplo no repositório

## Expertise Durável

Cada agente possui um mental model YAML estruturado em:

- `.claude/crew/<crew>/expertise/<agent>-mental-model.yaml`

Esse é um dos principais diferenciais em relação ao Claude Code puro:

- a expertise persiste entre sessões
- o runtime entrega uma memória estável para cada agente configurado
- as atualizações passam pelo tool MCP `update_mental_model`, não por edição manual e ad hoc de YAML

O updater faz:

- resolve o caminho do expertise a partir do `multi-team.yaml` ativo
- adiciona entradas estruturadas como `lessons`, `risks`, `decisions`, `tools` ou `open_questions`
- preserva a validade do YAML
- aplica `meta.max_lines`
- falha de forma segura em ambiguidade, YAML malformado ou expertise não atualizável

Formato típico de chamada:

```json
{
  "agent": "planning-lead",
  "category": "lessons",
  "note": "Route campaign scoping through Planning before Creative execution."
}
```

Por que isso importa:

- orchestrators e leads mantêm memória durável sem precisar de permissões amplas de escrita
- os times acumulam conhecimento operacional reutilizável em vez de perdê-lo a cada sessão
- o comportamento das crews fica mais repetível ao longo do tempo

Guia detalhado:

- [docs/mental-model.md](./docs/mental-model.md)

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
ccmh check:runtime
```

Validar apenas o route map do CCR:

```bash
ccmh ccr:validate-route-map
```

Executar smoke tests:

```bash
ccmh test:smoke
```

## Suporte e Patrocínio

Se este projeto te ajuda, considere apoiar:

- Buy Me a Coffee: https://buymeacoffee.com/alyssonm
