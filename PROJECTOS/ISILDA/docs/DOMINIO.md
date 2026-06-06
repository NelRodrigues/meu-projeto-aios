# Domínio de Produção — CRM Delicias da Isi

**URL oficial:** https://delicias-isi.vercel.app

> URL anterior `isilda-nine.vercel.app` mantém-se activo (alias do mesmo projecto Vercel `isilda`).

## Onde o domínio é usado
- **Vercel:** domínio adicionado ao projecto `isilda` (atribuído a cada deploy de produção).
- **Env var:** `NEXT_PUBLIC_SITE_URL=https://delicias-isi.vercel.app` (Vercel produção + `.env.local`).
- **Login:** email + palavra-passe (não usa redirect OAuth → funciona em qualquer domínio).
- **Webhook WhatsApp (uazapi):** aponta para a edge function Supabase
  `https://achtvzbcczmcbvjkdjry.supabase.co/functions/v1/isilda-agent` — **não depende do domínio do CRM**.

## Notas
- O nome do package (`delicias-da-isi-crm`) e o tenant slug (`isilda`) não mudam.
- Backend partilhado SIC GERAL: `achtvzbcczmcbvjkdjry` · tenant `81bc8777-39f3-477a-8ad6-44f9dcf1eca8`.
