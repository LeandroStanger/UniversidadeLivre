(function() {
    'use strict';

    const endpoint = 'https://formspree.io/f/mljgalaq';
    const modal = document.getElementById('lessonFeedbackModal');
    const form = document.getElementById('lessonFeedbackForm');
    const context = document.getElementById('lessonFeedbackContext');
    const status = document.getElementById('lessonFeedbackStatus');
    if (!modal || !form || !context || !status) {
        console.error('[LessonFeedback] Elementos do formulário de avaliação não encontrados.');
        return;
    }

    const closeButton = modal.querySelector('.lesson-feedback-close');
    const skipButton = modal.querySelector('.lesson-feedback-skip');
    const submitButton = modal.querySelector('.lesson-feedback-submit');
    const ratingInputs = Array.from(form.querySelectorAll('input[name="rating"]'));
    const closeControls = [closeButton, skipButton].filter(Boolean);
    let activeElementBeforeOpen = null;
    let isSubmitting = false;
    let closeTimer = null;

    const fallbackTranslations = {
        lesson_feedback_context: '{{course}} · {{discipline}} · Aula {{lesson}}',
        lesson_feedback_rating_aria: 'Nota {{rating}} de 5',
        lesson_feedback_sending: 'Enviando avaliação...',
        lesson_feedback_success: 'Obrigado! Sua avaliação foi enviada.',
        lesson_feedback_error: 'Não foi possível enviar sua avaliação. Tente novamente.'
    };

    function t(key, replacements = {}) {
        const translate = window.getTranslation || window.t;
        if (typeof translate === 'function') {
            try {
                return translate(key, replacements);
            } catch (error) {
                console.warn('[LessonFeedback] Não foi possível carregar uma tradução:', error);
            }
        }
        return Object.entries(replacements).reduce(
            (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
            fallbackTranslations[key] || key
        );
    }

    function setSubmitting(submitting) {
        isSubmitting = submitting;
        if (submitButton) submitButton.disabled = submitting;
        closeControls.forEach(button => { button.disabled = submitting; });
        form.querySelectorAll('fieldset, textarea').forEach(control => {
            control.disabled = submitting;
        });
        modal.setAttribute('aria-busy', String(submitting));
    }

    function closeModal() {
        if (isSubmitting) return;
        if (closeTimer) {
            window.clearTimeout(closeTimer);
            closeTimer = null;
        }
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        modal.removeAttribute('aria-busy');
        status.textContent = '';
        activeElementBeforeOpen?.focus();
    }

    function openModal(detail) {
        if (modal.hidden === false) return;
        activeElementBeforeOpen = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        form.reset();
        status.textContent = '';
        form.elements.namedItem('course').value = detail.courseName;
        form.elements.namedItem('course_id').value = detail.courseId || '';
        form.elements.namedItem('discipline').value = detail.disciplineName;
        form.elements.namedItem('lesson').value = detail.lessonNumber;
        form.elements.namedItem('_subject').value = `Avaliação da aula ${detail.lessonNumber}: ${detail.disciplineName}`;
        context.textContent = t('lesson_feedback_context', {
            course: detail.courseName,
            discipline: detail.disciplineName || '',
            lesson: detail.lessonNumber
        });
        ratingInputs.forEach(input => {
            input.setAttribute('aria-label', t('lesson_feedback_rating_aria', { rating: input.value }));
        });
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        ratingInputs[0]?.focus();
    }

    window.addEventListener('lessonFeedback:lessonCompleted', event => {
        const detail = event.detail;
        if (!detail?.courseName || !detail?.lessonNumber) {
            console.error('[LessonFeedback] Dados da aula incompletos; avaliação não exibida.', detail);
            return;
        }
        openModal(detail);
    });

    closeButton?.addEventListener('click', closeModal);
    skipButton?.addEventListener('click', closeModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity() || isSubmitting) return;

        const feedback = new FormData(form);
        setSubmitting(true);
        status.textContent = t('lesson_feedback_sending');
        status.classList.remove('is-error', 'is-success');
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: feedback,
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error(`Formspree respondeu com HTTP ${response.status}.`);

            status.textContent = t('lesson_feedback_success');
            status.classList.add('is-success');
            closeTimer = window.setTimeout(() => {
                setSubmitting(false);
                closeModal();
            }, 1800);
        } catch (error) {
            console.error('[LessonFeedback] Falha ao enviar avaliação:', error);
            status.textContent = t('lesson_feedback_error');
            status.classList.add('is-error');
            setSubmitting(false);
        }
    });
})();
