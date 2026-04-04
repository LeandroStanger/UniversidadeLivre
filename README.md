# Universidade Livre

[![GitHub Pages](https://img.shields.io/badge/Site_Online-Universidade_Livre-blue?style=for-the-badge&logo=githubpages)](https://leandrostanger.github.io/UniversidadeLivre/)
[![GitHub](https://img.shields.io/badge/Repositório-GitHub-black?style=for-the-badge&logo=github)](https://github.com/LeandroStanger/UniversidadeLivre)

Plataforma institucional da Universidade Livre, oferecendo informações sobre cursos de graduação (com ênfase em Matemática), programas de pós-graduação, corpo docente, pesquisa e extensão. Desenvolvido com design responsivo para desktop e dispositivos móveis.

## Acesso Online

O projeto está disponível publicamente e pode ser acessado diretamente pelo navegador:

[https://leandrostanger.github.io/UniversidadeLivre/](https://leandrostanger.github.io/UniversidadeLivre/)

Não é necessário instalação para visualização.

## Descrição

O site Universidade Livre foi concebido como um ambiente de divulgação acadêmica de acesso livre. Apresenta a estrutura da universidade, os cursos de graduação (com destaque para o curso de Matemática – Licenciatura e Bacharelado), os programas de pós-graduação (mestrado e doutorado em Matemática Aplicada, Ensino de Matemática e áreas correlatas), além de notícias, eventos e formulário de contato.

O projeto é totalmente estático, construído com tecnologias web padrão, e serve como base para portfólios educacionais ou para evolução para sistemas mais complexos.

## Tecnologias Utilizadas

- HTML5
- CSS3 (layout responsivo com Flexbox e Grid)
- JavaScript (ES6+)
- JSON (para dados de cursos e docentes, quando aplicável)
- GitHub Pages (hospedagem)

## Funcionalidades

Com base na proposta do projeto, as funcionalidades implementadas são:

- Página institucional com missão, visão e valores.
- Catálogo de cursos de graduação, com detalhes do **Curso de Matemática** (disciplinas, carga horária, perfil do egresso).
- Seção de **pós-graduação** (mestrado e doutorado) com linhas de pesquisa e corpo docente.
- Listagem de professores e suas áreas de atuação.
- Agenda de eventos e calendário acadêmico.
- Formulário de contato (front-end, com validação básica).
- Design responsivo – adapta-se a celulares, tablets e desktops.
- Navegação intuitiva via menu suspenso ou hambúrguer em telas pequenas.

## Como Executar Localmente

Caso deseje baixar o código-fonte e executar em seu próprio ambiente, siga os passos abaixo.

### Pré-requisitos

- Navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
- Git (opcional, para clonar o repositório).
- Editor de código (recomendado: Visual Studio Code).

### Passo a Passo

1. **Obtenha o código**  
   - Clone o repositório:
     ```bash
     git clone https://github.com/LeandroStanger/UniversidadeLivre.git
     ```
   - Ou baixe o arquivo ZIP diretamente do GitHub e extraia em uma pasta.

2. **Acesse a pasta do projeto**:
   ```bash
   cd UniversidadeLivre
   ```

3. **Execute o site**  
   - Método simples: abra o arquivo `index.html` com o navegador (duplo clique ou arrastar para a janela).  
   - Método recomendado (evita problemas com CORS ao carregar arquivos JSON): utilize um servidor HTTP local.

   **Com Python 3**:
   ```bash
   python -m http.server 8000
   ```
   **Com Node.js (npx)**:
   ```bash
   npx http-server
   ```
   Acesse `http://localhost:8000` no navegador.

4. **Navegue normalmente** pelo site utilizando o menu de navegação.

### Personalização

- Para alterar textos institucionais, edite os arquivos `.html` diretamente.
- Modifique `css/style.css` para ajustar cores, fontes e layout.
- Se houver arquivo `dados/cursos.json`, atualize-o para refletir novos cursos ou professores.
- Para modificar o comportamento do formulário de contato, edite `js/script.js`.

## Configurações Importantes

- O projeto não requer banco de dados nem back-end – é 100% estático.
- O formulário de contato, como implementado apenas com HTML/CSS/JS, **não envia e-mails reais** em ambiente local. Para funcionar em produção, é necessário integrar com um serviço como Formspree, EmailJS ou criar um back-end simples.
- Recomenda-se testar a responsividade usando as ferramentas de desenvolvedor do navegador (F12) com diferentes tamanhos de tela.

## Possíveis Problemas Conhecidos

- Ao abrir o `index.html` diretamente (sem servidor local), requisições `fetch` para arquivos JSON podem ser bloqueadas por políticas de CORS. Utilize um servidor local para evitar essa limitação.
- O menu responsivo pode apresentar pequenas variações de comportamento em navegadores muito antigos (Internet Explorer 11 ou inferior). Recomenda-se o uso de navegadores atualizados.

## Melhorias Futuras (Sugestões)

1. Implementar back-end com Node.js + Express para gerenciamento dinâmico de notícias e eventos.
2. Adicionar sistema de busca de cursos, professores e disciplinas.
3. Criar área restrita para alunos com materiais de apoio (apostilas, videoaulas).
4. Integrar com APIs de mapas (Google Maps ou OpenStreetMap) para localização do campus.
5. Internacionalização (versão em inglês ou espanhol).
6. Desenvolver painel administrativo para atualização de conteúdo sem editar código.
7. Adicionar testes automatizados (ex.: Jest para JavaScript).

## Autor

**Leandro Stanger**  
- GitHub: [LeandroStanger](https://github.com/LeandroStanger)  
- Projeto: Universidade Livre  
- Demonstração online: [https://leandrostanger.github.io/UniversidadeLivre/](https://leandrostanger.github.io/UniversidadeLivre/)
