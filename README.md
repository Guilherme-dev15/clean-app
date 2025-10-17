# Limpeza Fácil - Sistema de Gestão Empresarial (ERP/PDV)

![Capa do Projeto](https://placehold.co/1200x600/16a34a/white?text=Limpeza+Fácil+ERP)

**Sistema completo de gestão (ERP) e Ponto de Venda (PDV) desenvolvido sob medida para uma distribuidora de produtos de limpeza, centralizando todas as operações de vendas, estoque, finanças e relacionamento com o cliente em uma única plataforma moderna e reativa.**

---

### Visão Geral do Projeto

Este projeto foi concebido e desenvolvido integralmente por mim para um cliente real e está atualmente em produção, otimizando o dia a dia da empresa. O sistema foi arquitetado para ser uma solução completa, substituindo planilhas e processos manuais por uma interface de usuário intuitiva e um backend robusto e em tempo real.


---

### ✨ Demonstração em Vídeo

Assista a um tour completo pelas funcionalidades do sistema, desde uma venda no PDV até a geração de relatórios gerenciais.

_[Link para um vídeo de demonstração no YouTube ou Vimeo - Grave um vídeo de 2-3 minutos mostrando os fluxos principais!]_

---

### 🚀 Funcionalidades em Destaque

Abaixo, algumas das principais funcionalidades do sistema, ilustradas com screenshots e GIFs.

| GIF/Imagem | Descrição Detalhada |
| :---: | --- |
| ![Demonstração](./preview/pdv.gif) | **Ponto de Venda (PDV) Inteligente e Rápido:** Um fluxo de venda otimizado que permite adicionar produtos ao carrinho, ajustar quantidades, selecionar clientes e escolher múltiplos métodos de pagamento, incluindo "Fiado" (venda a prazo). O estoque dos produtos é atualizado em tempo real a cada venda finalizada. |
| _[INSIRA AQUI UM GIF GERANDO UM ORÇAMENTO]_ | **Gerador de Orçamentos Profissionais em PDF:** Uma ferramenta que permite criar orçamentos personalizados para clientes, adicionando produtos, definindo condições comerciais e gerando um documento PDF profissional com um clique, utilizando a biblioteca `pdfmake`. |
| _[INSIRA AQUI UM GIF NAVEGANDO NOS RELATÓRIOS]_ | **Relatórios Gerenciais Dinâmicos:** Painel de relatórios completo com filtros por período para análise de vendas, despesas, lucratividade por produto e performance de clientes. Os dados podem ser exportados para planilhas XLSX para análises mais aprofundadas. |
| _[INSIRA AQUI UMA SCREENSHOT DO DASHBOARD]_ | **Dashboard Principal com Indicadores Chave:** A tela inicial apresenta um resumo diário das métricas mais importantes do negócio: total de vendas, clientes atendidos, produtos com estoque baixo e o valor total a receber de clientes. |
| _[INSIRA AQUI UMA SCREENSHOT DA GESTÃO DE PRODUTOS]_ | **Gestão Completa de Produtos e Estoque:** Interface para CRUD de produtos, com controle de preço de venda, preço de custo, estoque atual e estoque mínimo. O sistema emite alertas visuais para produtos que atingem o nível mínimo de estoque, além de permitir ajustes manuais e registrar todo o histórico de movimentação. |
| _[INSIRA AQUI UMA SCREENSHOT DA GESTÃO DE COMPRAS]_ | **Controle de Compras e Fornecedores:** Módulo para gerenciar fornecedores e criar ordens de compra. [cite_start]Ao receber uma compra, o sistema atualiza automaticamente o estoque dos produtos correspondentes, mantendo a integridade dos dados[cite: 1]. |
| _[INSIRA AQUI UMA SCREENSHOT DO CRM]_ | **CRM e Gestão de Contas a Receber:** Além do cadastro de clientes, o sistema funciona como um CRM básico, registrando o histórico de compras e controlando o saldo devedor (dívidas de vendas "Fiado"), que é atualizado automaticamente. |
| _[INSIRA AQUI UMA SCREENSHOT DO FLUXO DE CAIXA]_ | **Fluxo de Caixa Diário e Mensal:** Ferramenta para acompanhamento do fluxo de caixa, mostrando o balanço de entradas (vendas) e saídas (despesas) tanto para o dia corrente quanto para qualquer mês selecionado. |

---

### 🛠️ Arquitetura e Tecnologias Utilizadas

A aplicação foi construída utilizando uma stack moderna, focada em performance, escalabilidade e desenvolvimento ágil.

| Categoria | Tecnologia/Ferramenta | Descrição |
| --- | --- | --- |
| **Frontend** | React 19, TypeScript, Vite | Uma base reativa e tipada para uma interface de usuário rápida e manutenível. |
| **Estilização** | Tailwind CSS | Abordagem *utility-first* para um design consistente e responsivo, desenvolvido de forma ágil. |
| **Backend & Banco de Dados** | Firebase (Firestore, Auth) | Solução *serverless* do Google que garante sincronização de dados em tempo real (`onSnapshot`), autenticação segura e persistência de dados offline (`enableIndexedDbPersistence`), crucial para a estabilidade do PDV. |
| **Estado Global** | React Context API | Gerenciamento de estado centralizado e simplificado através de um `AppContext`, provendo dados como produtos, clientes e fornecedores para todos os componentes. |
| **Relatórios e Gráficos** | Recharts, xlsx (SheetJS) | Visualização de dados com gráficos interativos na tela de Relatórios e capacidade de exportação para o formato Excel. |
| **Geração de Documentos** | pdfmake | Criação de orçamentos em PDF do lado do cliente, com layout profissional e dinâmico. |
| **Estrutura de Código** | Custom Hooks, Componentes Modulares | A lógica de negócio foi abstraída em hooks customizados (ex: `useReports`, `useDashboardData`) para máxima reutilização e separação de responsabilidades. |

---

### 👨‍💻 Autor

**[Guilherme Anjos]**

* **LinkedIn:** https://pt.linkedin.com/
* **GitHub:** https://www.youtube.com/watch?v=TsaLQAetPLU
* **Portfólio:** https://pt.wix.com/portfolio-online

---

### 📄 Licença

Este projeto é de minha autoria intelectual e licenciado para uso exclusivo do cliente final. Todos os direitos são reservados.