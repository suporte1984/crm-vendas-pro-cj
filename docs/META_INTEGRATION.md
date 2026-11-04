# Integração Meta WhatsApp Business Cloud API & Instagram Direct

Este projeto inclui suporte nativo a canais de atendimento oficial da Meta:

- **WhatsApp Oficial (Cloud API)**
- **Instagram Direct Messages**

## 1. Visão Geral da Arquitetura

1. **Webhook Universal**:
   - `GET /backend/v1/channels/meta/webhook`: verificação automática do webhook (`hub.challenge` com verificação de `META_VERIFY_TOKEN`).
   - `POST /backend/v1/channels/meta/webhook`: recebimento de mensagens e mídias de WhatsApp e Instagram, vinculação automática a contatos existentes (por telefone) ou criação automática de novos contatos/leads, criação da conversa e registro da mensagem com contador de não lidas.

2. **Envio de Mensagens**:
   - `POST /backend/v1/channels/meta/send`: despacho oficial para a Graph API da Meta (`https://graph.facebook.com/v21.0/`).
   - Se as credenciais ainda não estiverem cadastradas nos Segredos do backend, o sistema entra defensivamente em **Modo de Teste**, gravando a mensagem no CRM para visualização sem quebrar o fluxo do atendente.

---

## 2. Segredos do Backend (Configuração)

Para ativar o envio e recebimento real, configure as seguintes variáveis no painel de segredos do backend ou via `set_env`:

| Nome do Segredo             | Descrição                                                                                     | Exemplo                               |
| --------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- |
| `META_VERIFY_TOKEN`         | Token de verificação definido por você ao cadastrar o webhook no Meta for Developers          | `crm_adapta_meta_webhook_secret_2026` |
| `META_WHATSAPP_TOKEN`       | Token de Acesso do Sistema (Permanente ou de Teste) com escopos `whatsapp_business_messaging` | `EAA...`                              |
| `META_PHONE_NUMBER_ID`      | Identificador do número de telefone WhatsApp no Gerenciador do WhatsApp                       | `104839281728192`                     |
| `META_INSTAGRAM_TOKEN`      | Token de Acesso da Página vinculada à conta do Instagram Direct                               | `EAA...`                              |
| `META_INSTAGRAM_ACCOUNT_ID` | ID da conta profissional do Instagram                                                         | `178414000000000`                     |

---

## 3. Passo a Passo no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com) e crie um app do tipo **Negócios (Business)**.
2. Adicione os produtos **WhatsApp** e/ou **Instagram Graph API**.
3. No painel de Webhooks:
   - Configure a URL de Callback apontando para a sua instância PocketBase:
     `https://<sua-url-backend>/backend/v1/channels/meta/webhook`
   - Preencha o **Token de Verificação** com o mesmo valor configurado em `META_VERIFY_TOKEN`.
   - Assine os campos:
     - WhatsApp: `messages`
     - Instagram: `messages`
4. Obtenha o Token de Acesso Permanente em **Configurações do Negócio > Usuários do Sistema** e vincule os ativos (Número WhatsApp e Página do Instagram).

---

## 4. Telas do CRM

- **/channels (Conexões)**: Listagem de canais com status, filtro por tipo, busca, cards idênticos à referência visual (Tipo, Status, Conexão, Número conectado, Ações).
- **/channels/new (Criar conexão)**: Seleção do tipo de canal (WhatsApp, WhatsApp Oficial Cloud API, Instagram).
- **/channels/new/form (Configurar Nova Conexão)**: Formulário completo com nome, equipe padrão, funil padrão, automação de funil ao abrir/fechar chat, status ativo/inativo, visibilidade, assinatura personalizável com `{{nickname}}` e rejeição de chamadas.
- **/inbox (Caixa de Entrada)**: Interface split com lista de conversas, contador de mensagens não lidas, histórico do chat em tempo real, envio de respostas e indicação de Modo de Teste / Credenciais Meta.
