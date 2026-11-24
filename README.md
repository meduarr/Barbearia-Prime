# Barbearia Prime — Site institucional com agendamento online

Site responsivo em **HTML5, CSS3 e JavaScript puro** (sem frameworks), com carrossel, catálogo de cortes com busca, promoção em destaque e **agendamento real com aviso automático no WhatsApp do barbeiro**.

---

## 📁 Estrutura de pastas

```
BarberariaPrime/
├── index.html              → Estrutura da página (todas as seções)
├── css/
│   └── style.css           → Estilos, organizados por seção e com índice
├── js/
│   ├── config.js           → ⚙ CONFIGURAÇÕES (contatos, WhatsApp, horários, URL do servidor)
│   ├── data.js             → Catálogo de cortes/serviços/promoção (nomes, preços, fotos)
│   ├── main.js             → Menu, pesquisa, filtros, carrossel, cards, animações, rodapé
│   └── booking.js          → Sistema de agendamento (dias, horários, validação, envio)
├── apps-script/
│   ├── Code.gs             → Servidor gratuito (Google Apps Script + Planilha Google)
│   └── appsscript.json     → Manifesto do Apps Script (fuso horário, permissões)
└── assets/img/
    ├── logo.png            → Logo da barbearia (corte de cabelo, fundo transparente)
    ├── favicon.png         → Ícone da aba do navegador
    ├── ambiente.jpg        → Foto da seção "Diferenciais"
    ├── carrossel/          → Fotos do banner
    └── servicos/           → Fotos dos cards
```

---

## ▶ Como abrir

Basta abrir o `index.html` no navegador. Para desenvolvimento, recomendo a extensão **Live Server** do VS Code (clique direito no `index.html` → *Open with Live Server*).

Sem configuração, o agendamento funciona em **modo de teste**: as reservas ficam salvas apenas no navegador e um aviso amarelo aparece no formulário. Siga a seção abaixo para ativar o modo real.

---

## ✅ Checklist antes de publicar

O site **não inventa dados da barbearia**. Preencha com as informações reais:

| O quê | Onde |
|---|---|
| Instagram e e-mail (rodapé) | `js/config.js` → `instagram`, `email` |
| WhatsApp do barbeiro | `js/config.js` → `barbeiroWhatsApp` |
| Dias e horários de funcionamento, almoço, duração do atendimento | `js/config.js` **e** `apps-script/Code.gs` (mantenha iguais) |
| Preços dos serviços | `js/data.js` (valores atuais são apenas referência de mercado) |
| Desconto da promoção | `js/data.js` → item `platinado`, campo `desconto` |
| Fotos | `assets/img/` — o ideal é substituir por fotos reais dos trabalhos da barbearia, mantendo os mesmos nomes de arquivo |

Enquanto Instagram/e-mail estiverem vazios, o rodapé mostra “em breve”.

---

## 📲 Ativando o agendamento real + WhatsApp automático

### Como funciona

```
Cliente no site ──► Google Apps Script (servidor gratuito) ──► Planilha Google (agenda)
                                  │
                                  └──► API CallMeBot ──► WhatsApp do barbeiro
```

- A **Planilha Google** guarda todas as reservas — todos os clientes veem os mesmos horários ocupados.
- O servidor usa uma **trava (lock)**: se duas pessoas tentarem o mesmo horário ao mesmo tempo, só a primeira consegue; a segunda recebe o aviso e escolhe outro.
- A mensagem é enviada **pelo servidor**, então a chave da API **não fica exposta** no código do site.
- Tudo é **gratuito**.

### Passo 1 — Obter a chave do CallMeBot (no celular do barbeiro)

1. Acesse **https://www.callmebot.com/blog/free-api-whatsapp-messages/** e veja o número atual do CallMeBot (ele muda de tempos em tempos).
2. Salve esse número nos contatos do celular do barbeiro.
3. Envie para ele, pelo WhatsApp, a mensagem: `I allow callmebot to send me messages`
4. Em poucos minutos chega uma resposta com a sua **apikey** (ex.: `123456`). Guarde-a.

> O CallMeBot só envia mensagens **para o próprio número que fez a ativação** — por isso é ideal para notificar o barbeiro.

### Passo 2 — Criar a planilha e o servidor

1. Acesse **https://sheets.new** (com a conta Google da barbearia) e dê um nome, ex.: *Agenda Barbearia Prime*.
2. No menu: **Extensões → Apps Script**.
3. Apague o conteúdo do arquivo `Código.gs` e cole todo o conteúdo de `apps-script/Code.gs`.
4. (Recomendado) Em **Configurações do projeto** (ícone de engrenagem), marque *“Mostrar arquivo de manifesto appsscript.json”*, abra-o no editor e cole o conteúdo de `apps-script/appsscript.json` (define o fuso `America/Sao_Paulo`).
5. Salve (Ctrl + S).

### Passo 3 — Guardar o número e a chave com segurança

Em **Configurações do projeto → Propriedades do script → Adicionar propriedade**:

| Propriedade | Valor (exemplo) |
|---|---|
| `WHATSAPP_NUMERO` | `5511912345678` (55 + DDD + número, só dígitos) |
| `CALLMEBOT_APIKEY` | a chave recebida no passo 1 |

### Passo 4 — Testar o envio

1. No editor, selecione a função **`testarWhatsApp`** e clique em **Executar**.
2. Na primeira vez o Google pede autorização: *Revisar permissões → escolha a conta → Avançado → Acessar projeto (não seguro) → Permitir*. (O aviso aparece porque o script é seu e não passou por verificação pública — é normal.)
3. O barbeiro deve receber a mensagem de teste no WhatsApp.

### Passo 5 — Publicar o servidor

1. Clique em **Implantar → Nova implantação**.
2. Em *Tipo*, escolha **App da Web**.
3. *Executar como*: **Eu**. *Quem pode acessar*: **Qualquer pessoa**.
4. Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).

### Passo 6 — Conectar o site

Em `js/config.js`:

```js
bookingApiUrl: 'https://script.google.com/macros/s/SEU_ID/exec',
barbeiroWhatsApp: '5511912345678',
```

Pronto! O aviso amarelo de “modo de teste” some, e cada reserva:
1. aparece numa nova linha da aba **Reservas** da planilha;
2. bloqueia o horário para todos os clientes;
3. dispara a mensagem para o WhatsApp do barbeiro:

```
💈 Nova reserva — Barbearia Prime

👤 Cliente: João Silva
📞 Telefone: (11) 98765-4321
✂️ Serviço: Degradê Baixo (Low Fade) (R$ 45,00)
📅 Data: sexta-feira, 20/11/2026
⏰ Horário: 14:30
```

### Gerenciando a agenda

- **Cancelar uma reserva:** na planilha, troque a coluna *Status* para `Cancelado`. O horário volta a ficar livre no site.
- **Coluna WhatsApp:** mostra `Enviado` ou `Falhou` para cada reserva. Se aparecer `Falhou`, confira as propriedades do passo 3 e o menu **Execuções** do Apps Script. A reserva continua válida e o cliente vê no site um botão para enviar a mensagem manualmente.
- **Alterou o `Code.gs`?** Use **Implantar → Gerenciar implantações → ✏ Editar → Versão: Nova versão → Implantar**. Assim a URL continua a mesma.
- **Anti-abuso:** cada telefone pode ter no máximo 3 reservas futuras ativas (ajuste `MAX_RESERVAS_POR_TELEFONE` no `Code.gs`).

### Alternativa profissional: API oficial do WhatsApp (Meta)

O CallMeBot é gratuito e ótimo para pequenos negócios, mas é um serviço de terceiros sem garantia de disponibilidade. Para maior volume ou garantia, use a **WhatsApp Cloud API** da Meta (developers.facebook.com → WhatsApp): crie um app Business, um modelo de mensagem aprovado e um token permanente. Depois, basta trocar o conteúdo da função `enviarWhatsApp_()` no `Code.gs` por uma chamada `UrlFetchApp.fetch` para `https://graph.facebook.com/v.../PHONE_ID/messages`. O restante do sistema não muda.

---

## 🌐 Hospedagem

O site é 100% estático, então funciona em qualquer hospedagem:

- **Netlify** (mais fácil): acesse app.netlify.com/drop e arraste a pasta do projeto.
- **GitHub Pages**: suba os arquivos num repositório → *Settings → Pages*.
- **Vercel**, **Hostinger**, **Locaweb** etc.: envie os arquivos para a pasta pública.

A pasta `apps-script/` não precisa ir para a hospedagem (ela vive no Google), mas não há problema se for — não contém segredos.

---

## 🎨 Personalização rápida

- **Cores, fontes e medidas:** variáveis no topo de `css/style.css` (`:root`).
- **Slides do carrossel:** blocos `<article class="slide">` no `index.html`; tempo de troca em `INTERVALO` no `js/main.js`.
- **Novo corte/serviço:** adicione um objeto em `js/data.js` — card, busca e formulário são atualizados automaticamente.
- **Frase de impacto:** seção `manifesto` no `index.html`.

## ♿ Acessibilidade e desempenho

- Navegação por teclado (setas no carrossel, Esc fecha menu/modal), link “pular para o conteúdo”, rótulos ARIA.
- Respeita a preferência do sistema por menos animações (`prefers-reduced-motion`).
- Imagens com carregamento preguiçoso (`loading="lazy"`) e autoplay pausado quando a aba não está visível.

## 📷 Créditos das imagens

Fotos do [Unsplash](https://unsplash.com), sob a [Licença Unsplash](https://unsplash.com/license) (uso comercial permitido, sem necessidade de atribuição). São imagens **ilustrativas** — recomenda-se substituí-las por fotos reais dos trabalhos da barbearia.

---

Desenvolvido por **ME**.
