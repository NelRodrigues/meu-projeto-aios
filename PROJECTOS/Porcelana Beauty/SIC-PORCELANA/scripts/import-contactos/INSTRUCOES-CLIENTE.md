# Instruções — Exportação dos Contactos (Porcelana Beauty)

**Para:** Yolenia Balaca / equipa Porcelana Beauty
**De:** Marca Digital
**Objectivo:** consolidar os ~398 contactos (software de gestão + faturação) para importar no SIC.

---

## O que precisamos de ti

Um (ou dois) ficheiros **CSV** com os contactos das clientes. Usa o template `TEMPLATE-contactos-porcelana.csv` como modelo.

## Colunas do template

| Coluna | Obrigatória? | Exemplo | Notas |
|---|---|---|---|
| `nome_completo` | ✅ Sim | Maria Silva | Nome da cliente |
| `telefone` | ✅ Sim | 923456789 ou +244923456789 | **O mais importante** — é a chave única. Aceita formato local ou internacional |
| `email` | Não | maria@exemplo.ao | Se tiveres |
| `instagram` | Não | @maria_silva | Se tiveres |
| `origem` | Não | gestao / faturacao | De que software veio (ajuda a rastrear) |
| `notas` | Não | Cliente de laser desde 2024 | Qualquer observação útil |

## Como exportar

1. **Do software de gestão:** exporta a lista de clientes para CSV (ou Excel → guardar como CSV).
2. **Do software de faturação:** o mesmo.
3. Se conseguires, junta os dois num só ficheiro. Se não, envia os dois separados — nós consolidamos.
4. Não te preocupes com duplicados — o sistema deduplica automaticamente pelo telefone.

## O que acontece depois (do nosso lado)

1. Normalizamos os telefones para o formato internacional (+244...).
2. Removemos duplicados (mesma cliente nos dois softwares = 1 só registo).
3. Geramos um **relatório de conflitos** (ex.: mesmo telefone com nomes diferentes) para tu confirmares.
4. Importamos para o CRM de forma segura.

## Importante (privacidade)

As clientes importadas vão receber, no primeiro contacto, uma mensagem que **permite recusar** comunicações automáticas (basta responderem uma palavra). Isto é conformidade — respeitamos quem não quer ser contactado.

---

*Qualquer dúvida, fala connosco. Quanto mais completo o ficheiro, melhor o sistema funciona.*
