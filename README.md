[![Header](https://github.com/LeandroStanger/UniversidadeLivre/blob/main/base/logo-da-universidade-livre.png)]([https://github.com/KAYOKG](https://github.com/LeandroStanger/UniversidadeLivre))

<div align="center">   
   
[![GitHub Pages](https://img.shields.io/badge/Universidade_Livre-30a539?style=for-the-badge&Color=30a539&logo=googlescholar&logoColor=30a539&labelColor=000000)](https://leandrostanger.github.io/UniversidadeLivre/)
[![GitHub](https://img.shields.io/badge/Repositório_GitHub-181717?style=for-the-badge&logo=github&labelColor=000000)](https://github.com/LeandroStanger/UniversidadeLivre)
[![Universidade Livre Desktop](https://img.shields.io/badge/Universidade_Livre_Desktop-04dda0?style=for-the-badge&logo=codementor&logoColor=04dda0&labelColor=000000)](https://github.com/LeandroStanger/UniversidadeLivre/releases/tag/universidade-livre-desktop)

</div>

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

## Aplicativo para Desktop

A Universidade Livre também pode ser executada como aplicativo desktop em Windows, Linux e macOS. O aplicativo inclui o conteúdo do site e o serve localmente em uma origem persistente para preservar o login, o progresso e outros dados entre aberturas do aplicativo. O perfil e a autenticação ficam armazenados localmente neste dispositivo; eles não são sincronizados com o navegador ou com a versão online. A versão web e o aplicativo desktop usam o bundle local do Video.js 10.1.0, incluindo o adaptador YouTube e a extensão Google Cast; isso evita buscar os módulos do player no CDN. O botão de transmissão permite enviar fontes compatíveis para dispositivos Chromecast. O bundle desktop é criado pelo script `npm run build:desktop-player`. O player fornece os controles para aulas do YouTube e arquivos de vídeo. As legendas disponíveis podem ser selecionadas nos controles do player, e as legendas WebVTT são centralizadas. A reprodução do YouTube, o Google Cast, as fontes e outros serviços de terceiros continuam dependendo de conexão com a internet.

Na versão web, o player e o adaptador do YouTube são carregados com estes módulos:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/cdn@10.1.0/video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/cdn@10.1.0/media/youtube-video.js"></script>
```

No aplicativo desktop, cada etapa oferece o download das videoaulas autorizadas do YouTube e de arquivos MP4/WebM hospedados em URLs HTTPS diretas. Os downloads do YouTube usam até oito fragmentos simultâneos e limitam a resolução máxima a Full HD (1080p), sem baixar versões 4K. Durante o download, uma janela mostra a aula atual, o progresso da etapa e uma estimativa do tempo restante; ela pode ser ocultada enquanto o processo continua. Se nem todas as aulas forem salvas, o botão permite continuar baixando apenas as que faltam; quando todas estiverem salvas, ele permite apagar os downloads da etapa. Os vídeos são salvos na pasta de dados do aplicativo e podem ser reproduzidos offline pelo player local. O `yt-dlp` e o runtime JavaScript Deno são baixados de releases oficiais com verificação SHA-256 durante a preparação e empacotados no instalador; a primeira execução a partir do código-fonte e a geração do pacote exigem conexão com a internet. As licenças dos binários empacotados são incluídas com eles.

Para adicionar videoaulas MP4/WebM próprias ou autorizadas a uma disciplina, cadastre os links no campo `videoUrls` do JSON do curso (uma URL por aula). O download de links do YouTube usa os endereços de vídeos que já são fornecidos por `videoIds`.

Para vídeos do YouTube, o aplicativo também baixa a legenda disponível no idioma principal do curso (português, inglês ou espanhol), incluindo legendas automáticas quando necessário. A faixa fica salva como WebVTT junto ao vídeo e só aparece na reprodução quando o usuário ativa as legendas.

### Executar a partir do código-fonte

É necessário ter Node.js 22 ou superior e npm instalados:

```bash
npm ci
npm start
```

### Gerar instaladores

Execute o comando na plataforma de destino:

```bash
npm run dist
```

Os arquivos são gerados na pasta `release/`:

- **Windows:** instalador `.exe` (NSIS).
- **Linux:** `.AppImage` e pacote `.pacman`, e um bundle `.flatpak` para teste/instalação direta.
- **macOS:** `.dmg` e `.zip`.

O fluxo de integração contínua também gera os pacotes para os três sistemas em seus respectivos runners. Os aplicativos para macOS não são assinados; a distribuição fora do desenvolvimento pode exigir assinatura e notarização para evitar avisos do Gatekeeper. Para gerar somente o AppImage e o pacote Pacman no Linux, execute `npm run dist -- --linux`.

### Gerar o bundle Flatpak localmente

Instale `flatpak` e `flatpak-builder` e adicione o Flathub para obter o runtime Freedesktop 25.08:

```bash
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak-builder --user --install-deps-from=flathub --force-clean \
  --repo=flatpak-repo build-dir \
  packaging/flatpak/io.github.leandrostanger.universidadelivre.yml
flatpak build-bundle flatpak-repo \
  release/io.github.leandrostanger.universidadelivre.flatpak \
  io.github.leandrostanger.universidadelivre stable
```

O manifest compila uma revisão pública e imutável do código-fonte. O runtime Freedesktop e a integração do Electron são fornecidos pelo Flathub; o build não instala dependências npm nem usa `electron-builder`. O runtime Electron é obtido da distribuição oficial, com checksum fixado para cada arquitetura suportada. Instale o bundle com `flatpak install --user release/io.github.leandrostanger.universidadelivre.flatpak`. Para atualizar a versão empacotada, atualize a revisão e o checksum da fonte no manifest; ao atualizar o Electron, atualize também as URLs e os checksums para x86_64 e aarch64. Para gerar apenas o RPM, execute `npm run dist -- --linux rpm` em Linux.

## Como Executar o Site Localmente

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

### xsukax JS CAPTCHA

O CAPTCHA visual da [xsukax JS CAPTCHA](https://github.com/xsukax/xsukax-JS-CAPTCHA) é carregado sob demanda pelo [adaptador local](./base/reCaptcha/xsukax-captcha.js) nos fluxos de cadastro, importação do arquivo de progresso usada para login e confirmação de idade do PES 6. A integração usa a API pública `window.xsukaxCAPTCHA.isVerified()` e `getInstance()`; o script remoto está fixado em um commit do projeto.

A interface do CAPTCHA é localizada para português brasileiro, inglês e espanhol conforme o idioma selecionado no site.

A biblioteca é licenciada sob GPL-3.0 e executa a verificação inteiramente no navegador. Ela não oferece validação de resposta em servidor; portanto, essa proteção é apenas uma barreira básica de interface e pode ser contornada por alguém que controle o navegador. Para proteção efetiva de operações importantes, é necessário validar as requisições e aplicar rate limiting em um back-end.

## Contagem local de páginas e eventos

`base/analytics.js` mantém contagens agregadas de páginas e eventos no armazenamento local do navegador (`ulivre_analytics_local_counts`). Nenhuma telemetria é enviada a serviços externos; os dados permanecem neste dispositivo e não são sincronizados entre usuários ou navegadores.

A integração central oferece métodos específicos para cursos, disciplinas, aulas, mídia, navegação e busca:

```js
UniversidadeLivreAnalytics.pageview('/pagina-exemplo', 'Página de exemplo');
UniversidadeLivreAnalytics.event('curso', 'material-baixado', { course: 'matematica' });
UniversidadeLivreAnalytics.event(
    'curso',
    'clique-repetido',
    { course: 'matematica' },
    { noSession: true, referrer: 'menu do curso' }
);
```

As opções `noSession` e `referrer` são aceitas por compatibilidade, mas não alteram as contagens locais. `UniversidadeLivreAnalytics.bindEvents()` também permanece disponível por compatibilidade e não registra listeners de terceiros.

## Autor

**Leandro Stanger**  
- GitHub: [LeandroStanger](https://github.com/LeandroStanger)  
- Projeto: Universidade Livre  
- Demonstração online: [https://leandrostanger.github.io/UniversidadeLivre/](https://leandrostanger.github.io/UniversidadeLivre/)
