/**
 * admin.js - 관리자 CRUD 로직
 * 연락처는 조회 비밀번호 하나로만 암호화
 * 데이터는 localStorage에 자동 저장, 서버와 동기화
 */

(function() {
  const STORAGE_KEY = 'carSearchAppData';

  // State
  let appData = { adminPasswordHash: '', adminSalt: '', lookupPasswordHash: '', lookupSalt: '', vehicles: [], version: 0 };
  let adminPassword = '';
  let lookupPassword = '';
  let nextId = 1;
  let dataReady = null;

  const $ = id => document.getElementById(id);

  // Sections
  const loginSection = $('loginSection');
  const dashboardSection = $('dashboardSection');
  const qrSection = $('qrSection');

  // Login
  const adminPasswordInput = $('adminPassword');
  const loginPwGroup = $('loginPwGroup');
  const loginBtn = $('loginBtn');
  const loginError = $('loginError');
  const initSetup = $('initSetup');
  const newAdminPw = $('newAdminPw');
  const confirmAdminPw = $('confirmAdminPw');
  const setupBtn = $('setupBtn');
  const setupError = $('setupError');

  // Lookup Password Card
  const lookupPwCard = $('lookupPwCard');
  const lookupPwCardTitle = $('lookupPwCardTitle');
  const lookupPwCardDesc = $('lookupPwCardDesc');
  const dashLookupPw = $('dashLookupPw');
  const dashLookupPwConfirm = $('dashLookupPwConfirm');
  const dashLookupPwConfirmGroup = $('dashLookupPwConfirmGroup');
  const dashLookupPwBtn = $('dashLookupPwBtn');
  const dashLookupPwError = $('dashLookupPwError');

  // Dashboard
  const vehicleTable = $('vehicleTable');
  const vehicleTableBody = $('vehicleTableBody');
  const emptyState = $('emptyState');
  const selectAll = $('selectAll');
  const deleteSelectedBtn = $('deleteSelectedBtn');
  const addVehicleBtn = $('addVehicleBtn');
  const changeLookupPwBtn = $('changeLookupPwBtn');
  const showQrBtn = $('showQrBtn');
  const saveDataBtn = $('saveDataBtn');
  const loadDataBtn = $('loadDataBtn');
  const fileInput = $('fileInput');
  const publishBtn = $('publishBtn');
  const fetchServerBtn = $('fetchServerBtn');
  const logoutBtn = $('logoutBtn');
  const dashboardMsg = $('dashboardMsg');

  // Pending
  const pendingCard = $('pendingCard');
  const pendingBadge = $('pendingBadge');
  const pendingTable = $('pendingTable');
  const pendingTableBody = $('pendingTableBody');
  const pendingSelectAll = $('pendingSelectAll');
  const approveSelectedBtn = $('approveSelectedBtn');
  const rejectSelectedBtn = $('rejectSelectedBtn');
  const pendingError = $('pendingError');

  // QR
  const qrCode = $('qrCode');
  const qrUrl = $('qrUrl');
  const printQrBtn = $('printQrBtn');
  const downloadQrBtn = $('downloadQrBtn');
  const backFromQrBtn = $('backFromQrBtn');

  // Vehicle Modal
  const vehicleModal = $('vehicleModal');
  const modalCloseBtn = $('modalCloseBtn');
  const modalTitle = $('modalTitle');
  const editVehicleId = $('editVehicleId');
  const modalName = $('modalName');
  const modalVehicleNum = $('modalVehicleNum');
  const modalPhone = $('modalPhone');
  const modalSaveBtn = $('modalSaveBtn');
  const modalError = $('modalError');

  // Lookup Password Change Modal
  const lookupPwModal = $('lookupPwModal');
  const lookupPwCloseBtn = $('lookupPwCloseBtn');
  const currentLookupPw = $('currentLookupPw');
  const changeLookupPw = $('changeLookupPw');
  const changeLookupPwConfirm = $('changeLookupPwConfirm');
  const changeLookupPwSaveBtn = $('changeLookupPwSaveBtn');
  const changeLookupPwError = $('changeLookupPwError');

  // Admin Password Change Modal
  const adminPwModal = $('adminPwModal');
  const adminPwCloseBtn = $('adminPwCloseBtn');
  const currentAdminPw = $('currentAdminPw');
  const newAdminPwChange = $('newAdminPwChange');
  const newAdminPwChangeConfirm = $('newAdminPwChangeConfirm');
  const adminPwSaveBtn = $('adminPwSaveBtn');
  const adminPwError = $('adminPwError');
  const changeAdminPwBtn = $('changeAdminPwBtn');

  // ===== Helpers =====
  function showSection(section) {
    [loginSection, dashboardSection, qrSection].forEach(s => s.classList.remove('active'));
    section.classList.add('active');
  }

  function showDashboardMsg(msg, isError) {
    dashboardMsg.textContent = msg;
    dashboardMsg.className = isError ? 'error-msg show' : 'success-msg show';
    setTimeout(() => { dashboardMsg.classList.remove('show'); }, 3000);
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add('show');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function maskPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 8) return digits.slice(0, 3) + '-****-' + digits.slice(-4);
    return '***-****-****';
  }

  // ===== Data =====
  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }

  async function publishToServer() {
    try {
      const resp = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      const result = await resp.json();
      if (result.success) {
        appData.version = result.version;
        saveToStorage();
      } else {
        console.error('서버 동기화 실패:', result.error || '알 수 없는 오류');
      }
    } catch (e) {
      console.error('서버 동기화 실패:', e);
    }
  }

  async function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.adminPasswordHash) {
          appData = parsed;
          if (!appData.vehicles) appData.vehicles = [];
          if (typeof appData.version === 'undefined') appData.version = 0;
          return;
        }
      } catch (e) {}
    }
    try {
      const resp = await fetch('/api/vehicles');
      if (resp.ok) {
        appData = await resp.json();
        if (!appData.vehicles) appData.vehicles = [];
        if (typeof appData.version === 'undefined') appData.version = 0;
      }
    } catch (e) {}
  }

  async function fetchFromServer() {
    try {
      const resp = await fetch('/api/vehicles');
      if (resp.ok) {
        const serverData = await resp.json();
        if (!serverData.vehicles) serverData.vehicles = [];
        if (typeof serverData.version === 'undefined') serverData.version = 0;
        appData = serverData;
        saveToStorage();
        updateNextId();
        lookupPassword = '';
        showLookupPwCard();
        await renderVehicleList();
        showDashboardMsg('서버에서 최신 데이터를 불러왔습니다. (' + appData.vehicles.length + '대)', false);
      } else {
        showDashboardMsg('서버에서 데이터를 불러올 수 없습니다.', true);
      }
    } catch (e) {
      console.error(e);
      showDashboardMsg('서버 연결에 실패했습니다.', true);
    }
  }

  function updateNextId() {
    nextId = appData.vehicles.length > 0
      ? Math.max(...appData.vehicles.map(v => v.id)) + 1
      : 1;
  }

  // ===== Lookup Password Card =====
  function showLookupPwCard() {
    const hasLookupPw = appData.lookupPasswordHash && appData.lookupSalt;
    if (hasLookupPw) {
      lookupPwCardTitle.textContent = '조회 비밀번호 입력';
      lookupPwCardDesc.textContent = '차량 관리를 위해 조회 비밀번호를 입력하세요.';
      dashLookupPwConfirmGroup.style.display = 'none';
      dashLookupPwBtn.textContent = '확인';
    } else {
      lookupPwCardTitle.textContent = '조회 비밀번호 설정';
      lookupPwCardDesc.textContent = '사용자가 차량 조회 시 사용할 비밀번호를 설정하세요.';
      dashLookupPwConfirmGroup.style.display = '';
      dashLookupPwBtn.textContent = '설정';
    }
    dashLookupPw.value = '';
    dashLookupPwConfirm.value = '';
    dashLookupPwError.classList.remove('show');
    lookupPwCard.style.display = '';
  }

  function hideLookupPwCard() {
    lookupPwCard.style.display = 'none';
  }

  async function handleDashLookupPw() {
    const pw = dashLookupPw.value;
    const hasLookupPw = appData.lookupPasswordHash && appData.lookupSalt;

    if (!pw || pw.length < 4) {
      showError(dashLookupPwError, '비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    if (hasLookupPw) {
      const isValid = await CryptoUtil.verifyPassword(pw, appData.lookupSalt, appData.lookupPasswordHash);
      if (!isValid) {
        showError(dashLookupPwError, '조회 비밀번호가 일치하지 않습니다.');
        return;
      }
      lookupPassword = pw;
    } else {
      const pwConfirm = dashLookupPwConfirm.value;
      if (pw !== pwConfirm) {
        showError(dashLookupPwError, '비밀번호가 일치하지 않습니다.');
        return;
      }
      const salt = CryptoUtil.generateSalt();
      appData.lookupPasswordHash = await CryptoUtil.hashPassword(pw, salt);
      appData.lookupSalt = salt;
      lookupPassword = pw;
      saveToStorage();
      await publishToServer();
      showDashboardMsg('조회 비밀번호가 설정되었습니다.', false);
    }

    hideLookupPwCard();
    await renderVehicleList();
    await loadPendingRegistrations();
  }

  // ===== Login =====
  async function handleLogin() {
    await dataReady;
    const pw = adminPasswordInput.value;
    if (!pw) { showError(loginError, '관리자 비밀번호를 입력하세요.'); return; }

    if (!appData.adminPasswordHash || !appData.adminSalt) {
      initSetup.style.display = 'block';
      loginBtn.style.display = 'none';
      loginPwGroup.style.display = 'none';
      return;
    }

    const isValid = await CryptoUtil.verifyPassword(pw, appData.adminSalt, appData.adminPasswordHash);
    if (!isValid) { showError(loginError, '관리자 비밀번호가 일치하지 않습니다.'); return; }

    adminPassword = pw;
    updateNextId();
    showSection(dashboardSection);
    showLookupPwCard();
    await renderVehicleList();
    await loadPendingRegistrations();
  }

  async function handleSetup() {
    const pw = newAdminPw.value;
    const pwConfirm = confirmAdminPw.value;
    if (!pw || pw.length < 4) { showError(setupError, '비밀번호는 4자 이상이어야 합니다.'); return; }
    if (pw !== pwConfirm) { showError(setupError, '비밀번호가 일치하지 않습니다.'); return; }

    const salt = CryptoUtil.generateSalt();
    appData.adminPasswordHash = await CryptoUtil.hashPassword(pw, salt);
    appData.adminSalt = salt;
    adminPassword = pw;
    saveToStorage();
    await publishToServer();
    updateNextId();
    showSection(dashboardSection);
    showLookupPwCard();
    await renderVehicleList();
    await loadPendingRegistrations();
  }

  // ===== Vehicle List =====
  async function renderVehicleList() {
    vehicleTableBody.innerHTML = '';

    if (appData.vehicles.length === 0) {
      vehicleTable.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    vehicleTable.style.display = 'table';
    emptyState.style.display = 'none';

    for (const v of appData.vehicles) {
      const tr = document.createElement('tr');
      let phoneMasked = '***-****-****';

      if (lookupPassword) {
        try {
          const phone = await CryptoUtil.decrypt(v.phoneEncrypted, lookupPassword, appData.lookupSalt);
          phoneMasked = maskPhone(phone);
        } catch (e) {
          console.error('Decrypt error for vehicle', v.id);
        }
      }

      tr.innerHTML =
        '<td><input type="checkbox" class="vehicle-check" data-id="' + v.id + '"></td>' +
        '<td>' + escapeHtml(v.name || '') + '</td>' +
        '<td>' + escapeHtml(v.vehicleNumber) + '</td>' +
        '<td>' + phoneMasked + '</td>' +
        '<td><button class="btn btn-outline btn-sm edit-btn" data-id="' + v.id + '">수정</button></td>';
      vehicleTableBody.appendChild(tr);
    }

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
  }

  // ===== Pending Registrations =====
  let pendingList = [];

  async function loadPendingRegistrations() {
    try {
      const resp = await fetch('/api/register');
      if (resp.ok) {
        const data = await resp.json();
        pendingList = data.pending || [];
        renderPendingList();
      }
    } catch (e) {
      console.error('Failed to load pending registrations', e);
    }
  }

  function renderPendingList() {
    pendingTableBody.innerHTML = '';

    if (pendingList.length === 0) {
      pendingCard.style.display = 'none';
      return;
    }

    pendingCard.style.display = '';
    pendingBadge.textContent = pendingList.length;

    for (const p of pendingList) {
      const tr = document.createElement('tr');
      const date = p.registeredAt ? new Date(p.registeredAt).toLocaleDateString('ko-KR') : '';
      tr.innerHTML =
        '<td><input type="checkbox" class="pending-check" data-id="' + p.id + '"></td>' +
        '<td>' + escapeHtml(p.name) + '</td>' +
        '<td>' + escapeHtml(p.vehicleNumber) + '</td>' +
        '<td>' + escapeHtml(p.phone) + '</td>' +
        '<td style="font-size:0.8rem;">' + date + '</td>';
      pendingTableBody.appendChild(tr);
    }
  }

  pendingSelectAll.addEventListener('change', function() {
    document.querySelectorAll('.pending-check').forEach(cb => { cb.checked = pendingSelectAll.checked; });
  });

  approveSelectedBtn.addEventListener('click', async function() {
    if (!lookupPassword) {
      showDashboardMsg('먼저 조회 비밀번호를 입력해주세요.', true);
      showLookupPwCard();
      return;
    }

    const checked = document.querySelectorAll('.pending-check:checked');
    if (checked.length === 0) {
      showError(pendingError, '승인할 항목을 선택하세요.');
      setTimeout(() => pendingError.classList.remove('show'), 3000);
      return;
    }

    const approvedIds = Array.from(checked).map(cb => parseInt(cb.dataset.id));
    const approvedItems = pendingList.filter(p => approvedIds.includes(p.id));

    // 등록된 차량 목록에서 중복 체크
    for (const item of approvedItems) {
      const norm = item.vehicleNumber.replace(/\s+/g, '');
      const dup = appData.vehicles.find(v => v.vehicleNumber.replace(/\s+/g, '') === norm);
      if (dup) {
        showError(pendingError, '이미 등록된 차량번호가 있습니다: ' + item.vehicleNumber);
        setTimeout(() => pendingError.classList.remove('show'), 3000);
        return;
      }
    }

    try {
      // 승인된 차량 추가 (암호화)
      for (const item of approvedItems) {
        const phoneEncrypted = await CryptoUtil.encrypt(item.phone, lookupPassword, appData.lookupSalt);
        appData.vehicles.push({
          id: nextId++,
          name: item.name,
          vehicleNumber: item.vehicleNumber,
          phoneEncrypted
        });
      }

      saveToStorage();
      await renderVehicleList();

      // 서버에서 대기 항목 삭제
      await fetch('/api/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: approvedIds })
      });

      pendingList = pendingList.filter(p => !approvedIds.includes(p.id));
      pendingSelectAll.checked = false;
      renderPendingList();
      showDashboardMsg(approvedIds.length + '대의 차량이 승인되었습니다.', false);
    } catch (e) {
      console.error(e);
      showDashboardMsg('승인 처리 중 오류가 발생했습니다.', true);
    }
  });

  rejectSelectedBtn.addEventListener('click', async function() {
    const checked = document.querySelectorAll('.pending-check:checked');
    if (checked.length === 0) {
      showError(pendingError, '거절할 항목을 선택하세요.');
      setTimeout(() => pendingError.classList.remove('show'), 3000);
      return;
    }

    if (!confirm(checked.length + '건의 등록 신청을 거절하시겠습니까?')) return;

    const rejectedIds = Array.from(checked).map(cb => parseInt(cb.dataset.id));

    try {
      await fetch('/api/register', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: rejectedIds })
      });

      pendingList = pendingList.filter(p => !rejectedIds.includes(p.id));
      pendingSelectAll.checked = false;
      renderPendingList();
      showDashboardMsg(rejectedIds.length + '건의 신청이 거절되었습니다.', false);
    } catch (e) {
      console.error(e);
      showDashboardMsg('거절 처리 중 오류가 발생했습니다.', true);
    }
  });

  // ===== Select All / Delete =====
  selectAll.addEventListener('change', function() {
    document.querySelectorAll('.vehicle-check').forEach(cb => { cb.checked = selectAll.checked; });
  });

  deleteSelectedBtn.addEventListener('click', async function() {
    const checked = document.querySelectorAll('.vehicle-check:checked');
    if (checked.length === 0) { showDashboardMsg('삭제할 차량을 선택하세요.', true); return; }
    if (!confirm(checked.length + '대의 차량을 삭제하시겠습니까?')) return;

    const ids = new Set(Array.from(checked).map(cb => parseInt(cb.dataset.id)));
    appData.vehicles = appData.vehicles.filter(v => !ids.has(v.id));
    selectAll.checked = false;
    saveToStorage();
    await renderVehicleList();
    showDashboardMsg(ids.size + '대의 차량이 삭제되었습니다.', false);
  });

  // ===== Vehicle Modal =====
  function openAddModal() {
    if (!lookupPassword) { showDashboardMsg('먼저 조회 비밀번호를 입력해주세요.', true); showLookupPwCard(); return; }
    modalTitle.textContent = '차량 등록';
    editVehicleId.value = '';
    modalName.value = '';
    modalVehicleNum.value = '';
    modalPhone.value = '';
    modalError.classList.remove('show');
    vehicleModal.classList.add('show');
  }

  async function openEditModal(id) {
    if (!lookupPassword) { showDashboardMsg('먼저 조회 비밀번호를 입력해주세요.', true); showLookupPwCard(); return; }
    const vehicle = appData.vehicles.find(v => v.id === id);
    if (!vehicle) return;

    modalTitle.textContent = '차량 수정';
    editVehicleId.value = id;
    modalName.value = vehicle.name || '';
    modalVehicleNum.value = vehicle.vehicleNumber;
    modalError.classList.remove('show');

    try {
      modalPhone.value = await CryptoUtil.decrypt(vehicle.phoneEncrypted, lookupPassword, appData.lookupSalt);
    } catch (e) {
      modalPhone.value = '';
      showError(modalError, '연락처 복호화에 실패했습니다.');
    }
    vehicleModal.classList.add('show');
  }

  function closeModal() { vehicleModal.classList.remove('show'); }

  async function handleModalSave() {
    const name = modalName.value.trim();
    const vehicleNum = modalVehicleNum.value.trim();
    const phone = modalPhone.value.trim().replace(/\D/g, '');
    const editId = editVehicleId.value ? parseInt(editVehicleId.value) : null;

    if (!name) { showError(modalError, '이름을 입력하세요.'); return; }
    if (!vehicleNum) { showError(modalError, '차량번호를 입력하세요.'); return; }
    if (!phone) { showError(modalError, '연락처를 입력하세요.'); return; }

    const norm = vehicleNum.replace(/\s+/g, '');
    const dup = appData.vehicles.find(v => v.vehicleNumber.replace(/\s+/g, '') === norm && v.id !== editId);
    if (dup) { showError(modalError, '이미 등록된 차량번호입니다.'); return; }

    try {
      const phoneEncrypted = await CryptoUtil.encrypt(phone, lookupPassword, appData.lookupSalt);

      if (editId) {
        const idx = appData.vehicles.findIndex(v => v.id === editId);
        if (idx !== -1) appData.vehicles[idx] = { id: editId, name, vehicleNumber: vehicleNum, phoneEncrypted };
      } else {
        appData.vehicles.push({ id: nextId++, name, vehicleNumber: vehicleNum, phoneEncrypted });
      }

      saveToStorage();
      closeModal();
      await renderVehicleList();
      showDashboardMsg(editId ? '수정되었습니다.' : '등록되었습니다.', false);
    } catch (e) {
      console.error(e);
      showError(modalError, '저장 중 오류가 발생했습니다.');
    }
  }

  // ===== Change Lookup Password =====
  function openLookupPwModal() {
    currentLookupPw.value = '';
    changeLookupPw.value = '';
    changeLookupPwConfirm.value = '';
    changeLookupPwError.classList.remove('show');
    lookupPwModal.classList.add('show');
  }

  function closeLookupPwModal() { lookupPwModal.classList.remove('show'); }

  async function handleChangeLookupPw() {
    const curPw = currentLookupPw.value;
    const newPw = changeLookupPw.value;
    const newPwConfirm = changeLookupPwConfirm.value;

    if (!curPw) { showError(changeLookupPwError, '현재 조회 비밀번호를 입력하세요.'); return; }
    if (!newPw || newPw.length < 4) { showError(changeLookupPwError, '새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (newPw !== newPwConfirm) { showError(changeLookupPwError, '새 비밀번호가 일치하지 않습니다.'); return; }

    const isValid = await CryptoUtil.verifyPassword(curPw, appData.lookupSalt, appData.lookupPasswordHash);
    if (!isValid) { showError(changeLookupPwError, '현재 조회 비밀번호가 틀렸습니다.'); return; }

    try {
      const oldSalt = appData.lookupSalt;
      const newSalt = CryptoUtil.generateSalt();

      for (const v of appData.vehicles) {
        const phone = await CryptoUtil.decrypt(v.phoneEncrypted, curPw, oldSalt);
        v.phoneEncrypted = await CryptoUtil.encrypt(phone, newPw, newSalt);
      }

      appData.lookupPasswordHash = await CryptoUtil.hashPassword(newPw, newSalt);
      appData.lookupSalt = newSalt;
      lookupPassword = newPw;

      saveToStorage();
      await publishToServer();
      closeLookupPwModal();
      hideLookupPwCard();
      await renderVehicleList();
      showDashboardMsg('조회 비밀번호가 변경되었습니다.', false);
    } catch (e) {
      console.error(e);
      showError(changeLookupPwError, '변경 중 오류가 발생했습니다.');
    }
  }

  // ===== Change Admin Password =====
  function openAdminPwModal() {
    currentAdminPw.value = '';
    newAdminPwChange.value = '';
    newAdminPwChangeConfirm.value = '';
    adminPwError.classList.remove('show');
    adminPwModal.classList.add('show');
  }

  function closeAdminPwModal() { adminPwModal.classList.remove('show'); }

  async function handleChangeAdminPw() {
    const curPw = currentAdminPw.value;
    const newPw = newAdminPwChange.value;
    const newPwConfirm = newAdminPwChangeConfirm.value;

    if (!curPw) { showError(adminPwError, '현재 비밀번호를 입력하세요.'); return; }
    if (!newPw || newPw.length < 4) { showError(adminPwError, '새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (newPw !== newPwConfirm) { showError(adminPwError, '새 비밀번호가 일치하지 않습니다.'); return; }

    const isValid = await CryptoUtil.verifyPassword(curPw, appData.adminSalt, appData.adminPasswordHash);
    if (!isValid) { showError(adminPwError, '현재 관리자 비밀번호가 틀렸습니다.'); return; }

    const newSalt = CryptoUtil.generateSalt();
    appData.adminPasswordHash = await CryptoUtil.hashPassword(newPw, newSalt);
    appData.adminSalt = newSalt;
    adminPassword = newPw;

    saveToStorage();
    await publishToServer();
    closeAdminPwModal();
    showDashboardMsg('관리자 비밀번호가 변경되었습니다.', false);
  }

  // ===== Export / Import (Excel) =====
  async function saveData() {
    if (!lookupPassword) {
      showDashboardMsg('먼저 조회 비밀번호를 입력해주세요.', true);
      showLookupPwCard();
      return;
    }
    try {
      const rows = [];
      for (const v of appData.vehicles) {
        const phone = await CryptoUtil.decrypt(v.phoneEncrypted, lookupPassword, appData.lookupSalt);
        rows.push({ '이름': v.name || '', '차량번호': v.vehicleNumber, '연락처': phone });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '차량목록');
      XLSX.writeFile(wb, 'vehicles.xlsx');
      showDashboardMsg('vehicles.xlsx 다운로드 완료', false);
    } catch (e) {
      console.error(e);
      showDashboardMsg('엑셀 내보내기 중 오류가 발생했습니다.', true);
    }
  }

  function handleLoadData() { fileInput.click(); }

  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!lookupPassword) {
      showDashboardMsg('먼저 조회 비밀번호를 입력해주세요.', true);
      showLookupPwCard();
      fileInput.value = '';
      return;
    }
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (!rows.length) {
        showDashboardMsg('엑셀 파일에 데이터가 없습니다.', true);
        fileInput.value = '';
        return;
      }

      let added = 0;
      let skipped = 0;
      for (const row of rows) {
        const name = String(row['이름'] || '').trim();
        const vehicleNumber = String(row['차량번호'] || '').trim();
        const phone = String(row['연락처'] || '').trim().replace(/\D/g, '');
        if (!vehicleNumber) continue;

        const norm = vehicleNumber.replace(/\s+/g, '');
        const dup = appData.vehicles.find(v => v.vehicleNumber.replace(/\s+/g, '') === norm);
        if (dup) { skipped++; continue; }

        const phoneEncrypted = await CryptoUtil.encrypt(phone, lookupPassword, appData.lookupSalt);
        appData.vehicles.push({ id: nextId++, name, vehicleNumber, phoneEncrypted });
        added++;
      }

      saveToStorage();
      await renderVehicleList();
      let msg = added + '대 추가 완료';
      if (skipped > 0) msg += ' (중복 ' + skipped + '대 스킵)';
      showDashboardMsg(msg, false);
    } catch (err) {
      console.error(err);
      showDashboardMsg('엑셀 파일 읽기 오류', true);
    }
    fileInput.value = '';
  });

  // ===== QR Code =====
  let qrGenerated = false;

  function showQrSection() {
    showSection(qrSection);
    if (!qrGenerated) {
      const url = window.location.href.replace(/admin(\.html)?.*$/, 'index.html');
      qrUrl.textContent = url;
      qrCode.innerHTML = '';
      new QRCode(qrCode, { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.H });
      qrGenerated = true;
    }
  }

  function downloadQr() {
    const canvas = qrCode.querySelector('canvas');
    const img = canvas || qrCode.querySelector('img');
    if (!img) return;
    const a = document.createElement('a');
    a.href = canvas ? canvas.toDataURL('image/png') : img.src;
    a.download = 'qr-code.png';
    a.click();
  }

  // ===== Logout =====
  function logout() {
    adminPassword = '';
    lookupPassword = '';
    adminPasswordInput.value = '';
    initSetup.style.display = 'none';
    loginBtn.style.display = '';
    loginPwGroup.style.display = '';
    loginError.classList.remove('show');
    qrGenerated = false;
    hideLookupPwCard();
    showSection(loginSection);
  }

  // ===== Events =====
  loginBtn.addEventListener('click', handleLogin);
  adminPasswordInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  setupBtn.addEventListener('click', handleSetup);

  dashLookupPwBtn.addEventListener('click', handleDashLookupPw);
  dashLookupPw.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (dashLookupPwConfirmGroup.style.display === 'none') handleDashLookupPw();
      else dashLookupPwConfirm.focus();
    }
  });
  dashLookupPwConfirm.addEventListener('keydown', e => { if (e.key === 'Enter') handleDashLookupPw(); });

  addVehicleBtn.addEventListener('click', openAddModal);
  modalCloseBtn.addEventListener('click', closeModal);
  modalSaveBtn.addEventListener('click', handleModalSave);
  vehicleModal.addEventListener('click', e => { if (e.target === vehicleModal) closeModal(); });

  changeLookupPwBtn.addEventListener('click', openLookupPwModal);
  lookupPwCloseBtn.addEventListener('click', closeLookupPwModal);
  changeLookupPwSaveBtn.addEventListener('click', handleChangeLookupPw);
  lookupPwModal.addEventListener('click', e => { if (e.target === lookupPwModal) closeLookupPwModal(); });

  changeAdminPwBtn.addEventListener('click', openAdminPwModal);
  adminPwCloseBtn.addEventListener('click', closeAdminPwModal);
  adminPwSaveBtn.addEventListener('click', handleChangeAdminPw);
  adminPwModal.addEventListener('click', e => { if (e.target === adminPwModal) closeAdminPwModal(); });

  // 서버에 저장 (버전 관리)
  publishBtn.addEventListener('click', async function() {
    publishBtn.disabled = true;
    publishBtn.textContent = '저장 중...';
    try {
      const resp = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
      });
      const result = await resp.json();
      if (result.success) {
        appData.version = result.version;
        saveToStorage();
        showDashboardMsg('서버에 저장되었습니다.', false);
      } else if (result.conflict) {
        showDashboardMsg(result.error, true);
      } else {
        showDashboardMsg('서버 저장 실패: ' + (result.error || '알 수 없는 오류'), true);
      }
    } catch (e) {
      console.error(e);
      showDashboardMsg('서버 연결에 실패했습니다.', true);
    }
    publishBtn.disabled = false;
    publishBtn.textContent = '서버에 저장';
  });

  // 서버에서 불러오기
  fetchServerBtn.addEventListener('click', async function() {
    if (!confirm('서버에서 최신 데이터를 불러옵니다. 로컬 변경사항은 덮어씁니다. 계속하시겠습니까?')) return;
    fetchServerBtn.disabled = true;
    fetchServerBtn.textContent = '불러오는 중...';
    try {
      await fetchFromServer();
    } finally {
      fetchServerBtn.disabled = false;
      fetchServerBtn.textContent = '서버에서 불러오기';
    }
  });

  saveDataBtn.addEventListener('click', saveData);
  loadDataBtn.addEventListener('click', handleLoadData);
  showQrBtn.addEventListener('click', showQrSection);
  backFromQrBtn.addEventListener('click', () => showSection(dashboardSection));
  printQrBtn.addEventListener('click', () => window.print());
  downloadQrBtn.addEventListener('click', downloadQr);
  logoutBtn.addEventListener('click', logout);

  // ===== Init =====
  dataReady = loadData();
})();
