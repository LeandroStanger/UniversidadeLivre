(() => {
    const styleClasses = new Set([
        'fa',
        'fas',
        'far',
        'fab',
        'fa-solid',
        'fa-regular',
        'fa-brands',
        'fa6-solid',
        'fa6-regular',
        'fa6-brands'
    ]);
    const utilityClasses = new Set([
        'fa-spin',
        'fa-pulse',
        'fa-fw',
        'fa-xs',
        'fa-sm',
        'fa-lg',
        'fa-xl',
        'fa-2x',
        'fa-3x',
        'fa-4x',
        'fa-5x',
        'fa-6x',
        'fa-7x',
        'fa-8x',
        'fa-9x',
        'fa-10x'
    ]);
    const iconAliases = {
        'arrow-left': 'fluent:arrow-left-24-filled',
        'arrow-shuffle': 'fluent:arrow-shuffle-24-filled',
        'arrow-turn-down': 'fluent:arrow-square-down-24-filled',
        'arrow-up-right-from-square': 'fluent:link-24-filled',
        'atom': 'fluent:molecule-24-filled',
        'award': 'fluent:ribbon-star-24-filled',
        'arrow-enter': 'fluent:arrow-enter-24-filled',
        'backward-step': 'fluent:previous-24-filled',
        'balance-scale': 'fluent:certificate-24-filled',
        'bars': 'fluent:apps-24-filled',
        'book': 'fluent:library-24-filled',
        'book-open': 'fluent:book-open-lightbulb-24-filled',
        'bookmark': 'fluent:bookmark-24-filled',
        'brain': 'fluent:molecule-24-filled',
        'briefcase': 'fluent:briefcase-24-filled',
        'broadcast-tower': 'fluent:wifi-1-24-filled',
        'building-columns': 'fluent:building-government-24-filled',
        'calculator': 'fluent:number-symbol-square-24-filled',
        'calendar-alt': 'fluent:calendar-24-filled',
        'calendar-days': 'fluent:calendar-checkmark-24-filled',
        'calendar-plus': 'fluent:calendar-clock-24-filled',
        'camera': 'fluent:camera-24-filled',
        'car': 'fluent:contact-card-24-filled',
        'certificate': 'fluent:certificate-24-filled',
        'chalkboard-teacher': 'fluent:lightbulb-filament-24-filled',
        'chart-line': 'fluent:data-line-24-filled',
        'check': 'fluent:checkbox-1-24-filled',
        'check-circle': 'fluent:checkmark-circle-24-filled',
        'chess': 'fluent:sport-24-filled',
        'chess-board': 'fluent:sport-24-filled',
        'chess-knight': 'fluent:sport-24-filled',
        'chevron': 'fluent:arrow-right-24-filled',
        'chevron-down': 'fluent:chevron-down-24-filled',
        'chevron-left': 'fluent:chevron-left-24-filled',
        'chevron-right': 'fluent:chevron-right-24-filled',
        'church': 'fluent:building-24-filled',
        'circle': 'fluent:apps-24-filled',
        'circle-check': 'fluent:checkmark-circle-24-filled',
        'circle-exclamation': 'fluent:alert-24-filled',
        'circle-info': 'fluent:question-circle-24-filled',
        'circle-notch': 'fluent:arrow-sync-24-filled',
        'clover': 'fluent:clover-24-filled',
        'circle-question': 'fluent:question-circle-24-filled',
        'clipboard-list': 'fluent:clipboard-task-24-filled',
        'clipboard-question': 'fluent:notebook-question-mark-24-filled',
        'clock': 'fluent:clock-24-filled',
        'closed-captioning': 'fluent:video-24-filled',
        'code': 'fluent:code-24-filled',
        'coins': 'fluent:coin-multiple-24-filled',
        'comment': 'fluent:comment-24-filled',
        'comment-dots': 'fluent:chat-24-filled',
        'compass': 'fluent:globe-24-filled',
        'copy': 'fluent:document-24-filled',
        'cubes': 'fluent:building-multiple-24-filled',
        'database': 'fluent:database-24-filled',
        'dharmachakra': 'fluent:arrow-sync-24-filled',
        'diamond': 'fluent:premium-24-filled',
        'dice': 'fluent:sport-24-filled',
        'discord': 'fluent:chat-24-filled',
        'door-open': 'fluent:building-home-24-filled',
        'download': 'fluent:arrow-square-down-24-filled',
        'edit': 'fluent:document-edit-24-filled',
        'eraser': 'fluent:edit-24-filled',
        'exclamation-circle': 'fluent:alert-24-filled',
        'exclamation-triangle': 'fluent:warning-24-filled',
        'expand': 'fluent:arrow-expand-24-filled',
        'external-link-alt': 'fluent:link-24-filled',
        'eye': 'fluent:content-view-24-filled',
        'eye-slash': 'fluent:image-off-24-filled',
        'face-smile': 'fluent:chat-24-filled',
        'facebook': 'fluent:people-24-filled',
        'facebook-messenger': 'fluent:chat-24-filled',
        'file': 'fluent:document-24-filled',
        'file-alt': 'fluent:document-text-24-filled',
        'file-export': 'fluent:send-24-filled',
        'file-import': 'fluent:document-add-24-filled',
        'file-pdf': 'fluent:document-text-24-filled',
        'film': 'fluent:video-24-filled',
        'filter': 'fluent:options-24-filled',
        'fire': 'fluent:fire-24-filled',
        'flask': 'fluent:molecule-24-filled',
        'font': 'fluent:text-edit-style-24-filled',
        'forward-step': 'fluent:fast-forward-24-filled',
        'futbol': 'fluent:sport-24-filled',
        'gamepad': 'fluent:sport-24-filled',
        'gear': 'fluent:settings-24-filled',
        'github': 'fluent:code-24-filled',
        'globe': 'fluent:globe-24-filled',
        'graduation-cap': 'fluent:certificate-24-filled',
        'gripfire': 'fluent:fire-24-filled',
        'hand-fist': 'fluent:person-24-filled',
        'hand-wave': 'fluent:person-24-filled',
        'headphones': 'fluent:headphones-24-filled',
        'heart': 'fluent:heart-24-filled',
        'heart-pulse': 'fluent:patient-24-filled',
        'image': 'fluent:image-24-filled',
        'imdb': 'fluent:video-24-filled',
        'industry': 'fluent:building-24-filled',
        'info-circle': 'fluent:question-circle-24-filled',
        'key': 'fluent:person-key-24-filled',
        'landmark': 'fluent:building-government-24-filled',
        'language': 'fluent:globe-24-filled',
        'laptop-code': 'fluent:code-24-filled',
        'layer-group': 'fluent:apps-list-24-filled',
        'leaf': 'fluent:lightbulb-filament-24-filled',
        'live': 'fluent:live-24-filled',
        'link': 'fluent:link-24-filled',
        'linkedin': 'fluent:people-24-filled',
        'list': 'fluent:list-bar-24-filled',
        'list-ul': 'fluent:text-bullet-list-square-24-filled',
        'lock': 'fluent:lock-closed-24-filled',
        'map-marker-alt': 'fluent:pin-24-filled',
        'microchip': 'fluent:laptop-24-filled',
        'moon': 'fluent:weather-snowflake-24-filled',
        'music': 'fluent:headphones-24-filled',
        'note-sticky': 'fluent:notebook-24-filled',
        'palette': 'fluent:paint-brush-24-filled',
        'paper-plane': 'fluent:send-24-filled',
        'paperclip': 'fluent:document-add-24-filled',
        'pause': 'fluent:video-24-filled',
        'paw': 'fluent:animal-paw-print-24-filled',
        'pen': 'fluent:edit-24-filled',
        'pen-fancy': 'fluent:edit-24-filled',
        'pencil-alt': 'fluent:document-edit-24-filled',
        'person-walking': 'fluent:person-24-filled',
        'plane': 'fluent:globe-24-filled',
        'play': 'fluent:video-24-filled',
        'play-circle': 'fluent:video-24-filled',
        'plus': 'fluent:add-circle-24-filled',
        'plus-circle': 'fluent:add-circle-24-filled',
        'podcast': 'fluent:mic-24-filled',
        'random': 'fluent:apps-list-24-filled',
        'reddit-alien': 'fluent:chat-24-filled',
        'robot': 'fluent:bot-24-filled',
        'rocket': 'fluent:planet-24-filled',
        'rotate-left': 'fluent:arrow-sync-24-filled',
        'rotate-right': 'fluent:arrow-sync-24-filled',
        'save': 'fluent:document-24-filled',
        'search': 'fluent:search-visual-24-filled',
        'search-minus': 'fluent:search-visual-24-filled',
        'search-plus': 'fluent:search-visual-24-filled',
        'seedling': 'fluent:lightbulb-filament-24-filled',
        'server': 'fluent:database-24-filled',
        'share': 'fluent:share-android-24-filled',
        'share-alt': 'fluent:share-android-24-filled',
        'share-nodes': 'fluent:share-android-24-filled',
        'shield-alt': 'fluent:shield-24-filled',
        'shield-halbed': 'fluent:shield-checkmark-24-filled',
        'shuffle': 'fluent:apps-list-24-filled',
        'sign-in-alt': 'fluent:arrow-enter-24-filled',
        'signal': 'fluent:data-trending-24-filled',
        'sliders': 'fluent:options-24-filled',
        'smile': 'fluent:person-24-filled',
        'spinner': 'fluent:clock-24-filled',
        'square-poll-vertical': 'fluent:poll-24-filled',
        'square-root-alt': 'fluent:number-symbol-square-24-filled',
        'star': 'fluent:ribbon-star-24-filled',
        'sun': 'fluent:weather-sunny-low-24-filled',
        'sync-alt': 'fluent:arrow-sync-24-filled',
        'tag': 'fluent:bookmark-24-filled',
        'tags': 'fluent:bookmark-24-filled',
        'tasks': 'fluent:clipboard-task-24-filled',
        'telegram': 'fluent:send-24-filled',
        'th': 'fluent:apps-list-24-filled',
        'ticket': 'fluent:certificate-24-filled',
        'tilgang-til-metadata': 'fluent:library-24-filled',
        'times': 'fluent:dismiss-circle-24-filled',
        'tower-broadcast': 'fluent:wifi-1-24-filled',
        'trash': 'fluent:document-24-filled',
        'trash-alt': 'fluent:document-24-filled',
        'triangle-exclamation': 'fluent:warning-24-filled',
        'trophy': 'fluent:trophy-24-filled',
        'truck': 'fluent:contact-card-24-filled',
        'tv': 'fluent:video-24-filled',
        'twitch': 'fluent:video-24-filled',
        'up-right-from-square': 'fluent:link-24-filled',
        'upload': 'fluent:send-24-filled',
        'user': 'fluent:person-24-filled',
        'user-circle': 'fluent:person-24-filled',
        'user-secret': 'fluent:person-key-24-filled',
        'users': 'fluent:people-community-24-filled',
        'utensils': 'fluent:food-24-filled',
        'venus-mars': 'fluent:people-24-filled',
        'video': 'fluent:video-24-filled',
        'volume-down': 'fluent:headphones-24-filled',
        'volume-high': 'fluent:headphones-24-filled',
        'volume-mute': 'fluent:headphones-24-filled',
        'volume-up': 'fluent:headphones-24-filled',
        'waveform-lines': 'fluent:headphones-24-filled',
        'whatsapp': 'fluent:chat-24-filled',
        'x-twitter': 'fluent:share-android-24-filled',
        'xmark': 'fluent:dismiss-circle-24-filled',
        'youtube': 'fluent:video-24-filled'
    };
    const iconColorGroups = {
        '#f97316': ['fire', 'gripfire', 'exclamation-circle', 'exclamation-triangle', 'circle-exclamation', 'triangle-exclamation', 'warning', 'rocket', 'truck', 'industry'],
        '#ef4444': ['heart', 'heart-pulse', 'trash', 'trash-alt', 'times', 'xmark', 'dismiss', 'live', 'youtube'],
        '#22c55e': ['check', 'check-circle', 'circle-check', 'certificate', 'graduation-cap', 'seedling', 'leaf', 'calendar-days', 'futbol', 'paw', 'clover', 'arrow-shuffle', 'door-open', 'plus', 'plus-circle', 'shield-alt', 'shield-halbed'],
        '#14b8a6': ['arrow-enter'],
        '#14b8a6': ['book', 'book-open', 'bookmark', 'library', 'clipboard-list', 'clipboard-question', 'list', 'list-ul', 'tasks', 'note-sticky', 'calendar-alt', 'calendar-plus', 'chalkboard-teacher', 'clock', 'copy', 'edit', 'eraser', 'layer-group', 'pen', 'pen-fancy', 'pencil-alt', 'save', 'square-poll-vertical', 'sync-alt', 'tag', 'tags', 'tilgang-til-metadata'],
        '#8b5cf6': ['headphones', 'music', 'podcast', 'volume-down', 'volume-high', 'volume-mute', 'volume-up', 'waveform-lines', 'twitch', 'bars', 'filter', 'gear', 'landmark', 'lock', 'moon', 'palette', 'random', 'shuffle', 'sliders', 'th', 'dharmachakra', 'circle-notch'],
        '#3b82f6': ['video', 'film', 'play', 'play-circle', 'pause', 'forward-step', 'backward-step', 'closed-captioning', 'tv', 'camera', 'image', 'imdb', 'globe', 'language', 'compass', 'search', 'search-minus', 'search-plus', 'signal', 'broadcast-tower', 'tower-broadcast', 'wifi', 'balance-scale', 'chart-line', 'circle-info', 'circle-question', 'info-circle', 'up-right-from-square', 'arrow-left', 'arrow-turn-down', 'arrow-up-right-from-square', 'chevron', 'chevron-down', 'chevron-left', 'chevron-right', 'download', 'expand', 'external-link-alt', 'file', 'file-alt', 'file-export', 'file-import', 'file-pdf', 'link', 'paperclip', 'plane', 'spinner', 'circle'],
        '#0ea5e9': ['users', 'user', 'user-circle', 'user-secret', 'person-walking', 'hand-wave', 'hand-fist', 'facebook', 'facebook-messenger', 'discord', 'linkedin', 'reddit-alien', 'telegram', 'whatsapp', 'x-twitter', 'car'],
        '#06b6d4': ['comment', 'comment-dots', 'chat', 'paper-plane', 'send', 'share', 'share-alt', 'share-nodes', 'eye', 'eye-slash'],
        '#f59e0b': ['star', 'award', 'trophy', 'coins', 'diamond', 'ticket', 'sun', 'chess', 'chess-board', 'chess-knight', 'face-smile', 'dice', 'gamepad', 'key', 'smile', 'utensils'],
        '#6366f1': ['code', 'github', 'laptop-code', 'microchip', 'robot', 'database', 'server', 'calculator', 'square-root-alt', 'atom', 'brain', 'flask', 'font', 'briefcase', 'building-columns', 'cubes', 'church'],
        '#ec4899': ['map-marker-alt', 'venus-mars']
    };
    const iconColors = Object.fromEntries(
        Object.entries(iconColorGroups).flatMap(([color, names]) =>
            names.map(name => [name, color])
        )
    );
    function getIconAlias(element) {
        const classes = [...element.classList];
        const iconClass = classes.find(className =>
            className.startsWith('fa-') &&
            !styleClasses.has(className) &&
            !utilityClasses.has(className)
        );

        if (!iconClass) {
            return null;
        }

        return iconClass.slice(3);
    }

    function getIconifyName(element) {
        const name = getIconAlias(element);
        return name ? iconAliases[name] || 'fluent:apps-24-filled' : null;
    }

    function processIcon(element) {
        if (!(element instanceof HTMLElement) || element.tagName !== 'I') {
            return;
        }

        const iconName = getIconifyName(element);
        if (!iconName) {
            return;
        }

        let icon = element.querySelector(':scope > iconify-icon[data-fa-iconify]');
        if (!icon) {
            icon = document.createElement('iconify-icon');
            icon.dataset.faIconify = '';
            element.append(icon);
        }

        icon.setAttribute('icon', iconName);
        icon.className = `iconify-fa-icon ${[...element.classList]
            .filter(className => utilityClasses.has(className))
            .join(' ')}`;
        icon.style.color = iconColors[getIconAlias(element)] || '#3b82f6';
        icon.setAttribute('aria-hidden', 'true');
    }

    function processTree(root) {
        if (root instanceof HTMLElement) {
            processIcon(root);
        }
        root.querySelectorAll?.('i[class]').forEach(processIcon);
    }

    processTree(document);

    new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                processIcon(mutation.target);
                continue;
            }

            mutation.addedNodes.forEach(processTree);
        }
    }).observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class']
    });
})();
