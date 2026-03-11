/**
 * user.js - 사용자 차량 조회 로직
 * 차량번호 뒷 4자리로 검색, 동일 번호 시 선택
 */

(function() {
  const searchBtn = document.getElementById('searchBtn');
  const vehicleInput = document.getElementById('vehicleNumber');
  const passwordInput = document.getElementById('password');
  const loading = document.getElementById('loading');
  const errorMsg = document.getElementById('errorMsg');
  const result = document.getElementById('result');
  const vehicleInfo = document.getElementById('vehicleInfo');
  const phoneResult = document.getElementById('phoneResult');
  const selectList = document.getElementById('selectList');
  const selectListItems = document.getElementById('selectListItems');

  const STORAGE_KEY = 'carSearchAppData';

  // 검색 후 비밀번호 검증 완료된 데이터를 캐시
  let cachedData = null;
  let cachedPassword = '';

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

  /**
   * 차량번호에서 숫자만 추출 후 뒤 4자리 반환
   */
  function getLast4(vehicleNumber) {
    const digits = vehicleNumber.replace(/\D/g, '');
    return digits.slice(-4);
  }

  async function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.vehicles && parsed.vehicles.length > 0) return parsed;
      } catch (e) {}
    }
    const response = await fetch('data/vehicles.json?' + Date.now());
    if (!response.ok) throw new Error('데이터를 불러올 수 없습니다.');
    return response.json();
  }

  async function search() {
    hideMessages();
    const input = vehicleInput.value.trim();
    const password = passwordInput.value;

    if (!input) {
      showError('차량번호 뒷 4자리를 입력해주세요.');
      return;
    }
    if (!/^\d{4}$/.test(input)) {
      showError('숫자 4자리를 입력해주세요.');
      return;
    }
    if (!password) {
      showError('조회 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const data = await loadData();

      if (!data.lookupPasswordHash || !data.lookupSalt) {
        showError('시스템이 아직 설정되지 않았습니다. 관리자에게 문의하세요.');
        setLoading(false);
        return;
      }

      const isValidPw = await CryptoUtil.verifyPassword(password, data.lookupSalt, data.lookupPasswordHash);
      if (!isValidPw) {
        showError('조회 비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      // 뒷 4자리로 매칭되는 차량 필터링
      const matches = data.vehicles.filter(v => getLast4(v.vehicleNumber) === input);

      if (matches.length === 0) {
        showError('등록되지 않은 차량번호입니다.');
        setLoading(false);
        return;
      }

      cachedData = data;
      cachedPassword = password;

      if (matches.length === 1) {
        // 1대만 매칭 → 바로 결과 표시
        await showResult(matches[0], data, password);
      } else {
        // 여러 대 매칭 → 선택 목록 표시
        showSelectList(matches);
      }

    } catch (err) {
      console.error(err);
      showError('조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * 매칭 차량이 여러 대일 때 선택 목록 표시
   */
  function showSelectList(vehicles) {
    selectListItems.innerHTML = '';
    vehicles.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline select-item';
      btn.textContent = v.vehicleNumber;
      btn.addEventListener('click', async () => {
        selectList.classList.remove('show');
    selectList.style.display = 'none';
        setLoading(true);
        try {
          await showResult(v, cachedData, cachedPassword);
        } catch (e) {
          showError('조회 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      });
      selectListItems.appendChild(btn);
    });
    selectList.style.display = 'block';
    selectList.classList.add('show');
    result.classList.remove('show');
  }

  /**
   * 단일 차량 결과 표시
   */
  async function showResult(vehicle, data, password) {
    const phone = await CryptoUtil.decrypt(vehicle.phoneEncrypted, password, data.lookupSalt);
    vehicleInfo.textContent = '차량번호: ' + vehicle.vehicleNumber;
    phoneResult.innerHTML = '<a href="tel:' + phone + '">' + formatPhone(phone) + '</a>';
    result.classList.add('show');
    selectList.classList.remove('show');
    selectList.style.display = 'none';
  }

  function formatPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7);
    }
    if (digits.length === 10) {
      return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
    }
    return phone;
  }

  // 이벤트
  searchBtn.addEventListener('click', search);
  passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') search();
  });
  vehicleInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') passwordInput.focus();
  });
})();
