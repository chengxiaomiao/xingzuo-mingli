function toggleTime() {
  const mode = document.getElementById('timeMode').value;
  const precise = document.getElementById('preciseBox');
  const shichen = document.getElementById('shichen');
  if (mode === 'precise') { precise.style.display = 'flex'; shichen.style.display = 'none'; }
  else { precise.style.display = 'none'; shichen.style.display = 'block'; }
}

window.onload = async function () {
  if (!requireAuth()) return;
  const recordId = getParam('recordId');
  if (recordId) {
    const data = await api('/profiles/' + recordId);
    if (data.success) {
      const b = data.birthInfo;
      document.getElementById('personName').value = data.personName || '';
      document.getElementById('calendarType').value = b.calendarType || 'solar';
      document.getElementById('year').value = b.year;
      document.getElementById('month').value = b.month;
      document.getElementById('day').value = b.day;
      document.getElementById('timeMode').value = b.timeMode || 'precise';
      toggleTime();
      if (b.timeMode === 'precise') {
        document.getElementById('hour').value = b.hour != null ? b.hour : 12;
        document.getElementById('minute').value = b.minute != null ? b.minute : 0;
      } else {
        document.getElementById('shichen').value = b.range || '午时';
      }
      document.getElementById('gender').value = b.gender || '男';
      document.getElementById('city').value = b.city || '';
    }
  }
};

async function doSave() {
  const msg = document.getElementById('msg');
  msg.textContent = '';
  const personName = document.getElementById('personName').value.trim();
  if (!personName) { msg.textContent = '请填写姓名/称呼'; return; }
  const city = document.getElementById('city').value.trim();
  if (!city) { msg.textContent = '请填写出生城市'; return; }

  const timeMode = document.getElementById('timeMode').value;
  const birthInfo = {
    calendarType: document.getElementById('calendarType').value,
    year: parseInt(document.getElementById('year').value),
    month: parseInt(document.getElementById('month').value),
    day: parseInt(document.getElementById('day').value),
    timeMode,
    gender: document.getElementById('gender').value,
    city
  };
  if (timeMode === 'precise') {
    birthInfo.hour = parseInt(document.getElementById('hour').value);
    birthInfo.minute = parseInt(document.getElementById('minute').value);
    birthInfo.range = null;
  } else {
    birthInfo.range = document.getElementById('shichen').value;
    birthInfo.hour = null;
    birthInfo.minute = null;
  }

  const recordId = getParam('recordId');
  const body = { personName, birthInfo };
  if (recordId) body.recordId = recordId;

  const data = await api('/profiles', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (data.success) {
    location.href = 'result.html?recordId=' + data._id;
  } else {
    msg.textContent = data.message || '保存失败';
  }
}
