# Cutover Supabase Partilhado — ISILDA

**Data:** 2026-06-01  
**Projecto Supabase:** `achtvzbcczmcbvjkdjry`

## Estado

O tenant da Delicias da Isi foi criado no backend partilhado da Marca Digital.

### Tenant criado

- `slug`: `isilda`
- `tenant_id`: `81bc8777-39f3-477a-8ad6-44f9dcf1eca8`
- `display_name`: `Delicias da Isi CRM`
- `business_name`: `Delicias da Isi`
- `plan`: `growth`
- `status`: `active`
- `db_schema`: `isilda`

### Registos criados/associados

- `tenant_config`: `9fc16231-d909-478a-912a-55915d430814`
- `agent_configs`:
  - agente WhatsApp `isi`
- `usage_metrics`:
  - mês inicial `2026-06-01`
- `tenant_users`:
  - `user_id`: `c3aefafe-7ce8-4da4-9d17-5fe2296a1fc0`
  - `role`: `admin`
- `team_members`:
  - email `ketson85@hotmail.com`
  - nome `Nelson Rodrigues`
  - `role`: `admin`
  - `team`: `comercial`

### Auth

- O utilizador auth existente `ketson85@hotmail.com` foi reaproveitado.
- O `app_metadata.tenant_id` desse utilizador foi actualizado para `81bc8777-39f3-477a-8ad6-44f9dcf1eca8`.
- A password foi actualizada no backend partilhado em 2026-06-01.

## Conclusão Técnica

O backend partilhado **nao** tem as tabelas deste CRM vertical:

- `clientes`
- `pedidos`
- `mensagens_whatsapp`
- `produtos_catalogo`
- `ocasioes_cliente`
- `calendario_producao`

Este repo continua modelado como **standalone / single-tenant**, enquanto o backend partilhado usa um modelo **multi-tenant** com:

- `tenants`
- `tenant_users`
- `team_members`
- `agent_configs`
- `usage_metrics`

## Gap de Integração

Hoje **nao** e seguro apontar o `.env.local` deste repo para o Supabase partilhado, porque:

1. o frontend e hooks ainda fazem `from('clientes')`, `from('pedidos')`, etc.
2. essas tabelas nao existem no schema `public` do backend partilhado
3. o schema `isilda` nao esta exposto via PostgREST
4. as edge functions deste repo assumem a base vertical actual, nao o modelo `tenant_id` / `db_schema`

## Proximo Corte Necessario

1. Mapear tabela-a-tabela entre o modelo ISILDA e o modelo partilhado
2. Decidir se a migracao vai:
   - adaptar este repo ao modelo partilhado, ou
   - criar wrappers/RPCs no backend partilhado para preservar o contrato actual
3. Introduzir contexto de tenant no login, queries e edge functions
4. Validar RLS, auth switching e webhook WhatsApp no tenant `isilda`
5. So depois disso trocar as variaveis locais para o projecto partilhado
