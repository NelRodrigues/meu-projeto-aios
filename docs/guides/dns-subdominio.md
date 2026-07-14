# Guia — Criação do subdomínio do SIC (Global Minds)

**Para:** Rinaldo / Ana (Global Minds) · **De:** Marca Digital
**Objectivo:** apontar um subdomínio do vosso site para o sistema SIC, para que ele fique alojado no vosso domínio (`...globalmindsconsultoria.com`) — cumpre a decisão da acta de kick-off.

---

## O que precisamos de vós

Criar **um registo DNS** no vosso fornecedor de domínio (onde comprastes/gerem o `globalmindsconsultoria.com`). É um passo de 2 minutos — enviamos aqui os valores exactos.

### Subdomínio proposto

```
sic.globalmindsconsultoria.com
```

*(Se preferirem outro nome — ex.: `crm.` ou `app.` — é só dizer; ajustamos.)*

---

## Registo DNS a criar

No painel do vosso domínio, secção **DNS / Zona DNS**, criem **um registo CNAME**:

| Campo | Valor |
|---|---|
| **Tipo** | `CNAME` |
| **Nome / Host** | `sic` *(só a palavra `sic`, não o domínio inteiro)* |
| **Valor / Destino / Aponta para** | `cname.vercel-dns.com` |
| **TTL** | Automático (ou 3600) |
| **Proxy** (se usarem Cloudflare) | **Desligado** (nuvem cinzenta, "DNS only") |

> ⚠️ Se o vosso painel exigir o domínio completo no campo "Nome", usem `sic.globalmindsconsultoria.com`.

---

## Depois de criarem

1. **Avisem-nos** (grupo de WhatsApp do projecto) que o registo foi criado.
2. Nós adicionamos o domínio do vosso lado na plataforma de alojamento e o **SSL (cadeado de segurança) é emitido automaticamente** — normalmente em minutos.
3. A propagação do DNS pode demorar **até algumas horas** (raramente 24h); testamos e confirmamos convosco quando estiver no ar.

---

## Perguntas frequentes

**Isto afecta o nosso site actual?**
Não. Um subdomínio (`sic.`) é independente do `www.` e do domínio principal — o vosso site continua igual.

**Quem fica dono disto?**
Vós. O subdomínio é do vosso domínio, e a base de dados do sistema é vossa (projecto dedicado, exportável) — como acordado.

**E se preferirmos não usar subdomínio agora?**
Sem problema. O sistema funciona já num endereço provisório (`sic-global-minds.vercel.app`) enquanto o subdomínio não estiver pronto. O subdomínio pode ser ligado a qualquer momento, sem interromper o serviço.

---

*Marca Digital · Consultoria AI First · Luanda, Angola · comercial@marcadigital.ao*
