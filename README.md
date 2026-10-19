**System 2: Greenhouse Sensor Logger UI**

Quentin Loree

---

## Section 4.1: The Less-than-or-equal-4-Click User Journey Funnel

- **Starting State:** The page loads with an empty "Record Reading" form (Bay, pH, EC, Temp, RH) and a "No readings logged yet" message in the log panel. If `localStorage` already contains saved logs, they are displayed immediately.

- **Action 1: Data Entry & Real-Time Constraint Check.** The user selects a bay and types the four sensor values. An `input` event listener on each field compares the value to the set bounds and toggles a red `.input-error` class whenever the input violates the range.

- **Action 2: Log Submission.** Clicking **Record Reading** activates the form's `submit` event. The handler calls `preventDefault()`, validates every field, converts the temperature to °F, classifies the reading, builds a log object and puts it into the memory array. It then saves the array to `localStorage`

- **Action 3: Output Telemetry Inspection.** A new log card appears at the top of the log list, showing bay, timestamp, the four readings and a color coded status tag (Optimal, Warning or Critical Hazard). The "Latest Status" banner updates to match the status.

- **Action 4: Output Resolution.** The user clicks **Delete** on a resolved entry, or **Purge All Logs** to clear the history. Each action updates the array, `localStorage` and  DOM.

- **Terminal State:** The form is empty and ready for the next set of inputs. The log list shows only the entries that remain, or the empty-state message after a purge. `localStorage` matches what is on screen, so refreshing the browser reproduces the same view.

---

## Section 4.2: Don Norman Usability & Constraint Audit

| Norman Principle / Concept | System Context | Answer with Concrete Implementation Mechanism |
|---|---|---|
| **Gulf of Execution** | Typing numeric sensor metrics (pH, EC, Temp, Humidity) | Every `<input>` has a visible `<label for="...">` that includes its unit, e.g. "EC (mS/cm)", "Air Temperature", "Relative Humidity (%)". `placeholder` shows an example (`6.2`, `1.5`, `68`, `60`). `type="number"` brings up a numeric keypad if on mobile, and `step` (0.1 for pH, 0.01 for EC) signals the expected precision. A `<small class="hint">` under each field states the allowed range. The temperature unit `<select>` sits beside the Temp input so the unit is always clear. |
| **Gulf of Evaluation** | Ingesting sensor values after clicking "Record Reading" | After `submit` classifies the reading, JS injects a log card with `<span class="status-tag status-optimal / status-warning / status-critical">`. The tag carries a label as well as a color. A banner with `role="status"` and `aria-live="polite"` announces "Latest Status: ..." immediately. |
| **System Constraint** | Water pH boundaries (0.0 <= pH <= 14.0) | Each numeric input carries `type="number"`, `min`, `max`, `step` and `required` (for pH: `min="0" max="14" step="0.1" required`). If any field fails, the handler returns before the object is created, so improper data never reaches the array. |
| **Visual Feedback State** | Real-time input error / out-of-bounds | A `input` event listener compares the typed value with the `min` and `max`. If out of range it adds the CSS class `input-error` (with a red border, light red background), and fills `<small class="error-msg">` with a message stating "pH must be between 0 and 14". When the value is corrected, the class, attribute and message are removed. This happens before submission. |
| **Error Recovery** | Accidental or test data submissions | Each log card has its own **Delete** button (`data-id` attribute matches the log's `id`), and a **Purge All Logs** button that is in the log header. Purge uses `confirm()` to prevent misclicking and make sure you really want to delete all logs.|

---

## Section 4.3: Component, DOM Tree & Event Target Architecture

Legend: `[STATIC]` = pre-rendered in HTML, `[DYNAMIC]` = injected or modified by JavaScript. Only major CSS layout properties are shown.

```
- <body> [STATIC] (CSS: display: flex; flex-direction: column; min-height: 100vh)
  - <header class="site-header"> [STATIC] (CSS: display: flex; justify-content: space-between; align-items: center)
    - <h1> [STATIC] (Text: "Greenhouse Sensor Logger")
    - <nav aria-label="Primary"> [STATIC] (CSS: display: flex; gap)
      - <a href="#record-section"> [STATIC] (Text: "Record")
      - <a href="#log-section"> [STATIC] (Text: "Logs")
  - <main> [STATIC] (CSS: display: grid; grid-template-columns: 1fr 2fr; gap)
    - <section id="record-section"> [STATIC]
      - <h2> [STATIC] (Text: "Record Reading")
      - <form id="reading-form" novalidate> [STATIC] (Event: submit)
        - <div class="field"> [STATIC] (CSS: display: flex; flex-direction: column)
          - <label for="bay"> [STATIC] (Text: "Greenhouse Bay")
          - <select id="bay" required> [STATIC] (Options: Bay 1 to Bay 6; required)
        - <div class="field"> [STATIC]
          - <label for="ph"> [STATIC] (Text: "pH (unitless)")
          - <input id="ph" type="number" min="0" max="14" step="0.1" required placeholder="e.g. 6.2"> [STATIC] (Event: input)
          - <small class="error-msg"> [DYNAMIC]
        - <div class="field"> [STATIC]
          - <label for="ec"> [STATIC] (Text: "EC (mS/cm)")
          - <input id="ec" type="number" min="0" max="20" step="0.01" required placeholder="e.g. 1.5"> [STATIC] (Event: input)
          - <small class="error-msg"> [DYNAMIC]
        - <div class="field"> [STATIC]
          - <label for="temp"> [STATIC] (Text: "Air Temperature")
          - <input id="temp" type="number" min="0" max="150" step="0.1" required placeholder="e.g. 68"> [STATIC] (Event: input)
          - <select id="temp-unit"> [STATIC] (Options: °F, °C) (Event: change, updates min/max and re-validates Temp)
          - <small class="error-msg"> [DYNAMIC]
        - <div class="field"> [STATIC]
          - <label for="rh"> [STATIC] (Text: "Relative Humidity (%)")
          - <input id="rh" type="number" min="0" max="100" step="1" required placeholder="e.g. 60"> [STATIC] (Event: input)
          - <small class="error-msg"> [DYNAMIC]
        - <button type="submit" id="btn-record"> [STATIC] (Text: "Record Reading")
    - <section id="log-section"> [STATIC] (CSS: display: flex; flex-direction: column)
      - <header class="log-header"> [STATIC] (CSS: display: flex; justify-content: space-between; align-items: center)
        - <h2> [STATIC] (Text: "Telemetry Log")
        - <button id="btn-purge" type="button"> [STATIC] (Text: "Purge All Logs") (Event: click)
      - <section id="status-banner" role="status" aria-live="polite"> [DYNAMIC] (CSS: display: block)
        - <h3> [DYNAMIC] (Text: "Latest Status")
        - <p> [DYNAMIC] (Text: status result)
      - <section id="log-list"> [STATIC container] (CSS: display: flex; flex-direction: column; gap) (Event: click, delegated to .btn-delete)
        - <p class="empty-state"> [DYNAMIC] (Text: "No readings logged yet")
        - <article class="log-card" data-id="..."> [DYNAMIC] (CSS: display: grid)
          - <h3> [DYNAMIC] (Text: "Bay 3")
          - <time datetime="..."> [DYNAMIC]
          - <ul class="readings"> [DYNAMIC]
            - <li> [DYNAMIC] (x4: pH, EC, Temp °F, RH)
          - <span class="status-tag"> [DYNAMIC] (Text: Optimal / Warning / Critical Hazard)
          - <button class="btn-delete" data-id="..."> [DYNAMIC] (Text: "Delete") (Event: click via delegation on #log-list)
  - <footer> [STATIC] (CSS: text-align: center)
    - <p> [STATIC] (Text: course / student info)
- <window> (Event: DOMContentLoaded, loads logs from localStorage and renders them)
```

---

## Section 4.4: Data Schema

```javascript
const sensorLogSchema = {
  id: "String",         // Unique identifier
  bayId: "String",      // Greenhouse bay
  ph: "Number",         // Unitless 0 to 14
  ec: "Number",         // Electrical conductivity in mS/cm, 0 to 20
  tempF: "Number",      // Air temperature, always stored in °F it gets converted if entered in °C
  rh: "Number",         // Relative humidity in %, 0 to 100
  status: "String",     // "Optimal" | "Warning" | "Critical Hazard"
  timestamp: "String"   // Date-time
};

---

## Planned Classification Logic

```javascript
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

  if (critical) return "Critical Hazard";
  if (optimal) return "Optimal";
  return "Warning";
}
```