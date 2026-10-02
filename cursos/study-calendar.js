(function () {
    'use strict';

    const STORAGE_PREFIX = 'ulivre_study_schedule_';
    const WEEKDAYS = [1, 2, 3, 4, 5];
    let state = null;
    let calendarInstance = null;

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

    function dateTimeKey(date, time) {
        return `${date}T${time}:00`;
    }

    function dateTimeAfterMinutes(date, time, duration) {
        const end = parseDate(date);
        const [hours, minutes] = time.split(':').map(Number);
        end.setHours(hours, minutes + duration, 0, 0);
        const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
        return dateTimeKey(dateKey(end), endTime);
    }

    function selectedWeekdays() {
        return [...document.querySelectorAll('#studyWeekdayPicker label')]
            .filter(label => label.querySelector('input[type="checkbox"]')?.checked)
            .map(label => ({
                day: Number(label.querySelector('input[type="checkbox"]').value),
                time: label.querySelector('input[type="time"]').value
            }));
    }

    function nativeDate(value) {
        if (value instanceof Date) return value;
        if (typeof value?.toDate === 'function') return value.toDate();
        return new Date(value);
    }

    function updateCalendarHeading() {
        const monthLabel = document.getElementById('studyCalendarMonth');
        if (!monthLabel || !calendarInstance) return;
        const currentDate = nativeDate(calendarInstance.getDate());
        const view = calendarInstance.getViewName();
        const options = view === 'day'
            ? { day: 'numeric', month: 'short', year: 'numeric' }
            : { month: 'long', year: 'numeric' };
        monthLabel.textContent = new Intl.DateTimeFormat(locale(), options).format(currentDate);
        document.querySelectorAll('[data-study-view]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.studyView === view));
        });
    }

    function calendarTheme() {
        const styles = getComputedStyle(document.documentElement);
        const color = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
        const border = `1px solid ${color('--border', '#d5d9dc')}`;
        return {
            common: {
                backgroundColor: color('--bg-card', '#fff'),
                border,
                dayName: { color: color('--text-secondary', '#59636a') },
                holiday: { color: color('--accent-orange', '#c45b36') },
                saturday: { color: color('--accent-blue', '#287ca5') },
                today: { color: color('--accent-teal', '#178477') },
                gridSelection: {
                    backgroundColor: 'color-mix(in srgb, var(--accent-teal) 14%, transparent)',
                    border: `1px solid ${color('--accent-teal', '#178477')}`
                }
            },
            week: {
                dayName: { borderLeft: border, borderTop: border, borderBottom: border, backgroundColor: 'transparent' },
                dayGrid: { borderRight: border, backgroundColor: 'transparent' },
                timeGrid: { borderRight: border },
                timeGridHalfHourLine: { borderBottom: border },
                timeGridHourLine: { borderBottom: border },
                nowIndicatorLabel: { color: color('--accent-teal', '#178477') },
                nowIndicatorToday: { border: `1px solid ${color('--accent-teal', '#178477')}` },
                today: { color: color('--accent-teal', '#178477'), backgroundColor: 'color-mix(in srgb, var(--accent-teal) 8%, transparent)' },
                weekend: { backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 65%, transparent)' },
                pastTime: { color: color('--text-tertiary', '#8a9297') },
                futureTime: { color: color('--text-primary', '#202629') }
            },
            month: {
                dayExceptThisMonth: { color: color('--text-tertiary', '#8a9297') },
                dayName: { borderLeft: border, backgroundColor: 'transparent' },
                weekend: { backgroundColor: 'color-mix(in srgb, var(--bg-tertiary) 65%, transparent)' },
                moreView: { border, boxShadow: '0 8px 24px rgb(0 0 0 / 18%)', backgroundColor: color('--bg-card', '#fff'), width: null, height: null },
                moreViewTitle: { backgroundColor: color('--bg-tertiary', '#f2f4f5') },
                gridCell: { headerHeight: 30, footerHeight: null }
            }
        };
    }

    function updateSelectedDate(value) {
        if (!state) return;
        const selectedDate = nativeDate(value);
        state.selectedDate = dateKey(selectedDate);
        const startInput = document.getElementById('studyStartDate');
        const endInput = document.getElementById('studyEndDate');
        if (startInput) {
            startInput.value = state.selectedDate;
            startInput.dispatchEvent(new Event('change'));
        }
        if (endInput) endInput.min = state.selectedDate;
        renderEvents();
    }

    function ensureCalendar() {
        const Calendar = window.tui?.Calendar;
        const container = document.getElementById('studyCalendarGrid');
        if (calendarInstance || !container || !Calendar) return Boolean(calendarInstance);
        const weekdayNames = Array.from({ length: 7 }, (_, day) => {
            const value = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 7 + day));
            return value.replace(/\.$/, '');
        });
        calendarInstance = new Calendar(container, {
            defaultView: 'month',
            isReadOnly: false,
            usageStatistics: false,
            gridSelection: { enableClick: true, enableDblClick: false },
            month: { dayNames: weekdayNames, startDayOfWeek: 0, isAlways6Weeks: false },
            week: { dayNames: weekdayNames, startDayOfWeek: 0, hourStart: 7, hourEnd: 22, eventView: ['allday', 'time'], taskView: false },
            theme: calendarTheme()
        });
        calendarInstance.on('selectDateTime', ({ start }) => updateSelectedDate(start));
        calendarInstance.on('clickEvent', ({ event }) => updateSelectedDate(event.start));
        container.addEventListener('click', event => {
            if (calendarInstance.getViewName() !== 'month') return;
            const cell = event.target.closest('.toastui-calendar-daygrid-cell');
            if (!cell) return;
            const cells = [...container.querySelectorAll('.toastui-calendar-daygrid-cell')];
            const cellIndex = cells.indexOf(cell);
            if (cellIndex < 0) return;
            const month = nativeDate(calendarInstance.getDate());
            const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
            updateSelectedDate(new Date(month.getFullYear(), month.getMonth(), cellIndex - firstDay.getDay() + 1));
        });
        calendarInstance.on('beforeUpdateEvent', ({ event, changes }) => {
            const scheduledEvent = event.raw?.scheduledEvent;
            if (!scheduledEvent || !changes.start) return;
            const movedStart = nativeDate(changes.start);
            const newDate = dateKey(movedStart);
            const hasTime = Boolean(scheduledEvent.time);
            const newTime = hasTime
                ? `${String(movedStart.getHours()).padStart(2, '0')}:${String(movedStart.getMinutes()).padStart(2, '0')}`
                : '';
            const courseId = scheduledEvent.courseId || state.courseId;
            const courseEvents = loadEventsForCourse(courseId).map(item => (
                item.id === scheduledEvent.id
                    ? { ...item, date: newDate, ...(hasTime ? { time: newTime } : {}) }
                    : item
            ));
            saveEventsForCourse(courseId, courseEvents);
            calendarInstance.updateEvent(event.id, event.calendarId, {
                ...changes,
                category: hasTime ? 'time' : 'allday',
                isAllday: !hasTime,
                start: hasTime ? dateTimeKey(newDate, newTime) : newDate,
                end: hasTime
                    ? dateTimeAfterMinutes(newDate, newTime, Number(scheduledEvent.duration) || 60)
                    : newDate
            });
            renderEvents();
        });
        return true;
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

    function renderCalendar(resetDate = false) {
        if (!state || !ensureCalendar()) {
            console.error('[StudyCalendar] Toast UI Calendar não foi carregado.');
            return;
        }
        applyCalendarLocale();
        const weekdayNames = Array.from({ length: 7 }, (_, day) => {
            const value = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 7 + day));
            return value.replace(/\.$/, '');
        });
        const events = loadEvents();
        const eventTimeRanges = events.filter(event => event.time).map(event => {
            const [hour, minute] = event.time.split(':').map(Number);
            return {
                start: hour,
                end: Math.ceil((hour * 60 + minute + (Number(event.duration) || 60)) / 60)
            };
        });
        const hourStart = Math.max(0, Math.min(7, ...eventTimeRanges.map(range => range.start)));
        const hourEnd = Math.min(24, Math.max(22, ...eventTimeRanges.map(range => range.end)));
        calendarInstance.setOptions({
            month: { dayNames: weekdayNames },
            week: { dayNames: weekdayNames, hourStart, hourEnd, eventView: ['allday', 'time'] },
            theme: calendarTheme()
        });
        if (resetDate) calendarInstance.setDate(state.month);
        const courses = state.courseId === 'student'
            ? (window.getStudyCalendarCourses?.() || [])
            : [{ id: state.courseId, name: state.courseName || '' }];
        const courseById = new Map(courses.map(course => [String(course.id), course]));
        events.forEach(event => {
            const courseId = String(event.courseId || state.courseId);
            if (!courseById.has(courseId)) courseById.set(courseId, { id: courseId, name: event.courseName || '' });
        });
        const palette = [
            ['#147d73', '#ffffff'], ['#2677a5', '#ffffff'], ['#568a3c', '#ffffff'],
            ['#b05a36', '#ffffff'], ['#a24764', '#ffffff']
        ];
        const calendars = [...courseById.values()].map((course, index) => {
            const [backgroundColor, color] = palette[index % palette.length];
            return {
                id: String(course.id),
                name: course.name,
                color,
                backgroundColor,
                dragBackgroundColor: backgroundColor,
                borderColor: backgroundColor
            };
        });
        const colorsByCourse = new Map(calendars.map(item => [item.id, item.backgroundColor]));
        calendarInstance.setCalendars(calendars);
        calendarInstance.clear();
        calendarInstance.createEvents(events.map(event => {
            const courseId = String(event.courseId || state.courseId);
            const completed = isLessonCompleted(event);
            const past = isPast(event);
            const today = isToday(event);
            const backgroundColor = completed
                ? '#47834a'
                : past
                    ? '#b05a36'
                    : today
                        ? '#2677a5'
                        : colorsByCourse.get(courseId) || '#147d73';
            const duration = Math.max(1, Math.round(Number(event.duration) || 60));
            const hasTime = Boolean(event.time);
            return {
                id: String(event.id),
                calendarId: courseId,
                title: event.lessonTitle || t('study_calendar_lesson'),
                start: hasTime ? dateTimeKey(event.date, event.time) : event.date,
                end: hasTime ? dateTimeAfterMinutes(event.date, event.time, duration) : event.date,
                category: hasTime ? 'time' : 'allday',
                isAllday: !hasTime,
                color: '#ffffff',
                backgroundColor,
                dragBackgroundColor: backgroundColor,
                borderColor: backgroundColor,
                raw: { scheduledEvent: event }
            };
        }));
        updateCalendarHeading();
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
            const dateLabel = document.createElement('strong');
            dateLabel.textContent = date;
            details.append(dateLabel, document.createTextNode(event.time ? ` · ${event.time} · ` : ' · '), event.lessonTitle);
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
        const previousSettings = new Map([...picker.querySelectorAll('label')].map(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            return [Number(checkbox.value), {
                checked: checkbox.checked,
                time: label.querySelector('input[type="time"]').value
            }];
        }));
        const fragment = document.createDocumentFragment();
        Array.from({ length: 7 }, (_, day) => {
            const weekday = new Date(2024, 0, 7 + day);
            const dayName = new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(weekday).replace(/\.$/, '');
            const fullDayName = new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(weekday);
            const settings = previousSettings.get(day);
            const label = document.createElement('label');
            label.className = 'study-weekday-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = String(day);
            checkbox.checked = settings ? settings.checked : WEEKDAYS.includes(day);
            const name = document.createElement('span');
            name.textContent = dayName;
            const time = document.createElement('input');
            time.type = 'time';
            time.className = 'study-weekday-time';
            time.value = settings?.time || '19:00';
            time.disabled = !checkbox.checked;
            time.setAttribute('aria-label', `${fullDayName}: ${t('study_calendar_day_time')}`);
            checkbox.addEventListener('change', () => {
                time.disabled = !checkbox.checked;
                updateWeeklyHours();
            });
            time.addEventListener('change', updateWeeklyHours);
            label.append(checkbox, name, time);
            fragment.appendChild(label);
        });
        picker.replaceChildren(fragment);
    }

    function updateScheduleEndDate() {
        const endInput = document.getElementById('studyEndDate');
        const startInput = document.getElementById('studyStartDate');
        const selectedDays = selectedWeekdays().map(item => item.day);
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
        const selectedDays = selectedWeekdays().length;
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
        const scheduleDays = selectedWeekdays();
        const selectedDays = scheduleDays.map(item => item.day);
        if (!selectedDays.length) {
            window.queueNotification?.(t('study_calendar_day_required'), 'error');
            return;
        }
        if (scheduleDays.some(item => !item.time)) {
            window.queueNotification?.(t('study_calendar_time_required'), 'error');
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
                const daySchedule = scheduleDays.find(item => item.day === date.getDay());
                if (!events.some(event => event.date === key && event.courseId === state.courseId && event.lessonId === lesson.id)) {
                    events.push({
                        id: `${state.courseId}-${key}-${lesson.id}-${Date.now()}`,
                        date: key,
                        courseId: state.courseId,
                        courseName: state.courseName,
                        lessonId: lesson.id,
                        time: daySchedule.time,
                        duration: Math.max(1, Math.round(Number(lesson.totalDuration) || 60)),
                        scheduleDays: selectedDays,
                        lessonTitle: lesson.videos?.[0]?.title || `${t('lesson_label')} ${lesson.id + 1}`
                    });
                }
                lessonIndex++;
            }
        }
        saveEvents(events);
        renderCalendar(true);
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
        renderCalendar(true);
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
            if (!calendarInstance) return;
            calendarInstance.prev();
            state.month = nativeDate(calendarInstance.getDate());
            updateCalendarHeading();
        });
        document.getElementById('studyCalendarNext')?.addEventListener('click', () => {
            if (!calendarInstance) return;
            calendarInstance.next();
            state.month = nativeDate(calendarInstance.getDate());
            updateCalendarHeading();
        });
        document.getElementById('studyCalendarToday')?.addEventListener('click', () => {
            if (!calendarInstance) return;
            calendarInstance.today();
            state.month = new Date();
            updateCalendarHeading();
        });
        document.querySelectorAll('[data-study-view]').forEach(button => {
            button.addEventListener('click', () => {
                if (!calendarInstance) return;
                calendarInstance.changeView(button.dataset.studyView);
                updateCalendarHeading();
            });
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
