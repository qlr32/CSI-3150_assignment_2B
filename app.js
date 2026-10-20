(function () {
    'use strict';

    const STORAGE_KEY = 'agrosens_telemetry_records_v1';

    // Allowed ranges for each  field.
    const LIMITS = {
        ph: { label: 'pH', min: 0, max: 14, unit: '' },
        ec: { label: 'EC', min: 0, max: 20, unit: ' mS/cm' },
        rh: { label: 'Relative humidity', min: 0, max: 100, unit: '%' },
        temp: {
            F: { label: 'Air temperature', min: 0, max: 150, unit: ' °F' },
            C: { label: 'Air temperature', min: -17.7, max: 65.5, unit: ' °C' }
        }
    };

    const STATUS_CLASS = {
        'Optimal': 'status-optimal',
        'Warning': 'status-warning',
        'Critical Hazard': 'status-critical'
    };

    let logs = [];

    /* DOM */
    const form = document.getElementById('reading-form');
    const formAlert = document.getElementById('form-alert');
    const bayEl = document.getElementById('bay');
    const phEl = document.getElementById('ph');
    const ecEl = document.getElementById('ec');
    const tempEl = document.getElementById('temp');
    const tempUnitEl = document.getElementById('temp-unit');
    const tempHint = document.getElementById('temp-hint');
    const rhEl = document.getElementById('rh');
    const purgeBtn = document.getElementById('btn-purge');
    const banner = document.getElementById('status-banner');
    const logList = document.getElementById('log-list');
    const countBadge = document.getElementById('count-badge');

    const fields = [bayEl, phEl, ecEl, tempEl, rhEl];

    /* classification */
    function classify({ ph, tempF, ec, rh }) {
        const critical =
            (ph < 5.0 || ph > 7.5) &&
            (tempF < 55 || tempF > 95) &&
            (ec < 0.2 || ec > 4.5) &&
            (rh < 30 || rh > 90);

        const optimal =
            ph >= 5.5 && ph <= 6.5 &&
            tempF >= 64.4 && tempF <= 71.6 &&
            ec >= 1.0 && ec <= 2.0 &&
            rh >= 50 && rh <= 70;

        if (critical) return 'Critical Hazard';
        if (optimal) return 'Optimal';
        return 'Warning';
    }

    function toFahrenheit(value, unit) {
        const f = unit === 'C' ? (value * 9) / 5 + 32 : value;
        return Math.round(f * 10) / 10;
    }
    /* validation */
    function getLimits(el) {
        if (el === tempEl) return LIMITS.temp[tempUnitEl.value];
        return LIMITS[el.id];
    }

    // returns an error message, or '' when the field is valid
    function validateField(el) {
        if (el === bayEl) {
            return el.value === '' ? 'Select a greenhouse bay.' : '';
        }

        const limits = getLimits(el);
        const raw = el.value.trim();
        if (raw === '' || el.validity.badInput) {
            return limits.label + ' is required and must be a number.';
        }

        const value = Number(raw);
        if (!Number.isFinite(value) || value < limits.min || value > limits.max) {
            return limits.label + ' must be between ' + limits.min + ' and ' +
                limits.max + limits.unit + '.';
        }
        return '';
    }

    function showFieldError(el, message) {
        const msgEl = el.closest('.field').querySelector('.error-msg');
        msgEl.textContent = message;
        el.classList.toggle('input-error', message !== '');
        if (message) {
            el.setAttribute('aria-invalid', 'true');
        } else {
            el.removeAttribute('aria-invalid');
        }
    }

    function refreshAlert() {
        const messages = fields
            .map(function (el) {
                return el.classList.contains('input-error')
                    ? el.closest('.field').querySelector('.error-msg').textContent
                    : '';
            })
            .filter(Boolean);

        if (messages.length === 0) {
            formAlert.hidden = true;
            formAlert.replaceChildren();
            return;
        }

        const title = document.createElement('strong');
        title.textContent = 'Reading not recorded. Fix the following:';
        const list = document.createElement('ul');
        messages.forEach(function (msg) {
            const li = document.createElement('li');
            li.textContent = msg;
            list.appendChild(li);
        });
        formAlert.replaceChildren(title, list);
        formAlert.hidden = false;
    }

    function onFieldInput(event) {
        const el = event.target;
        showFieldError(el, validateField(el));
        if (!formAlert.hidden) refreshAlert();
    }

    function updateTempBounds() {
        const limits = LIMITS.temp[tempUnitEl.value];
        tempEl.min = limits.min;
        tempEl.max = limits.max;
        tempEl.placeholder = tempUnitEl.value === 'F' ? 'e.g. 68' : 'e.g. 20';
        tempHint.textContent = 'Allowed range: ' + limits.min + ' to ' + limits.max + limits.unit;
    }

    function onUnitChange() {
        updateTempBounds();
        if (tempEl.value.trim() !== '' || tempEl.classList.contains('input-error')) {
            showFieldError(tempEl, validateField(tempEl));
            if (!formAlert.hidden) refreshAlert();
        }
    }

    /* submit */
    function onSubmit(event) {
        event.preventDefault();

        let firstInvalid = null;
        fields.forEach(function (el) {
            const message = validateField(el);
            showFieldError(el, message);
            if (message && !firstInvalid) firstInvalid = el;
        });

        if (firstInvalid) {
            refreshAlert();
            firstInvalid.focus();
            return;
        }

        const unit = tempUnitEl.value;
        const record = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            bayId: bayEl.value,
            ph: Number(phEl.value),
            ec: Number(ecEl.value),
            tempF: toFahrenheit(Number(tempEl.value), unit),
            rh: Number(rhEl.value),
            status: '',
            timestamp: new Date().toISOString()
        };
        record.status = classify(record);

        logs.unshift(record); // newest first
        saveLogs();
        render();

        form.reset();
        updateTempBounds();
        fields.forEach(function (el) { showFieldError(el, ''); });
        refreshAlert();
        bayEl.focus();
    }

    function saveLogs() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        } catch (err) {
            console.error('Could not save readings to localStorage:', err);
        }
    }

    function isValidRecord(r) {
        return r && typeof r === 'object' &&
            typeof r.id === 'string' &&
            typeof r.bayId === 'string' &&
            Number.isFinite(r.ph) && Number.isFinite(r.ec) &&
            Number.isFinite(r.tempF) && Number.isFinite(r.rh) &&
            Object.prototype.hasOwnProperty.call(STATUS_CLASS, r.status) &&
            typeof r.timestamp === 'string';
    }

    function loadLogs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(isValidRecord) : [];
        } catch (err) {
            console.error('Could not read saved readings; starting empty:', err);
            return [];
        }
    }

    /* rendering */
    function makeReadingItem(label, value) {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.className = 'label';
        name.textContent = label;
        li.append(name, value);
        return li;
    }

    function buildCard(log) {
        const card = document.createElement('article');
        card.className = 'log-card ' + STATUS_CLASS[log.status];
        card.dataset.id = log.id;

        const title = document.createElement('h3');
        title.textContent = log.bayId;

        const time = document.createElement('time');
        time.dateTime = log.timestamp;
        const date = new Date(log.timestamp);
        time.textContent = isNaN(date) ? log.timestamp : date.toLocaleString();

        const readings = document.createElement('ul');
        readings.className = 'readings';
        readings.append(
            makeReadingItem('pH', String(log.ph)),
            makeReadingItem('EC', log.ec + ' mS/cm'),
            makeReadingItem('Temp', log.tempF + ' °F'),
            makeReadingItem('RH', log.rh + '%')
        );

        const tag = document.createElement('span');
        tag.className = 'status-tag ' + STATUS_CLASS[log.status];
        tag.textContent = log.status;

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn-delete';
        del.dataset.id = log.id;
        del.textContent = 'Delete';
        del.setAttribute('aria-label', 'Delete reading for ' + log.bayId);

        card.append(title, time, readings, tag, del);
        return card;
    }

    function renderBanner() {
        if (logs.length === 0) {
            banner.hidden = true;
            banner.className = '';
            banner.replaceChildren();
            return;
        }
        const latest = logs[0];
        const heading = document.createElement('h3');
        heading.textContent = 'Latest Status';
        const text = document.createElement('p');
        text.textContent = latest.bayId + ': ' + latest.status;
        banner.replaceChildren(heading, text);
        banner.className = STATUS_CLASS[latest.status];
        banner.hidden = false;
    }

    function render() {
        const fragment = document.createDocumentFragment();

        if (logs.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No readings logged yet. Fill in the form to add one.';
            fragment.appendChild(empty);
        } else {
            logs.forEach(function (log) {
                fragment.appendChild(buildCard(log));
            });
        }

        logList.replaceChildren(fragment);

        countBadge.textContent = logs.length;
        countBadge.setAttribute('aria-label', logs.length + (logs.length === 1 ? ' reading' : ' readings'));
        purgeBtn.disabled = logs.length === 0;
        renderBanner();
    }

    function onLogListClick(event) {
        const btn = event.target.closest('.btn-delete');
        if (!btn) return;
        const id = btn.dataset.id;
        logs = logs.filter(function (log) { return log.id !== id; });
        saveLogs();
        render();
    }

    function onPurge() {
        if (logs.length === 0) return;
        if (!window.confirm('Delete all ' + logs.length + ' logged readings? This cannot be undone.')) return;
        logs = [];
        saveLogs();
        render();
    }

    function init() {
        logs = loadLogs();
        updateTempBounds();
        render();

        form.addEventListener('submit', onSubmit);
        [phEl, ecEl, tempEl, rhEl].forEach(function (el) {
            el.addEventListener('input', onFieldInput);
        });
        bayEl.addEventListener('change', onFieldInput);
        tempUnitEl.addEventListener('change', onUnitChange);
        logList.addEventListener('click', onLogListClick);
        purgeBtn.addEventListener('click', onPurge);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
