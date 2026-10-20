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
})();