(function() {
    'use strict';

    const CAPTCHA_SCRIPT_URLS = [
        'https://xsukax.github.io/xsukax-JS-CAPTCHA/captcha.js',
        'https://cdn.jsdelivr.net/gh/xsukax/xsukax-JS-CAPTCHA@3707d3af7515080d1c22f8d44defb11852433b75/captcha.js'
    ];
    const CAPTCHA_SCRIPT_INTEGRITY = 'sha384-ZDxF/gUAC7dqRUO6IYcVMOCyxVkjoMSFBQrNPusIo4RHSoyK4B22kKbmKbbKeqki';
    let scriptPromise = null;
    let scriptVersion = 0;
    const consumedInstances = new Set();
    const observedContainers = new WeakSet();
    const englishFallbacks = {
        captcha_xsukax_title: 'Security Verification',
        captcha_xsukax_new_challenge: 'New Challenge',
        captcha_xsukax_input_placeholder: 'Enter the code',
        captcha_xsukax_verify: 'Verify',
        captcha_xsukax_verified: 'Verified',
        captcha_xsukax_failed: 'Failed',
        captcha_xsukax_protected_by: 'Protected by',
        captcha_xsukax_type_characters: 'Type the characters shown above',
        captcha_xsukax_challenge_expired: 'Challenge expired. Please refresh.',
        captcha_xsukax_time_limit: 'Time limit exceeded. Please refresh.',
        captcha_xsukax_take_time: 'Please take your time to solve the challenge.',
        captcha_xsukax_verification_success: '✓ Verification successful!',
        captcha_xsukax_incorrect_one_attempt: '✗ Incorrect. {{count}} attempt left.',
        captcha_xsukax_incorrect_attempts: '✗ Incorrect. {{count}} attempts left.',
        captcha_xsukax_too_many_attempts: '✗ Too many attempts. Please refresh.',
        captcha_xsukax_error_title: 'Security Check Error:',
        captcha_xsukax_error_message: 'Failed to initialize CAPTCHA.',
        captcha_xsukax_retry: 'Retry'
    };
    const sourceMessages = {
        'Type the characters shown above': 'captcha_xsukax_type_characters',
        'Challenge expired. Please refresh.': 'captcha_xsukax_challenge_expired',
        'Time limit exceeded. Please refresh.': 'captcha_xsukax_time_limit',
        'Please take your time to solve the challenge.': 'captcha_xsukax_take_time',
        '✓ Verification successful!': 'captcha_xsukax_verification_success',
        '✗ Too many attempts. Please refresh.': 'captcha_xsukax_too_many_attempts',
        'Security Verification': 'captcha_xsukax_title',
        'New Challenge': 'captcha_xsukax_new_challenge',
        'Enter the code': 'captcha_xsukax_input_placeholder',
        'Verify': 'captcha_xsukax_verify',
        'Verified': 'captcha_xsukax_verified',
        'Failed': 'captcha_xsukax_failed',
        'Protected by': 'captcha_xsukax_protected_by',
        'Security Check Error:': 'captcha_xsukax_error_title',
        'Failed to initialize CAPTCHA.': 'captcha_xsukax_error_message',
        'Retry': 'captcha_xsukax_retry'
    };

    function translate(key, replacements = {}) {
        const text = window.__translations?.[key] || englishFallbacks[key] || key;
        return text.replace(/\{\{(\w+)\}\}/g, (placeholder, name) =>
            replacements[name] === undefined ? placeholder : String(replacements[name])
        );
    }

    function translateStatus(status) {
        const currentText = status.textContent.trim();
        let message = status.dataset.xsukaxSourceMessage;
        if (!message || currentText !== status.dataset.xsukaxLocalizedMessage) {
            message = currentText;
            status.dataset.xsukaxSourceMessage = message;
        }
        let key = sourceMessages[message];
        let replacements = {};
        if (!key) {
            const incorrectMatch = message.match(/^✗ Incorrect\. (\d+) attempt(?:s)? left\.$/);
            if (incorrectMatch) {
                replacements.count = incorrectMatch[1];
                key = replacements.count === '1'
                    ? 'captcha_xsukax_incorrect_one_attempt'
                    : 'captcha_xsukax_incorrect_attempts';
            }
        }
        if (!key) return;

        const localizedMessage = translate(key, replacements);
        status.dataset.xsukaxLocalizedMessage = localizedMessage;
        if (status.textContent !== localizedMessage) status.textContent = localizedMessage;
    }

    function localizeContainer(container) {
        const wrapper = container.querySelector('.xsukax-captcha-wrapper');
        if (wrapper) {
            const header = wrapper.children[0];
            const title = header?.children[0];
            const refreshButton = header?.querySelector('button');
            const input = wrapper.querySelector('input');
            const verifyButton = input?.parentElement?.querySelector('button');
            const footer = wrapper.lastElementChild;

            if (title && title.textContent !== translate('captcha_xsukax_title')) {
                title.textContent = translate('captcha_xsukax_title');
            }
            if (refreshButton) {
                refreshButton.title = translate('captcha_xsukax_new_challenge');
                refreshButton.setAttribute('aria-label', refreshButton.title);
            }
            if (input) {
                input.placeholder = translate('captcha_xsukax_input_placeholder');
                input.setAttribute('aria-label', input.placeholder);
            }
            if (verifyButton) {
                const verified = window.xsukaxCAPTCHA?.isVerified?.(container.id) === true;
                const failed = verifyButton.disabled && !verified;
                const key = verified
                    ? 'captcha_xsukax_verified'
                    : failed
                        ? 'captcha_xsukax_failed'
                        : 'captcha_xsukax_verify';
                const text = translate(key);
                if (verifyButton.textContent !== text) verifyButton.textContent = text;
                verifyButton.setAttribute('aria-label', text);
            }
            const status = wrapper.querySelector('.xsukax-captcha-status');
            if (status) translateStatus(status);
            if (footer?.firstChild?.nodeType === Node.TEXT_NODE) {
                const text = `${translate('captcha_xsukax_protected_by')} `;
                if (footer.firstChild.nodeValue !== text) footer.firstChild.nodeValue = text;
            }
        }

        const error = container.firstElementChild;
        if (error && !wrapper) {
            const heading = error.querySelector('strong');
            const retryButton = error.querySelector('button');
            const messageNode = Array.from(error.childNodes).find(node =>
                node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()
            );
            if (heading) heading.textContent = translate('captcha_xsukax_error_title');
            if (messageNode) messageNode.nodeValue = ` ${translate('captcha_xsukax_error_message')} `;
            if (retryButton) retryButton.textContent = translate('captcha_xsukax_retry');
        }
    }

    function observeContainer(container) {
        if (observedContainers.has(container)) return;
        observedContainers.add(container);
        new MutationObserver(() => localizeContainer(container)).observe(container, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    function localizeAll() {
        document.querySelectorAll('.xsukax-captcha').forEach(localizeContainer);
    }

    window.addEventListener('languageChanged', localizeAll);

    function getInstance(container) {
        const instance = window.xsukaxCAPTCHA?.getInstance?.(container.id);
        return instance?.container === container ? instance : null;
    }

    function loadCaptchaScript() {
        if (scriptPromise) return scriptPromise;

        scriptPromise = (async () => {
            for (const url of CAPTCHA_SCRIPT_URLS) {
                try {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = `${url}?load=${++scriptVersion}`;
                        script.integrity = CAPTCHA_SCRIPT_INTEGRITY;
                        script.crossOrigin = 'anonymous';
                        script.async = true;
                        script.onload = () => window.xsukaxCAPTCHA?.isVerified
                            ? resolve()
                            : reject(new Error('captcha_load_failed'));
                        script.onerror = () => reject(new Error('captcha_load_failed'));
                        document.head.appendChild(script);
                    });
                    return;
                } catch (error) {
                    console.warn('[CAPTCHA] Não foi possível carregar o script em', url, error);
                }
            }
            throw new Error('captcha_load_failed');
        })().catch(error => {
            scriptPromise = null;
            throw error;
        });

        return scriptPromise;
    }

    async function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('captcha_container_missing');
        observeContainer(container);
        const existing = getInstance(container);
        if (existing) {
            if (!existing.verified) consumedInstances.delete(containerId);
            localizeContainer(container);
            return;
        }

        await loadCaptchaScript();
        if (!getInstance(container)) {
            scriptPromise = null;
            await loadCaptchaScript();
        }
        localizeContainer(container);
        if (!getInstance(container)) throw new Error('captcha_not_ready');

        consumedInstances.delete(containerId);
    }

    async function verify(containerId) {
        const container = document.getElementById(containerId);
        if (!container || !getInstance(container)) throw new Error('captcha_not_ready');
        if (consumedInstances.has(containerId) || !window.xsukaxCAPTCHA.isVerified(containerId)) {
            getInstance(container)?.input?.focus();
            throw new Error('captcha_challenge_required');
        }

        consumedInstances.add(containerId);
    }

    window.UniversidadeLivreCaptcha = { render, verify };
})();
