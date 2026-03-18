/**
 * user.js - 사용자 차량 조회 로직
 * 서버(data/vehicles.json)에서만 데이터 로드
 */

(function() {
  const searchBtn = document.getElementById('searchBtn');
  const vehicleInput = document.getElementById('vehicleNumber');
  const passwordInput = document.getElementById('password');
  const loading = document.getElementById('loading');
  const errorMsg = document.getElementById('errorMsg');
  const result = document.getElementById('result');
  const vehicleInfo = document.getElementById('vehicleInfo');
  const ownerName = document.getElementById('ownerName');
  const phoneResult = document.getElementById('phoneResult');
  const selectList = document.getElementById('selectList');
  const selectListItems = document.getElementById('selectListItems');

  const moveRequestBtn = document.getElementById('moveRequestBtn');
  const moveRequestMsg = document.getElementById('moveRequestMsg');

  let cachedData = null;
  let cachedPassword = '';
  let currentVehicle = null;

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.add('show');
    result.classList.remove('show');
    selectList.classList.remove('show');
    selectList.style.display = 'none';
  }

  function hideMessages() {
    errorMsg.classList.remove('show');
    result.classList.remove('show');
    selectList.classList.remove('show');
    selectList.style.display = 'none';
  }

  function setLoading(on) {
    loading.classList.toggle('show', on);
    searchBtn.disabled = on;
  }

  function getLast4(vehicleNumber) {
    const digits = vehicleNumber.replace(/\D/g, '');
    return digits.slice(-4);
  }

  async function loadData() {
    const response = await fetch('/api/vehicles');
    if (!response.ok) throw new Error('데이터를 불러올 수 없습니다.');
    return response.json();
  }

  async function search() {
    hideMessages();
    const input = vehicleInput.value.trim();
    const password = passwordInput.value;

    if (!input) { showError('차량번호 뒷 4자리를 입력해주세요.'); return; }
    if (!/^\d{4}$/.test(input)) { showError('숫자 4자리를 입력해주세요.'); return; }
    if (!password) { showError('조회 비밀번호를 입력해주세요.'); return; }

    setLoading(true);

    try {
      const data = await loadData();

      if (!data.lookupPasswordHash || !data.lookupSalt) {
        showError('시스템이 아직 설정되지 않았습니다. 관리자에게 문의하세요.');
        setLoading(false);
        return;
      }

      const isValidPw = await CryptoUtil.verifyPassword(password, data.lookupSalt, data.lookupPasswordHash);
      if (!isValidPw) { showError('조회 비밀번호가 일치하지 않습니다.'); setLoading(false); return; }

      const matches = data.vehicles.filter(v => getLast4(v.vehicleNumber) === input);
      if (matches.length === 0) { showError('등록되지 않은 차량번호입니다.'); setLoading(false); return; }

      cachedData = data;
      cachedPassword = password;

      if (matches.length === 1) {
        await showResult(matches[0], data, password);
      } else {
        showSelectList(matches);
      }
    } catch (err) {
      console.error(err);
      showError('조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  function showSelectList(vehicles) {
    selectListItems.innerHTML = '';
    vehicles.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline select-item';
      btn.textContent = v.vehicleNumber + (v.name ? ' (' + v.name + ')' : '');
      btn.addEventListener('click', async () => {
        selectList.classList.remove('show');
        selectList.style.display = 'none';
        setLoading(true);
        try { await showResult(v, cachedData, cachedPassword); }
        catch (e) { showError('조회 중 오류가 발생했습니다.'); }
        finally { setLoading(false); }
      });
      selectListItems.appendChild(btn);
    });
    selectList.style.display = 'block';
    selectList.classList.add('show');
    result.classList.remove('show');
  }

  async function showResult(vehicle, data, password) {
    const phone = await CryptoUtil.decrypt(vehicle.phoneEncrypted, password, data.lookupSalt);
    vehicleInfo.textContent = '차량번호: ' + vehicle.vehicleNumber;
    ownerName.textContent = vehicle.name ? '이름: ' + vehicle.name : '';
    phoneResult.innerHTML = '<a href="tel:' + phone + '">' + formatPhone(phone) + '</a>';
    currentVehicle = vehicle;
    moveRequestBtn.style.display = '';
    moveRequestMsg.textContent = '';
    moveRequestMsg.className = 'move-request-msg';
    result.classList.add('show');
    selectList.classList.remove('show');
    selectList.style.display = 'none';
  }

  async function handleMoveRequest() {
    if (!currentVehicle) return;
    moveRequestBtn.disabled = true;
    moveRequestBtn.textContent = '요청 중...';
    try {
      const resp = await fetch('/api/move-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: currentVehicle.vehicleNumber,
          name: currentVehicle.name || ''
        })
      });
      const data = await resp.json();
      if (data.success) {
        moveRequestMsg.textContent = '차량이동 요청이 전송되었습니다.';
        moveRequestMsg.className = 'move-request-msg success';
        moveRequestBtn.style.display = 'none';
      } else {
        moveRequestMsg.textContent = data.error || '요청에 실패했습니다.';
        moveRequestMsg.className = 'move-request-msg error';
      }
    } catch (e) {
      moveRequestMsg.textContent = '서버 연결에 실패했습니다.';
      moveRequestMsg.className = 'move-request-msg error';
    }
    moveRequestBtn.disabled = false;
    moveRequestBtn.textContent = '🚗 차량이동 요청';
  }

  function formatPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7);
    if (digits.length === 10) return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
    return phone;
  }

  searchBtn.addEventListener('click', search);
  moveRequestBtn.addEventListener('click', handleMoveRequest);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  vehicleInput.addEventListener('keydown', e => { if (e.key === 'Enter') passwordInput.focus(); });
})();
