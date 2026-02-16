# 🔑 Obter Vercel Token em 1 Minuto

## ⚡ Passos Rápidos:

### 1️⃣ Abre este Link:
```
https://vercel.com/account/tokens
```

### 2️⃣ Clica: "Create Token"

### 3️⃣ Preenche:
- **Token name:** `GitHub Auto-Deploy`
- **Expiration:** `No expiration` (recomendado) ou escolhe data

### 4️⃣ Clica: "Create"

### 5️⃣ **COPIA O TOKEN** (aparece apenas uma vez!)
```
Exemplo de token:
abcd1234efgh5678ijkl9012mnop3456
```

## 📝 Enviar o Token para Claude:

Depois de obteres o token, fornece-o aqui para eu fazer o deployment automático.

Ou, se preferires fazer manualmente:

```bash
export VERCEL_TOKEN="teu_token_aqui"
vercel deploy --prod
```

---

**⏱️ Tempo:** 1 minuto
**Segurança:** Token é único e privado
**Revogar:** Volta a https://vercel.com/account/tokens e delete

Depois de teres o token, o deployment é automático! 🚀
