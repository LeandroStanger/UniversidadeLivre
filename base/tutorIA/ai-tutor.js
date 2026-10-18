(function () {
    'use strict';

    const toggle = document.getElementById('aiTutorToggle');
    if (!toggle) return;

    function updateVisibility() {
        const isAuthenticated = localStorage.getItem('ulivre_authenticated_session') === 'true';
        const isInCourse = Boolean(document.body.dataset.course);
        toggle.hidden = !(isAuthenticated && isInCourse);
    }

    toggle.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const tutorWindow = window.open(
            toggle.href,
            'universidadeLivreTutorIA',
            'popup=yes,width=1100,height=800,resizable=yes,scrollbars=yes'
        );
        if (!tutorWindow) return;
        event.preventDefault();
        tutorWindow.focus();
    });

    window.addEventListener('onboardingComplete', updateVisibility);
    new MutationObserver(updateVisibility).observe(document.body, { attributes: true, attributeFilter: ['data-course'] });
    updateVisibility();
})();