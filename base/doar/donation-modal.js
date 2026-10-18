(function() {
    'use strict';

    const triggerSelector = '.donate-button';
    const scriptUrl = document.currentScript ? document.currentScript.src : document.baseURI;
    const dialog = document.createElement('dialog');
    dialog.className = 'donation-dialog';
    dialog.setAttribute('aria-labelledby', 'donationTitle');
    dialog.innerHTML = `
        <div class="donation-dialog__header">
            <div>
                <p class="donation-dialog__eyebrow" data-donation-copy="eyebrow"></p>
                <h2 id="donationTitle" data-donation-copy="title"></h2>
            </div>
            <button class="donation-dialog__close" type="button" data-donation-close aria-label="Fechar">
                <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
        </div>
        <div class="donation-dialog__content">
            <img class="donation-dialog__logo" src="${new URL('../logo-da-universidade-livre.png', scriptUrl).href}" alt="Universidade Livre">
            <p class="donation-dialog__intro" data-donation-copy="intro"></p>
            <div class="donation-tabs" role="tablist" aria-label="Formas de contribuição" data-donation-tabs>
                <button class="donation-tab" id="donation-tab-brl" type="button" role="tab" aria-selected="true" aria-controls="donation-panel-brl" tabindex="0" data-donation-tab="brl" data-donation-copy="brl"></button>
                <button class="donation-tab" id="donation-tab-usd" type="button" role="tab" aria-selected="false" aria-controls="donation-panel-usd" tabindex="-1" data-donation-tab="usd" data-donation-copy="usd"></button>
                <button class="donation-tab" id="donation-tab-crypto" type="button" role="tab" aria-selected="false" aria-controls="donation-panel-crypto" tabindex="-1" data-donation-tab="crypto" data-donation-copy="crypto"></button>
            </div>
            <section class="donation-panel" id="donation-panel-brl" role="tabpanel" aria-labelledby="donation-tab-brl" data-donation-panel="brl">
                <div class="donation-grid" data-donation-group="brl"></div>
            </section>
            <section class="donation-panel" id="donation-panel-usd" role="tabpanel" aria-labelledby="donation-tab-usd" data-donation-panel="usd" hidden>
                <div class="donation-grid" data-donation-group="usd"></div>
            </section>
            <section class="donation-panel" id="donation-panel-crypto" role="tabpanel" aria-labelledby="donation-tab-crypto" data-donation-panel="crypto" hidden>
                <div class="donation-grid donation-grid--crypto" data-donation-group="crypto"></div>
            </section>
        </div>
        <p class="donation-dialog__status" aria-live="polite" data-donation-status></p>
    `;
    document.body.appendChild(dialog);

    const translations = {
        'pt-br': {
            eyebrow: 'APOIE O PROJETO', title: 'Ajude a Universidade Livre a crescer',
            intro: 'A Universidade Livre é um projeto educacional aberto que reúne cursos, biblioteca, conteúdos de idiomas e ferramentas para apoiar diferentes jornadas de aprendizagem. A ideia é oferecer um espaço onde qualquer pessoa possa estudar no próprio ritmo, explorar novos assuntos e encontrar recursos úteis para seguir em frente.\n\nPara que esse ambiente continue gratuito e disponível, existe um trabalho constante por trás da plataforma: manter os serviços funcionando, cuidar da infraestrutura, corrigir problemas, atualizar páginas e melhorar a navegação em computadores e celulares. Também queremos desenvolver cursos, materiais e funcionalidades que tornem o estudo cada vez mais completo, organizado e acessível.\n\nSua contribuição ajuda a sustentar esse trabalho e a transformar essas melhorias em realidade. Cada apoio, de qualquer valor, dá mais condições para evoluir o que já existe, criar novas oportunidades de aprendizagem e alcançar mais pessoas. Escolha abaixo a forma que for mais conveniente para você e contribua somente se estiver ao seu alcance. Obrigado por apoiar a Universidade Livre e fazer parte do crescimento desse projeto.',
            brl: 'Real (BRL)', usd: 'Dólar (USD)', crypto: 'Criptomoedas', methods: 'Formas de contribuição',
            copy: 'Copiar', copied: 'Copiado', close: 'Fechar', bank: 'Banco', agency: 'Agência', account: 'Conta Corrente',
            pix: 'Chave Pix', koFi: 'Apoiar pelo Ko-fi', ach: 'ACH Transfer (EUA)', wire: 'Wire Transfer (Internacional)',
            copyError: 'Não foi possível copiar. Selecione e copie o dado manualmente.'
        },
        en: {
            eyebrow: 'SUPPORT THE PROJECT', title: 'Help Universidade Livre grow',
            intro: 'Universidade Livre is an open educational project that brings together courses, a library, language-learning content, and tools for different learning journeys. The goal is to offer a place where anyone can study at their own pace, explore new subjects, and find useful resources to keep moving forward.\n\nKeeping this space free and available takes ongoing work behind the platform: maintaining its services and infrastructure, fixing issues, updating pages, and improving navigation on computers and phones. We also want to develop courses, materials, and features that make studying more complete, organized, and accessible.\n\nYour contribution helps sustain this work and turn these improvements into reality. Support of any amount helps us improve what is already here, create new learning opportunities, and reach more people. Choose whichever option is most convenient, and contribute only if it is within your means. Thank you for supporting Universidade Livre and being part of this project’s growth.',
            brl: 'Brazilian Real (BRL)', usd: 'US Dollar (USD)', crypto: 'Cryptocurrency', methods: 'Ways to contribute',
            copy: 'Copy', copied: 'Copied', close: 'Close', bank: 'Bank', agency: 'Branch', account: 'Checking account',
            pix: 'Pix key', koFi: 'Support on Ko-fi', ach: 'ACH Transfer (USA)', wire: 'Wire Transfer (International)',
            copyError: 'Could not copy. Select and copy the value manually.'
        },
        es: {
            eyebrow: 'APOYA EL PROYECTO', title: 'Ayuda a crecer a Universidade Livre',
            intro: 'Universidade Livre es un proyecto educativo abierto que reúne cursos, biblioteca, contenidos de idiomas y herramientas para acompañar diferentes experiencias de aprendizaje. La propuesta es ofrecer un espacio donde cualquier persona pueda estudiar a su ritmo, explorar nuevos temas y encontrar recursos útiles para seguir adelante.\n\nPara que este espacio siga siendo gratuito y esté disponible, hay un trabajo constante detrás de la plataforma: mantener los servicios y la infraestructura, resolver problemas, actualizar páginas y mejorar la navegación en computadoras y celulares. También queremos desarrollar cursos, materiales y funciones que hagan que el estudio sea cada vez más completo, organizado y accesible.\n\nTu contribución ayuda a sostener este trabajo y a convertir estas mejoras en realidad. Cualquier aporte nos da más posibilidades de mejorar lo que ya existe, crear nuevas oportunidades de aprendizaje y llegar a más personas. Elige la opción que te resulte más cómoda y contribuye solo si está a tu alcance. Gracias por apoyar a Universidade Livre y formar parte del crecimiento de este proyecto.',
            brl: 'Real brasileño (BRL)', usd: 'Dólar estadounidense (USD)', crypto: 'Criptomonedas', methods: 'Formas de contribuir',
            copy: 'Copiar', copied: 'Copiado', close: 'Cerrar', bank: 'Banco', agency: 'Sucursal', account: 'Cuenta corriente',
            pix: 'Clave Pix', koFi: 'Apoyar en Ko-fi', ach: 'ACH Transfer (EE. UU.)', wire: 'Wire Transfer (Internacional)',
            copyError: 'No se pudo copiar. Selecciona y copia el dato manualmente.'
        }
    };

    const bankData = [
        { name: 'Sicredi', logo: 'sicredi.png', fields: [['bank', '748'], ['agency', '2604'], ['account', '52656-8']] },
        { name: 'Nubank', logo: 'nubank.png', fields: [['bank', '260'], ['agency', '0001'], ['account', '16760999-0']] },
        { name: 'Itaú', logo: 'itau.png', fields: [['bank', '341'], ['agency', '0628'], ['account', '77920-9']] }
    ];

    const cryptoData = [
        { name: 'Bitcoin', logo: 'bitcoin.png', address: 'bc1q9fejrhm26lx3uh8axh7xfrlckmg5g5nwpvj2lt' },
        { name: 'Ethereum', logo: 'ethereum.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Solana', logo: 'solana.png', address: 'AEUidTeEZuN6TCLHHpcnrnXiUNVPQhARx5V7aM247Hn7' },
        { name: 'HyperEVM', logo: 'HyperEVM.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Monad', logo: 'monad.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Arbitrum', logo: 'arbitrum.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'MegaETH', logo: 'mega_eth.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Base', logo: 'base.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Avalanche', logo: 'avalanche.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Polygon', logo: 'polygon.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Tron', logo: 'tron.png', address: 'TUkdsmgg1nKp1NxWH1fptqmnzuH914Hiw2' },
        { name: 'Optimism', logo: 'optimism.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'zkSync Era', logo: 'zksync.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Sei', logo: 'sei.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'Linea', logo: 'linea.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' },
        { name: 'BNB Chain', logo: 'BNB Chain.png', address: '0xe18b69C66B3F168b31EeDCc1744bC833FD6F09B1' }
    ];

    function getLanguage() {
        const language = (document.documentElement.lang || 'pt-BR').toLowerCase();
        return translations[language] ? language : language.startsWith('es') ? 'es' : language.startsWith('en') ? 'en' : 'pt-br';
    }

    function getDefaultDonationTab() {
        const language = (document.documentElement.lang || 'pt-BR').toLowerCase();
        return language.startsWith('pt') ? 'brl' : 'usd';
    }

    function getText(key) {
        return translations[getLanguage()][key];
    }

    function makeLogo(filename, name) {
        const wrapper = document.createElement('span');
        wrapper.className = 'donation-card__logo';
        if (filename) {
            const image = document.createElement('img');
            image.src = new URL(`logos/${encodeURIComponent(filename)}`, scriptUrl).href;
            image.alt = '';
            image.loading = 'lazy';
            image.setAttribute('aria-hidden', 'true');
            wrapper.appendChild(image);
        } else {
            wrapper.innerHTML = '<i class="fas fa-building-columns" aria-hidden="true"></i>';
        }
        wrapper.setAttribute('aria-label', name);
        return wrapper;
    }

    function makeCopyButton(value, label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'donation-copy';
        button.dataset.copyValue = value;
        button.setAttribute('aria-label', `${getText('copy')} ${label}`);
        button.innerHTML = `<i class="fas fa-copy" aria-hidden="true"></i><span>${getText('copy')}</span>`;
        return button;
    }

    function makeDataRow(label, value) {
        const row = document.createElement('div');
        row.className = 'donation-data-row';
        const name = document.createElement('span');
        name.className = 'donation-data-row__label';
        name.textContent = label;
        const code = document.createElement('code');
        code.textContent = value;
        row.append(name, code, makeCopyButton(value, label));
        return row;
    }

    function makeCard(name, logo, rows, modifier = '') {
        const card = document.createElement('article');
        card.className = `donation-card ${modifier}`.trim();
        const heading = document.createElement('div');
        heading.className = 'donation-card__heading';
        heading.append(makeLogo(logo, name));
        const title = document.createElement('h4');
        title.textContent = name;
        heading.appendChild(title);
        card.appendChild(heading);
        const content = document.createElement('div');
        content.className = 'donation-card__content';
        rows.forEach(row => content.appendChild(makeDataRow(row.label, row.value)));
        card.appendChild(content);
        return card;
    }

    function activateDonationTab(tabKey, moveFocus = false) {
        const tabs = dialog.querySelectorAll('[data-donation-tab]');
        const activeTab = dialog.querySelector(`[data-donation-tab="${tabKey}"]`);
        if (!activeTab) return;

        tabs.forEach(tab => {
            const isActive = tab === activeTab;
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });
        dialog.querySelectorAll('[data-donation-panel]').forEach(panel => {
            panel.hidden = panel.dataset.donationPanel !== tabKey;
        });
        if (moveFocus) activeTab.focus();
    }

    function renderDialog() {
        const brlGroup = dialog.querySelector('[data-donation-group="brl"]');
        const usdGroup = dialog.querySelector('[data-donation-group="usd"]');
        const cryptoGroup = dialog.querySelector('[data-donation-group="crypto"]');
        dialog.querySelectorAll('[data-donation-copy]').forEach(element => {
            element.textContent = getText(element.dataset.donationCopy);
        });
        dialog.querySelector('[data-donation-close]').setAttribute('aria-label', getText('close'));
        dialog.querySelector('[data-donation-tabs]').setAttribute('aria-label', getText('methods'));
        brlGroup.replaceChildren(
            makeCard('Pix', 'pix.png', [{ label: getText('pix'), value: 'c348f1e6-72fa-4988-a2e9-3ac7d539de84' }], 'donation-card--pix'),
            ...bankData.map(bank => makeCard(bank.name, bank.logo, bank.fields.map(([key, value]) => ({ label: getText(key), value }))))
        );

        const koFiCard = makeCard('Ko-fi', 'ko_fi.png', [], 'donation-card--kofi');
        const koFiLink = document.createElement('a');
        koFiLink.className = 'donation-provider-link';
        koFiLink.href = 'https://ko-fi.com/leandrostanger';
        koFiLink.target = '_blank';
        koFiLink.rel = 'noopener noreferrer';
        koFiLink.innerHTML = `<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span>${getText('koFi')}</span>`;
        koFiCard.querySelector('.donation-card__content').appendChild(koFiLink);
        usdGroup.replaceChildren(
            koFiCard,
            makeCard(getText('ach'), '', [{ label: 'ABA / Routing number', value: '026073150' }]),
            makeCard(getText('wire'), '', [{ label: 'Routing number', value: '026073008' }])
        );
        cryptoGroup.replaceChildren(...cryptoData.map(coin => makeCard(
            coin.name,
            coin.logo,
            [{ label: coin.name, value: coin.address }],
            `donation-card--crypto${coin.name === 'Bitcoin' ? ' donation-card--featured' : ''}`
        )));
        activateDonationTab(getDefaultDonationTab());
    }

    document.addEventListener('click', event => {
        const trigger = event.target.closest(triggerSelector);
        if (!trigger) return;
        event.preventDefault();
        renderDialog();
        dialog.showModal();
    });

    dialog.addEventListener('keydown', event => {
        const currentTab = event.target.closest('[data-donation-tab]');
        if (!currentTab) return;

        const tabs = [...dialog.querySelectorAll('[data-donation-tab]')];
        const currentIndex = tabs.indexOf(currentTab);
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else return;

        event.preventDefault();
        activateDonationTab(tabs[nextIndex].dataset.donationTab, true);
    });

    dialog.addEventListener('click', async event => {
        const tab = event.target.closest('[data-donation-tab]');
        if (tab) {
            activateDonationTab(tab.dataset.donationTab);
            return;
        }

        if (event.target.closest('[data-donation-close]')) {
            dialog.close();
            return;
        }

        const copyButton = event.target.closest('[data-copy-value]');
        if (!copyButton) return;

        try {
            await navigator.clipboard.writeText(copyButton.dataset.copyValue);
        } catch (_) {
            const temporaryInput = document.createElement('textarea');
            temporaryInput.value = copyButton.dataset.copyValue;
            temporaryInput.style.position = 'fixed';
            temporaryInput.style.opacity = '0';
            document.body.appendChild(temporaryInput);
            temporaryInput.select();
            const copied = document.execCommand('copy');
            temporaryInput.remove();
            if (!copied) {
                dialog.querySelector('[data-donation-status]').textContent = getText('copyError');
                return;
            }
        }

        copyButton.querySelector('span').textContent = getText('copied');
        dialog.querySelector('[data-donation-status]').textContent = getText('copied');
        window.setTimeout(() => {
            if (!copyButton.isConnected) return;
            copyButton.querySelector('span').textContent = getText('copy');
        }, 1800);
    });

    dialog.addEventListener('close', () => {
        dialog.querySelector('[data-donation-status]').textContent = '';
    });
})();