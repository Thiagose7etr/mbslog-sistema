# Guia de Implantação em Nuvem: Sistema MBSLOG 🚚

Este guia orienta você a conectar o protótipo ao banco de dados em nuvem da Google (Firebase) e a publicar o sistema na internet (Vercel) gratuitamente, permitindo que a Célia e a equipe acessem o painel de qualquer computador ou celular de forma compartilhada.

---

## Passo 1: Configurar o Banco de Dados em Nuvem (Firebase)

O **Firebase Firestore** é um banco de dados NoSQL gratuito oferecido pela Google. Ele sincroniza dados em tempo real entre todos os dispositivos conectados.

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) com sua conta Google.
2. Clique em **"Adicionar projeto"** (ou "Add project").
3. Digite o nome do projeto (ex: `MBSLOG-Vayko`) e clique em **Continuar**.
4. Desative o Google Analytics para este projeto (opcional, para acelerar a criação) e clique em **Criar projeto**. Aguarde a conclusão e clique em **Continuar**.
5. Na tela inicial do projeto, clique no ícone de **Web** (`</>`) localizado logo abaixo do nome do projeto para registrar o aplicativo.
6. Diga o apelido do aplicativo (ex: `MBSLOG Web`) e clique em **Registrar app**.
7. O Firebase exibirá um bloco de código contendo o objeto `firebaseConfig`. Copie apenas os valores de dentro deste objeto. Ele se parecerá com isto:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "mbslog-vayko.firebaseapp.com",
     projectId: "mbslog-vayko",
     storageBucket: "mbslog-vayko.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef..."
   };
   ```
8. Abra o arquivo [`sistema/config-db.js`](file:///C:/Users/thiago.rodrigues/.gemini/antigravity/scratch/projeto-2/sistema/config-db.js) no seu editor de código e cole os valores copiados substituindo os placeholders.
9. No menu lateral esquerdo do console do Firebase, clique em **Compilação** (Build) > **Cloud Firestore** e depois em **Criar banco de dados** (Create database).
10. Escolha a localização do banco (sugerido: `nam5-us-central` ou `southamerica-east1` no Brasil) e clique em **Avançar**.
11. Selecione **Iniciar em modo de teste** (para que qualquer dispositivo conectado possa ler/gravar dados sem login inicial) e clique em **Criar**.
12. Pronto! O banco de dados está no ar e conectado ao seu código.

---

## Passo 2: Publicar o Sistema na Nuvem (Hospedagem Vercel)

A **Vercel** permite hospedar páginas web de forma 100% gratuita com excelente desempenho.

### Opção A: Pelo Terminal (Mais rápida se você tiver o CLI instalado)
1. Instale o CLI da Vercel no seu computador executando no terminal:
   ```bash
   npm install -g vercel
   ```
2. Abra a pasta do sistema no terminal:
   ```bash
   cd C:\Users\thiago.rodrigues\.gemini\antigravity\scratch\projeto-2\sistema
   ```
3. Digite o comando de publicação:
   ```bash
   vercel
   ```
4. Responda às perguntas no terminal (pode aceitar os padrões sugeridos clicando Enter).
5. Pronto! A Vercel fornecerá um link público instantaneamente (ex: `sistema-mbslog.vercel.app`).

### Opção B: Pelo Navegador (Sem instalar nada)
1. Crie uma conta gratuita em [Vercel.com](https://vercel.com).
2. Conecte sua conta do GitHub.
3. Crie um repositório no GitHub chamado `mbslog-sistema` e faça o upload de todos os arquivos da pasta [`sistema/`](file:///C:/Users/thiago.rodrigues/.gemini/antigravity/scratch/projeto-2/sistema) para lá.
4. No painel da Vercel, clique em **"Add New"** > **Project** e importe o repositório `mbslog-sistema` recém-criado.
5. Clique em **Deploy**. O deploy terminará em segundos e você receberá o link para acessar no celular ou compartilhar com a Célia!

---

*Criado pela equipe de engenharia da VAYKO LABS.*
