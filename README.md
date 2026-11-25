# Cadastro de Máquinas · Triple R · PROativa

**Endereço do app:** https://proativaeng.github.io/cadastro-maquinas/

## Para que serve

O Cadastro de Máquinas reúne num só lugar o histórico das coletas de óleo feitas nas máquinas dos nossos clientes.

Em campo, o técnico registra cada coleta pelo celular, com as medições, o status da máquina, fotos e documentos. Ao salvar, o app gera o relatório em PDF e guarda tudo no SharePoint da empresa, organizado por cliente e máquina.

Com isso:

- **Fim das fichas em papel e planilhas soltas:** cada máquina tem o histórico completo, com data, responsável e status de cada coleta.
- **Visão rápida da situação:** o status em cores (Normal, Atenção, Crítico) e o gráfico da ISO 4406 mostram como a máquina evolui ao longo do tempo.
- **Relatório pronto na hora:** o PDF é gerado no momento em que a coleta é salva.
- **Funciona sem internet:** dá para registrar a coleta em locais sem sinal e enviar depois.
- **Tudo no SharePoint:** dados, fotos e relatórios ficam na pasta "Fichas de maquinas", acessíveis para toda a equipe.

## Quem pode usar

Qualquer pessoa com conta Microsoft da Triple R (`@trbrasil.onmicrosoft.com`). Todos os usuários veem todos os clientes.

## Instalar no celular

O app não está na Play Store nem na App Store. Ele é instalado direto pelo navegador:

- **Android:** abra o endereço do app no **Chrome** › toque no menu **⋮** › **Instalar app** (ou **Adicionar à tela inicial**).
- **iPhone:** abra o endereço no **Safari** › toque em **Compartilhar** › **Adicionar à Tela de Início**.

O ícone da Triple R aparece na tela do celular e o app abre em tela cheia, como qualquer outro aplicativo.

No computador, basta abrir o endereço no navegador.

## Primeiro acesso

1. Abra o app e toque em **Entrar com a conta Microsoft**.
2. Escolha a sua conta da Triple R. Se o celular ainda não tiver a conta, digite o e-mail e a senha de sempre.
3. Pronto: o app carrega os clientes já cadastrados.

Você continua conectado nas próximas vezes. Seu nome aparece no canto superior direito. Para sair, toque no ícone de sair ao lado do nome e toque de novo para confirmar.

## Como o app está organizado

```
Clientes  ›  Máquinas do cliente  ›  Histórico de coletas da máquina  ›  Coleta
```

### Clientes

- Lista de todos os clientes, com busca por nome ou cidade.
- Toque em **+ Cliente** para cadastrar: nome, CNPJ, cidade, UF, contato, telefone e e-mail.

### Máquinas

- Ao tocar num cliente, aparecem as máquinas dele.
- Cada máquina mostra a **data da última coleta** e o **status**. Máquina que ainda não teve coleta aparece com o selo cinza "Sem coleta".
- Toque em **+ Máquina** para cadastrar: nome, modelo e fabricante.

### Histórico da máquina

- **Gráfico da ISO 4406:** mostra a evolução da contaminação nas coletas.
- **Linha do tempo:** todas as coletas, da mais recente para a mais antiga, com status, ISO e contaminantes.
- Toque em **+ Nova coleta** para registrar uma nova.

## Registrar uma coleta

| Campo | Como preencher |
| --- | --- |
| Nº da coleta | Obrigatório. Número da amostra. |
| Data | Obrigatório. Já vem com a data de hoje. |
| Usuário | Preenchido sozinho com quem está conectado. |
| Temperatura (°C) e Pressão (bar) | Medições no momento da coleta. |
| Contaminantes | Pode ter mais de um. Escolha uma sugestão ou digite e toque em **＋**. Para tirar, toque no **✕** da etiqueta. |
| ISO 4406 | Código no formato 18/16/13. |
| Volume de óleo (L) e Tipo de óleo | O tipo de óleo sugere os valores já usados. |
| Conexão de pressão, Conexão de retorno e Tensão | Também sugerem os valores já usados, e aceitam valor novo. |
| Status | Obrigatório: **Normal** (verde), **Atenção** (laranja) ou **Crítico** (vermelho). |
| Observações | Texto livre. |

### Fotos e documentos

Toque em **+ Anexar arquivo**. O celular oferece:

- **Câmera:** para fotografar na hora.
- **Arquivos ou galeria:** para escolher fotos já tiradas ou documentos (laudos, planilhas, PDFs).

As **fotos** aparecem na **pré-visualização** logo acima do botão Salvar, entram no relatório PDF e podem ser removidas no **✕** antes de salvar. São até 10 fotos por coleta.

Os **documentos** aparecem na lista de anexos e ficam guardados na pasta da coleta.

### Salvar

Toque em **Salvar e gerar relatório**. O app:

1. Guarda a coleta.
2. Gera o relatório em PDF, com os dados, as fotos e espaço para assinaturas.
3. Envia tudo para o SharePoint.

## Consultar, editar e excluir uma coleta

Toque na coleta no histórico da máquina para ver todos os dados, as fotos e os anexos.

- **Ver relatório PDF:** abre o relatório dentro do app.
- **Gerar relatório novamente:** refaz o PDF com os dados atuais.
- **Editar:** botão de edição no topo da tela. Dá para mudar os dados, anexar mais fotos e documentos e **excluir imagens já salvas** (toque no **✕** da imagem na pré-visualização). Ao salvar, o relatório é gerado de novo e as imagens excluídas também são apagadas do SharePoint.
- **Excluir coleta:** pede confirmação antes de apagar.

## Usar sem internet

O app funciona mesmo sem sinal, como numa área industrial ou subsolo.

- Sem internet, a coleta, as fotos e o PDF ficam guardados no celular. A barra do topo avisa quantas alterações estão esperando envio.
- Quando o sinal voltar, toque em **Sincronizar** para enviar tudo ao SharePoint.
- Com internet, o envio é automático logo após salvar.
- Os dados já baixados continuam no celular para consulta, mesmo offline.

**Atenção:** não desinstale o app nem limpe os dados do navegador antes de sincronizar, ou as coletas ainda não enviadas serão perdidas.

## Onde ficam os arquivos

Na pasta **Fichas de maquinas** do SharePoint (Documentos › OPERACIONAL › Laboratório), organizados assim:

```
Fichas de maquinas/
  Nome do Cliente/
    Nome da Máquina/
      2026-11-25_coleta-0148/
        prensa-01_2026-11-25_01.jpg
        prensa-01_2026-11-25_02.jpg
        relatorio_coleta-0148.pdf
        anexos/
          laudo.pdf
```

## Dúvidas frequentes

**O app pede login toda vez?**
Não. Você continua conectado até tocar em sair.

**Apareceu "Erro ao sincronizar". O que faço?**
Confira a internet e toque em **Sincronizar** de novo. Nada é perdido: as alterações continuam guardadas no celular até o envio dar certo.

**Duas pessoas podem mexer na mesma máquina?**
Sim. Todos veem os mesmos clientes e máquinas, e cada coleta guarda quem a registrou.

**O app atualiza sozinho?**
Sim. Quando há uma versão nova, basta fechar e abrir o app com internet.

## Suporte

Dúvidas ou problemas: fale com o João Dantas.

Documentação técnica (para quem mantém o app): [TECNICO.md](TECNICO.md).
