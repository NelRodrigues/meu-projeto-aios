# Configuração de Linguagem - Português de Angola

## 🌍 Idioma Padrão: Português de Angola (pt-AO)

Este projecto foi configurado para usar **português de Angola** em todas as comunicações com Claude Code.

### Configuração

- **Ficheiro de Configuração:** `~/.claude/settings.json`
- **Caminho de Configuração Global:** `~/.claude/CLAUDE.md`
- **Campo de Linguagem:** `"language": "português de Angola"`

### Instruções Importantes

Ao trabalhar com este projecto, **respeite SEMPRE estas regras de linguagem:**

1. **Vocabulário Angolano**
   - Use "ficheiro" em vez de "file" ou "arquivo"
   - Use "ecrã" em vez de "screen" ou "tela"
   - Use "rato" em vez de "mouse"
   - Use "teclado" em vez de "keyboard"
   - Use "computador" em vez de "computer"
   - Use "directório" em vez de "directory"

2. **Expressões Naturais**
   - "Deixa-me" em vez de "deixe-me"
   - "Vou" em vez de "vamos"
   - "Vamos" para forma colectiva
   - Use o pronome "você" de forma natural

3. **Nomes Técnicos**
   - Variáveis: `minhaFuncao`, `nomeUtilizador`
   - Classes: `MinhaClasse`, `UtilizadorActivo`
   - Comentários: use português de Angola

4. **Exemplos de Termos**
   ```
   Português de Angola         | Português de Portugal         | Português Brasileiro
   ----------------------------------------|-------------------------------
   ficheiro                    | ficheiro                      | arquivo
   ecrã                        | ecrã                          | tela
   rato                        | rato                          | mouse
   teclado                     | teclado                       | teclado
   computador                  | computador                    | computador
   directório/pasta            | directório/pasta              | diretório/pasta
   procurador                  | advogado                      | advogado
   confirmação                 | confirmação                   | confirmação
   ramo (git)                  | ramo (git)                    | branch (git)
   submeter                    | submeter                      | enviar/submeter
   ```

### Verificação

Se receber uma resposta do Claude Code que **não** esteja em português de Angola:

1. Verifique se o ficheiro `~/.claude/settings.json` tem `"language": "português de Angola"`
2. Verifique o ficheiro `~/.claude/CLAUDE.md` para confirmar as instruções
3. Relance o Claude Code: `claude`
4. Se persistir, mencione: *"Por favor, responda em português de Angola"*

---

**Data de Configuração:** 2026-02-13
**Versão:** 1.0
