# Guia de Implantação em Nuvem: VAYKO FLEET (Supabase + Vercel) 🚚

Este guia orienta você a conectar o sistema ao banco de dados em nuvem **Supabase** integrado diretamente na **Vercel** (exatamente o mesmo padrão utilizado no projeto **Thcontrol**), permitindo que a Célia e a equipe acessem o painel de qualquer computador ou celular de forma compartilhada e em tempo real.

---

## Passo 1: Conectar o Supabase na Vercel (ou criar projeto no Supabase)

1. Acesse o seu painel da **[Vercel](https://vercel.com)** e abra o projeto **`mbslog-sistema`**.
2. No menu superior do projeto, clique na aba **Storage**.
3. Clique em **"Create Database"** ou **"Connect Store"** e selecione **Supabase**.
4. Conecte com a sua conta do Supabase e conclua a criação.
5. Você receberá duas informações:
   * **Project URL** (ex: `https://xyzcompany.supabase.co`)
   * **Anon Key** (chave pública anônima)

*(Dica: Se preferir criar direto no [supabase.com](https://supabase.com), basta criar um novo projeto lá e ir em Project Settings > API para pegar a URL e a Anon Key).*

---

## Passo 2: Criar as Tabelas no Supabase

1. No painel do seu projeto no Supabase, clique no menu lateral em **SQL Editor**.
2. Abra o arquivo [`sistema/supabase_schema.sql`](file:///C:/Users/thiago.rodrigues/.gemini/antigravity/scratch/projeto-2/sistema/supabase_schema.sql).
3. Copie todo o conteúdo do arquivo, cole no SQL Editor do Supabase e clique em **RUN**.
4. Pronto! Ele criará automaticamente as tabelas `vehicles`, `drivers` e `trips` com sincronização em tempo real habilitada.

---

## Passo 3: Colocar as Chaves no Sistema

Abra o arquivo [`sistema/config-db.js`](file:///C:/Users/thiago.rodrigues/.gemini/antigravity/scratch/projeto-2/sistema/config-db.js) e preencha:

```javascript
const SUPABASE_URL = "SUA_URL_DO_SUPABASE_AQUI";
const SUPABASE_ANON_KEY = "SUA_ANON_KEY_DO_SUPABASE_AQUI";
```

Assim que preenchido, envie o arquivo atualizado para a Vercel e o sistema passará a operar instantaneamente em tempo real na nuvem!
