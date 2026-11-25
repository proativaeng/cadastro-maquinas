# Cadastro de Máquinas (PWA) · Triple R · PROativa

App web instalável (PWA) para cadastrar clientes, máquinas e coletas de óleo, com login Microsoft, modo offline e sincronização com o SharePoint.

Conceito visual aprovado: https://claude.ai/artifact/1F8tgMkidUFrxJG4fTM3Y3

## Decisões do projeto (25/11/2026)

- **Login:** só contas do tenant TRBrasil (`@trbrasil.onmicrosoft.com`), via Microsoft Entra ID (MSAL).
- **Hospedagem:** fica com o João. Qualquer hospedagem de arquivos estáticos com HTTPS serve.
- **Acesso:** todos os usuários veem todos os clientes. Coletas podem ser editadas e excluídas.
- **Dados:** 3 listas do SharePoint no mesmo site da pasta (canal Triple RRR · ProAtiva), criadas pelo próprio app no primeiro uso: `FM_Clientes`, `FM_Maquinas`, `FM_Coletas`.
- **Arquivos:** pasta indicada pelo link abaixo, organizada como `Cliente / Máquina / AAAA-MM-DD_coleta-NUM / (fotos, anexos, relatório PDF)`.
  - Link da pasta: https://trbrasil.sharepoint.com/:f:/s/home/IgA0SNtCds-9TaLycOME_Sw3AacEAeT05P7n0mxeHr-P-ts?e=AqdeVE
  - Fotos: `maquina_AAAA-MM-DD_01.jpg`, reduzidas para até 1600 px.
- **Máquina (fixo, editável):** Nome, Modelo, Fabricante.
- **Coleta (histórico):** Nº da coleta (manual), Data, Usuário (conta logada), Temperatura, Pressão, Contaminantes (um ou mais), ISO 4406, Volume de óleo, Tipo de óleo, Conexão de pressão, Conexão de retorno, Tensão, Status, Observações, Fotos, Anexos.
- **Campos com sugestão:** Tipo de óleo, Conexões, Tensão e Contaminante mostram valores já usados e aceitam valor novo.
- **Status (manual, obrigatório):** Normal (verde), Atenção (laranja), Crítico (vermelho). Máquina sem coleta aparece com selo cinza "Sem coleta".
- **Relatório:** PDF gerado ao salvar a coleta, salvo na pasta da coleta e aberto no app ao tocar na coleta.
- **Offline:** tudo fica no aparelho (IndexedDB). Online, cada alteração sobe na hora. Offline, o técnico toca em **Sincronizar** quando voltar o sinal. Dados baixados não são apagados.
- **Registro de usuário:** toda coleta grava o usuário logado; as listas guardam "Criado por" e "Modificado por".
- **Fora da versão 1:** QR code, envio de e-mail, filtros avançados.

## Estrutura dos arquivos

| Arquivo | Função |
| --- | --- |
| `index.html` | Página única do app |
| `config.js` | **Editar aqui:** IDs do Entra e link da pasta |
| `styles.css` | Visual (claro, marinho + verde PROativa) |
| `data.js` | Banco local (IndexedDB), Microsoft Graph e sincronização |
| `app.js` | Telas e navegação |
| `pdf.js` | Relatório PDF da coleta |
| `sw.js` | Service worker (funciona offline) |
| `manifest.webmanifest`, `icons/` | Instalação no celular |

Sem `clientId` em `config.js`, o app abre em **modo demonstração**: dados de exemplo, salvos só no navegador.

## Registro feito (25/11/2026)

- App **Cadastro de Máquinas** no Entra, conta única (Triple R), SPA.
- ID do aplicativo: `1a476634-931d-4e1d-a646-3045aa5fe599` · Locatário: `596a1584-d550-46d2-81c8-604438f498be`
- URI de redirecionamento atual: `http://localhost:8770/`. **Ao hospedar, adicione o endereço final** em Authentication › SPA.

## Passo a passo para colocar no ar

### 1. Registrar o app no Microsoft Entra ID (uma vez, como administrador)

1. Abra https://entra.microsoft.com › **Identidade** › **Aplicativos** › **Registros de aplicativo** › **Novo registro**.
2. Nome: `Cadastro de Máquinas`. Tipos de conta: **Somente contas deste diretório organizacional**.
3. URI de redirecionamento: plataforma **SPA (aplicativo de página única)**, com o endereço onde o app vai ficar (ex.: `https://maquinas.trbrasil.com.br/`). Para testes locais, adicione também `http://localhost:8770/`.
4. Copie o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)** para `config.js`.
5. Em **Permissões de API** › **Adicionar** › **Microsoft Graph** › **Permissões delegadas**: `User.Read`, `Sites.ReadWrite.All`, `Sites.Manage.All`.
6. Clique em **Conceder consentimento do administrador para TRBrasil**.

`Sites.Manage.All` só é usada no primeiro acesso, para o app criar as 3 listas. Depois pode ser removida.

### 2. Publicar os arquivos

Copie a pasta `pwa/` inteira para a hospedagem (precisa ser HTTPS). O endereço tem que ser igual ao URI de redirecionamento do passo 1.

### 3. Primeiro acesso

Entre com a conta de administrador. O app encontra a pasta pelo link, cria as listas `FM_Clientes`, `FM_Maquinas` e `FM_Coletas` no mesmo site e começa a funcionar.

### 4. Instalar no celular

- **Android (Chrome):** abra o endereço › menu ⋮ › **Instalar app**.
- **iPhone (Safari):** abra o endereço › **Compartilhar** › **Adicionar à Tela de Início**.

## Testar no computador

Na pasta `pwa/`, rode um servidor local, por exemplo:

```powershell
npx --yes http-server -p 8770 -c-1
```

Depois abra http://localhost:8770/.
