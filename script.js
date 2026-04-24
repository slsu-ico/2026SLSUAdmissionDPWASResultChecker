async function loadAllData() {
  var statusEl = document.getElementById('dataStatus');
  statusEl.innerHTML = '<div class="loading-bar"><div class="spinner"></div>Preparing secure DPWAS qualifier lookup&hellip;</div>';
  try {
    var res = await fetch('/api/search-result', { cache: 'no-store' });
    var payload = await res.json();
    if (!res.ok || !payload.ready) {
      throw new Error(payload && payload.error ? payload.error : 'Secure lookup is not available.');
    }
    statusEl.innerHTML = '';
    document.getElementById('appInput').disabled = false;
    document.getElementById('checkBtn').disabled = false;
    document.getElementById('appInput').focus();
  } catch (err) {
    statusEl.innerHTML = '<div class="error-bar">&#9888;&#65039; Could not load secure DPWAS qualifier data. ' + err.message + '<br>Please refresh the page or contact the admission office.</div>';
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeAppNo(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function formatDateString(value) {
  var text = String(value || '').trim();
  if (!text) return text;
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return text;
}

function formatTimeString(value) {
  var text = String(value || '').trim();
  var match = text.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (match) {
    var hour = parseInt(match[1], 10);
    var minute = match[2];
    var period = match[3].toUpperCase();
    if (hour === 0) hour = 12;
    return (hour < 10 ? '0' : '') + hour + ':' + minute + ' ' + period;
  }
  return text;
}

async function checkResult() {
  var raw = document.getElementById('appInput').value.trim();
  var resultEl = document.getElementById('result');
  var buttonEl = document.getElementById('checkBtn');

  if (!raw) {
    resultEl.innerHTML = '<div class="result-box result-fail"><p style="font-size:14px;color:#8b4513;">&#9888;&#65039; Please enter your Application Number before checking.</p></div>';
    return;
  }

  var displayKey = raw.toUpperCase();
  var lookupKey = normalizeAppNo(raw);

  buttonEl.disabled = true;
  buttonEl.textContent = 'Checking...';

  try {
    var response = await fetch('/api/search-result?q=' + encodeURIComponent(lookupKey), {
      cache: 'no-store'
    });
    var payload = await response.json();

    if (!response.ok) {
      throw new Error(payload && payload.error ? payload.error : 'Lookup failed.');
    }

    if (payload.found) {
      if (payload.type === 'dpwas') {
        var displayDate = formatDateString(payload.date);
        var displayTime = formatTimeString(payload.time);
        var scheduleLabel = displayDate && displayTime
          ? displayDate + ', from ' + displayTime
          : 'your assigned schedule';
        resultEl.innerHTML =
          '<div class="result-box result-success">' +
            '<div class="res-header">' +
              '<div class="res-icon icon-success">&#127881;</div>' +
              '<div class="res-header-text">' +
                '<div class="res-tag">&#10003; DPWAS</div>' +
                '<h3>Thank you!</h3>' +
              '</div>' +
            '</div>' +
            '<div class="res-divider"></div>' +
            '<div class="res-row"><div class="res-label">App. No.</div><div class="res-val">' + displayKey + '</div></div>' +
            '<div class="res-row"><div class="res-label res-label-info">Date</div><div class="res-val program program-info">' + displayDate + '</div></div>' +
            '<div class="res-row"><div class="res-label res-label-info">Time</div><div class="res-val program program-info">' + displayTime + '</div></div>' +
            '<div class="congrats-note">' +
              'Thank you for your participation in the SLSU College Admissions 2026.<br><br>' +
              'The slots in the degree program you applied for have already been filled. However, you have been placed on the waitlist under the Degree Program with Available Slots (DPWAS) category at SLSU Main Campus.<br><br>' +
              'Your admission will depend on the availability of slots after the confirmation period, during which waitlisted applicants may be selected to fill vacated slots. Please note that being waitlisted under DPWAS does not guarantee admission to the university.<br><br>' +
              'You are advised to report on ' + scheduleLabel + ' at the SLSU Gymnasium in Lucban, Quezon. Kindly bring all required documents and arrive at least 30 minutes early. Rescheduling will not be accommodated.' +
            '</div>' +
            '<p class="screenshot-note">Screenshot this as proof of your schedule.</p>' +
          '</div>';
      } else if (payload.type === 'first_release') {
        resultEl.innerHTML =
          '<div class="result-box result-info">' +
            '<div class="res-header">' +
              '<div class="res-icon icon-info">&#10003;</div>' +
              '<div class="res-header-text">' +
                '<div class="res-tag res-tag-info">&#10003; First Release Qualified</div>' +
                '<h3 class="h3-info">Already Qualified!</h3>' +
              '</div>' +
            '</div>' +
            '<div class="res-divider"></div>' +
            '<div class="res-row"><div class="res-label res-label-info">App. No.</div><div class="res-val">' + displayKey + '</div></div>' +
            '<div class="res-row"><div class="res-label res-label-info">1st Choice Program</div><div class="res-val program program-info">' + payload.program + '</div></div>' +
            '<div class="congrats-note congrats-note-info">' +
              'You are already in the First admission results and qualified for your 1st choice of Program.' +
            '</div>' +
          '</div>';
      }
    } else {
      resultEl.innerHTML =
        '<div class="result-box result-warning">' +
          '<div class="res-header">' +
            '<div class="res-icon icon-warning">&#8505;</div>' +
            '<div class="res-header-text">' +
              '<div class="res-tag res-tag-warning">NOT ON DPWAS LIST</div>' +
            '</div>' +
          '</div>' +
          '<div class="res-divider-warning"></div>' +
          '<p class="advisory-text">Wait for the further announcement for reconsideration. You may visit the <a href="https://www.facebook.com/slsuMain" target="_blank" rel="noopener noreferrer" class="fb-link">SLSU Main FB Page</a> or <a href="https://www.facebook.com/SLSUAdmission" target="_blank" rel="noopener noreferrer" class="fb-link">SLSU Student Admission Office FB Page</a></p>' +
        '</div>';
    }
  } catch (err) {
    resultEl.innerHTML = '<div class="result-box result-fail"><p style="font-size:14px;color:#8b4513;">&#9888;&#65039; ' + escapeHtml(err.message) + '</p></div>';
  } finally {
    buttonEl.disabled = false;
    buttonEl.innerHTML = '<span class="btn-shine"></span>Check My Status';
  }

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function switchTab(btn, tab) {
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
}

loadAllData();
