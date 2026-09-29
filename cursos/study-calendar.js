(function () {
    'use strict';

    const STORAGE_PREFIX = 'ulivre_study_schedule_';
    const WEEKDAYS = [1, 2, 3, 4, 5];
    let state = null;

    function t(key, replacements = {}) {
        const translate = typeof window.getTranslation === 'function'
            ? window.getTranslation
            : typeof window.i18n?.t === 'function'
                ? window.i18n.t
                : window.t;
        let text = typeof translate === 'function' ? translate(key, replacements) : key;
        Object.entries(replacements).forEach(([name, value]) => {
            text = text.replace(new RegExp(`{{${name}}}`, 'g'), value);
        });
        return text;
    }

    function locale() {
        const currentLanguage = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : document.documentElement.lang;
        if (currentLanguage === 'en' || currentLanguage === 'en-US') return 'en-US';
        if (currentLanguage === 'es' || currentLanguage === 'es-ES') return 'es-ES';
        return 'pt-BR';
    }

    function applyCalendarLocale() {
        const calendarLocale = locale();
        const calendar = document.getElementById('studyCalendar');
        if (calendar) calendar.lang = calendarLocale;
        document.querySelectorAll('#studyCalendar input[type="date"]').forEach(input => {
            input.lang = calendarLocale;
        });
    }

    function dateKey(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');
    }

    function setScheduleDates() {
        const startInput = document.getElementById('studyStartDate');
        const endInput = document.getElementById('studyEndDate');
        const start = state?.selectedDate || dateKey(new Date());
        if (startInput) {
            startInput.value = start;
            startInput.min = dateKey(new Date());
        }
        if (endInput) {
            endInput.min = start;
            updateScheduleEndDate();
        }
    }

    function parseDate(key) {
        const [year, month, day] = key.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    function loadEvents() {
        if (state?.courseId === 'student') {
            return (window.getStudyCalendarCourses?.() || []).flatMap(course => loadEventsForCourse(course.id).map(event => ({
                ...event,
                courseName: course.name
            }))).sort((a, b) => a.date.localeCompare(b.date));
        }
        return loadEventsForCourse(state.courseId);
    }

    function loadEventsForCourse(courseId) {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_PREFIX + courseId) || '[]');
        } catch (error) {
            console.warn('[StudyCalendar] Agenda inválida, iniciando vazia.', error);
            return [];
        }
    }

    function isLessonCompleted(event) {
        try {
            const data = JSON.parse(localStorage.getItem(`ulivre_course_${event.courseId}`) || '{}');
            if (Array.isArray(data.completedLessons)) return data.completedLessons[event.lessonId] === true;
        } catch (error) {
            console.warn('[StudyCalendar] Não foi possível verificar a conclusão da aula.', error);
        }
        return false;
    }

    function isPast(event) {
        return parseDate(event.date) < new Date(new Date().setHours(0, 0, 0, 0));
    }

    function isToday(event) {
        return dateKey(parseDate(event.date)) === dateKey(new Date());
    }

    function rescheduleEvent(event) {
        const courseEvents = loadEventsForCourse(event.courseId || state.courseId);
        const scheduleDays = Array.isArray(event.scheduleDays) && event.scheduleDays.length
            ? event.scheduleDays
            : [1, 2, 3, 4, 5];
        const date = parseDate(event.date);
        do {
            date.setDate(date.getDate() + 1);
        } while (!scheduleDays.includes(date.getDay()));
        saveEventsForCourse(event.courseId || state.courseId, courseEvents.map(item => (
            item.id === event.id ? { ...item, date: dateKey(date) } : item
        )));
        renderCalendar();
        renderEvents();
    }

    function saveEvents(events) {
        localStorage.setItem(STORAGE_PREFIX + state.courseId, JSON.stringify(events));
    }

    function saveEventsForCourse(courseId, events) {
        localStorage.setItem(STORAGE_PREFIX + courseId, JSON.stringify(events));
    }

    function renderCalendar() {
        const monthLabel = document.getElementById('studyCalendarMonth');
        const grid = document.getElementById('studyCalendarGrid');
        if (!monthLabel || !grid) return;
        applyCalendarLocale();
        const formatter = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' });
        monthLabel.textContent = formatter.format(state.month);
        grid.innerHTML = '';

        const weekdayFormatter = new Intl.DateTimeFormat(locale(), { weekday: 'short' });
        const sunday = new Date(2024, 0, 7);
        for (let index = 0; index < 7; index++) {
            const day = new Date(sunday);
            day.setDate(sunday.getDate() + index);
            const label = document.createElement('span');
            label.textContent = weekdayFormatter.format(day).replace('.', '');
            label.setAttribute('role', 'columnheader');
            grid.appendChild(label);
        }

        const first = new Date(state.month.getFullYear(), state.month.getMonth(), 1);
        const startOffset = first.getDay();
        const daysInMonth = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 0).getDate();
        const events = loadEvents();
        const eventDates = new Set(events.map(event => event.date));
        const todayKey = dateKey(new Date());
        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
        for (let index = 0; index < totalCells; index++) {
            const dayNumber = index - startOffset + 1;
            const day = new Date(state.month.getFullYear(), state.month.getMonth(), dayNumber);
            const isOutsideMonth = day.getMonth() !== state.month.getMonth();
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'study-calendar-day';
            button.textContent = day.getDate();
            button.disabled = isOutsideMonth;
            button.setAttribute('aria-label', `${t('study_calendar_select_day')}: ${day.toLocaleDateString(locale())}`);
            if (isOutsideMonth) button.classList.add('is-outside');
            if (dateKey(day) === todayKey) button.classList.add('is-today');
            if (eventDates.has(dateKey(day))) button.classList.add('has-event');
            button.addEventListener('click', () => {
                state.selectedDate = dateKey(day);
                const startInput = document.getElementById('studyStartDate');
                if (startInput) {
                    startInput.value = state.selectedDate;
                    startInput.dispatchEvent(new Event('change'));
                }
                renderEvents();
            });
            grid.appendChild(button);
        }
    }

    function renderEvents() {
        const container = document.getElementById('studyCalendarEvents');
        if (!container) return;
        const events = loadEvents();
        container.innerHTML = `<h4>${t('study_calendar_scheduled')}</h4>`;
        if (!events.length) {
            container.insertAdjacentHTML('beforeend', `<p>${t('study_calendar_empty')}</p>`);
            return;
        }
        events.slice(0, 8).forEach(event => {
            const row = document.createElement('div');
            row.className = 'study-calendar-event';
            const completed = isLessonCompleted(event);
            const past = isPast(event);
            const today = isToday(event);
            if (today) row.classList.add('is-today-event');
            if (past) row.classList.add(completed ? 'is-completed' : 'is-missed');
            const date = parseDate(event.date).toLocaleDateString(locale(), { day: '2-digit', month: 'short' });
            const details = document.createElement('span');
            details.innerHTML = `<strong>${date}</strong> · `;
            details.append(event.lessonTitle);
            const courseTag = document.createElement('span');
            courseTag.className = 'study-calendar-course-tag';
            courseTag.textContent = event.courseName || state.courseName || '';
            if (courseTag.textContent) details.append(courseTag);
            row.appendChild(details);
            if (today && !completed) {
                const todayLabel = document.createElement('span');
                todayLabel.className = 'study-calendar-today-label';
                todayLabel.textContent = t('study_calendar_today');
                row.appendChild(todayLabel);
            }
            if (past && !completed) {
                const reschedule = document.createElement('button');
                reschedule.type = 'button';
                reschedule.className = 'study-calendar-reschedule';
                reschedule.textContent = t('study_calendar_reschedule');
                reschedule.addEventListener('click', () => rescheduleEvent(event));
                row.appendChild(reschedule);
            } else if (past && completed) {
                const completedLabel = document.createElement('span');
                completedLabel.className = 'study-calendar-completed-label';
                completedLabel.textContent = t('study_calendar_completed');
                row.appendChild(completedLabel);
            }
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.setAttribute('aria-label', t('close'));
            remove.innerHTML = '<i class="fas fa-xmark"></i>';
            remove.addEventListener('click', () => {
                const courseEvents = loadEventsForCourse(event.courseId || state.courseId);
                saveEventsForCourse(event.courseId || state.courseId, courseEvents.filter(item => item.id !== event.id));
                renderCalendar();
                renderEvents();
            });
            row.appendChild(remove);
            container.appendChild(row);
        });
    }

    function renderDisciplines() {
        const select = document.getElementById('studyDisciplineSelect');
        if (!select) return;
        const disciplines = state.disciplines || [];
        const selectedId = state.selectedDiscipline?.id || '';
        select.innerHTML = `<option value="">${t('study_calendar_choose_discipline')}</option>` +
            disciplines.map(discipline => `<option value="${discipline.id}">${discipline.name}</option>`).join('');
        select.disabled = !disciplines.length;
        select.value = selectedId;
        state.selectedDiscipline = disciplines.find(discipline => discipline.id === selectedId) || null;
        updateWeeklyHours();
    }

    function renderWeekdayPicker() {
        const picker = document.getElementById('studyWeekdayPicker');
        if (!picker) return;
        const selectedDays = new Set([...picker.querySelectorAll('input:checked')].map(input => input.value));
        picker.innerHTML = Array.from({ length: 7 }, (_, day) => `<label><input type="checkbox" value="${day}" ${day >= 1 && day <= 5 ? 'checked' : ''}><span>${new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 7 + day)).replace('.', '')}</span></label>`).join('');
        if (selectedDays.size) {
            picker.querySelectorAll('input').forEach(input => { input.checked = selectedDays.has(input.value); });
        }
        picker.querySelectorAll('input').forEach(input => input.addEventListener('change', updateWeeklyHours));
    }

    function updateScheduleEndDate() {
        const endInput = document.getElementById('studyEndDate');
        const startInput = document.getElementById('studyStartDate');
        const selectedDays = [...document.querySelectorAll('#studyWeekdayPicker input:checked')].map(input => Number(input.value));
        const lessons = state?.selectedDiscipline?.lessons || [];
        if (!endInput || !startInput?.value || !selectedDays.length || !lessons.length) {
            if (endInput) endInput.value = '';
            return;
        }
        const date = parseDate(startInput.value);
        let lessonIndex = 0;
        while (lessonIndex < lessons.length) {
            if (selectedDays.includes(date.getDay())) lessonIndex++;
            if (lessonIndex < lessons.length) date.setDate(date.getDate() + 1);
        }
        endInput.value = dateKey(date);
    }

    function updateWeeklyHours() {
        const output = document.getElementById('studyWeeklyHours');
        const selectedDays = document.querySelectorAll('#studyWeekdayPicker input:checked').length;
        const lessonsOutput = document.getElementById('studyWeeklyLessons');
        if (lessonsOutput) {
            lessonsOutput.textContent = t('study_calendar_weekly_lessons', { count: selectedDays });
        }
        if (!output) return;
        const lessons = state?.selectedDiscipline?.lessons || [];
        const hours = lessons
            .slice(0, selectedDays)
            .reduce((total, lesson) => total + Number(lesson.totalDuration || 0), 0) / 60;
        output.textContent = t('study_calendar_weekly_hours', { hours: hours.toFixed(1) });
        updateScheduleEndDate();
    }

    function scheduleLesson() {
        const selectedDays = [...document.querySelectorAll('#studyWeekdayPicker input:checked')].map(input => Number(input.value));
        if (!selectedDays.length) {
            window.queueNotification?.(t('study_calendar_day_required'), 'error');
            return;
        }
        const lessons = state.selectedDiscipline?.lessons || [];
        if (!lessons.length) {
            window.queueNotification?.(t('study_calendar_discipline_required'), 'error');
            return;
        }
        const events = loadEvents();
        const startInput = document.getElementById('studyStartDate');
        const startKey = startInput?.value || state.selectedDate || dateKey(new Date());
        const start = parseDate(startKey);
        state.selectedDate = startKey;
        let lessonIndex = 0;
        for (let offset = 0; lessonIndex < lessons.length; offset++) {
            const date = new Date(start);
            date.setDate(start.getDate() + offset);
            if (selectedDays.includes(date.getDay())) {
                const key = dateKey(date);
                const lesson = lessons[lessonIndex];
                if (!events.some(event => event.date === key && event.courseId === state.courseId && event.lessonId === lesson.id)) {
                    events.push({
                        id: `${state.courseId}-${key}-${lesson.id}-${Date.now()}`,
                        date: key,
                        courseId: state.courseId,
                        courseName: state.courseName,
                        lessonId: lesson.id,
                        scheduleDays: selectedDays,
                        lessonTitle: lesson.videos?.[0]?.title || `${t('lesson_label')} ${lesson.id + 1}`
                    });
                    lessonIndex++;
                }
            }
        }
        saveEvents(events);
        renderCalendar();
        renderEvents();
        closeScheduleForm();
        window.queueNotification?.(t('study_calendar_saved'), 'success');
    }

    function closeScheduleForm() {
        const form = document.getElementById('studyCalendarForm');
        form?.setAttribute('hidden', '');
        document.getElementById('studyScheduleOpenBtn')?.setAttribute('aria-expanded', 'false');
    }

    function showStudyCalendar(courseId, courseName, lessons, disciplines = null) {
        const calendar = document.getElementById('studyCalendar');
        if (!calendar || !courseId || !Array.isArray(lessons) || !lessons.length) return;
        const availableDisciplines = disciplines === null
            ? (window.getStudyCalendarDisciplines?.() || [{ id: 'all', name: t('study_calendar_all_disciplines'), lessons }])
            : disciplines;
        state = { courseId, courseName, lessons, disciplines: availableDisciplines, month: new Date(), selectedDate: dateKey(new Date()) };
        calendar.hidden = false;
        calendar.dataset.mode = 'course';
        const courseSelect = document.getElementById('studyCourseSelect');
        if (courseSelect) courseSelect.value = courseId;
        const courseLabel = document.getElementById('studyCalendarCourse');
        if (courseLabel) courseLabel.textContent = courseName || '';
        setScheduleDates();
        document.getElementById('studyCalendarEmptyState')?.setAttribute('hidden', '');
        document.getElementById('studyCalendarForm')?.setAttribute('hidden', '');
        document.getElementById('studyScheduleOpenBtn')?.setAttribute('aria-expanded', 'false');
        renderDisciplines();
        renderWeekdayPicker();
        updateWeeklyHours();
        renderCalendar();
        renderEvents();
    }

    function showStudentCalendar() {
        const calendar = document.getElementById('studyCalendar');
        if (!calendar) return;
        state = { courseId: 'student', courseName: '', lessons: [], disciplines: [], month: new Date(), selectedDate: dateKey(new Date()) };
        calendar.hidden = false;
        calendar.dataset.mode = 'student';
        const courseLabel = document.getElementById('studyCalendarCourse');
        if (courseLabel) courseLabel.textContent = '';
        const courseSelect = document.getElementById('studyCourseSelect');
        if (courseSelect) {
            courseSelect.innerHTML = `<option value="">${t('study_calendar_choose_course')}</option>`;
            (window.getStudyCalendarCourses?.() || []).forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.name;
                courseSelect.appendChild(option);
            });
            courseSelect.value = '';
        }
        const emptyState = document.getElementById('studyCalendarEmptyState');
        if (emptyState) {
            emptyState.textContent = t('study_calendar_select_course');
            emptyState.removeAttribute('hidden');
        }
        document.querySelector('.study-calendar-form')?.setAttribute('hidden', '');
        setScheduleDates();
        document.getElementById('studyScheduleOpenBtn')?.setAttribute('aria-expanded', 'false');
        renderCalendar();
        renderEvents();
    }

    function toggleStudyCalendar() {
        const calendar = document.getElementById('studyCalendar');
        if (!calendar) return;
        if (calendar.hidden) {
            showStudentCalendar();
        } else {
            calendar.hidden = true;
        }
    }

    function init() {
        const calendar = document.getElementById('studyCalendar');
        if (calendar && calendar.parentElement !== document.body) {
            document.body.appendChild(calendar);
        }
        document.getElementById('studyCalendarPrevious')?.addEventListener('click', () => {
            if (!state) return;
            state.month.setMonth(state.month.getMonth() - 1);
            renderCalendar();
        });
        document.getElementById('studyCalendarNext')?.addEventListener('click', () => {
            if (!state) return;
            state.month.setMonth(state.month.getMonth() + 1);
            renderCalendar();
        });
        document.getElementById('studyScheduleOpenBtn')?.addEventListener('click', () => {
            const form = document.getElementById('studyCalendarForm');
            const button = document.getElementById('studyScheduleOpenBtn');
            if (!form) {
                button?.setAttribute('aria-expanded', 'false');
                return;
            }
            const isHidden = form.hidden;
            form.hidden = !isHidden;
            button?.setAttribute('aria-expanded', String(isHidden));
            if (isHidden) {
                setScheduleDates();
                document.getElementById('studyCourseSelect')?.focus();
            }
        });
        document.getElementById('studyScheduleCloseBtn')?.addEventListener('click', closeScheduleForm);
        document.getElementById('studyStartDate')?.addEventListener('change', event => {
            state.selectedDate = event.target.value;
            const endInput = document.getElementById('studyEndDate');
            if (endInput) endInput.min = event.target.value;
            updateScheduleEndDate();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !document.getElementById('studyCalendarForm')?.hidden) closeScheduleForm();
        });
        document.getElementById('studyCourseSelect')?.addEventListener('change', async event => {
            const courseId = event.target.value;
            if (!courseId) return;
            const form = document.getElementById('studyCalendarForm');
            const wasOpen = form && !form.hidden;
            try {
                const course = await window.loadStudyCalendarCourse?.(courseId);
                if (!course?.lessons?.length || !course?.disciplines?.length) throw new Error('Curso sem disciplinas disponíveis.');
                showStudyCalendar(course.id, course.name, course.lessons, course.disciplines);
                if (wasOpen && form) {
                    form.removeAttribute('hidden');
                    document.getElementById('studyScheduleOpenBtn')?.setAttribute('aria-expanded', 'true');
                }
            } catch (error) {
                console.error('[StudyCalendar] Falha ao carregar curso:', error);
                window.queueNotification?.(t('study_calendar_course_error'), 'error');
            }
        });
        document.getElementById('studyDisciplineSelect')?.addEventListener('change', event => {
            state.selectedDiscipline = state.disciplines.find(item => item.id === event.target.value) || null;
            updateWeeklyHours();
        });
        document.getElementById('studyScheduleButton')?.addEventListener('click', scheduleLesson);
        window.addEventListener('languageChanged', () => {
            if (!state) return;
            renderDisciplines();
            renderWeekdayPicker();
            renderCalendar();
            renderEvents();
        });
        window.addEventListener('studyProgressUpdated', () => {
            if (state) renderEvents();
        });
        window.showStudyCalendar = showStudyCalendar;
        window.showStudentCalendar = showStudentCalendar;
        window.toggleStudyCalendar = toggleStudyCalendar;
        window.hideStudyCalendar = () => {
            const calendar = document.getElementById('studyCalendar');
            if (calendar) calendar.hidden = true;
            document.getElementById('studyScheduleOpenBtn')?.setAttribute('aria-expanded', 'false');
            document.getElementById('studyCalendarToggle')?.setAttribute('aria-expanded', 'false');
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
