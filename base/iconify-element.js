(() => {
    const scriptUrl = document.currentScript?.src;
    if (!scriptUrl) {
        throw new Error('Unable to locate the offline Iconify component script.');
    }
    const iconDataUrl = new URL('./iconify-icons.json', scriptUrl);
    const assetVersion = new URL(scriptUrl).searchParams.get('v');
    if (assetVersion) iconDataUrl.searchParams.set('v', assetVersion);
    const iconDataPromise = fetch(iconDataUrl).then(response => {
        if (!response.ok) {
            throw new Error(`Unable to load offline icon data: ${response.status} ${response.statusText}`);
        }
        return response.json();
    });

    class IconifyOfflineElement extends HTMLElement {
        static get observedAttributes() {
            return ['icon'];
        }

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.renderVersion = 0;
        }

        connectedCallback() {
            this.renderIcon();
        }

        attributeChangedCallback() {
            this.renderIcon();
        }

        async renderIcon() {
            const renderVersion = ++this.renderVersion;
            const iconName = this.getAttribute('icon');
            if (!iconName) {
                this.shadowRoot.replaceChildren();
                return;
            }

            let data;
            try {
                data = await iconDataPromise;
            } catch (error) {
                console.error('Offline Iconify data could not be loaded:', error);
                return;
            }
            if (renderVersion !== this.renderVersion) return;

            const icon = data[iconName];
            if (!icon) {
                console.error(`Offline Iconify icon "${iconName}" is not available.`);
                this.shadowRoot.replaceChildren();
                return;
            }

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', `0 0 ${icon.width} ${icon.height}`);
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('aria-hidden', 'true');
            svg.innerHTML = icon.body;

            const style = document.createElement('style');
            style.textContent = ':host{display:inline-block;vertical-align:0;color:inherit}svg{display:block;width:100%;height:100%;overflow:visible;color:inherit}';
            this.shadowRoot.replaceChildren(style, svg);
        }
    }

    if (!customElements.get('iconify-icon')) {
        customElements.define('iconify-icon', IconifyOfflineElement);
    }
})();
