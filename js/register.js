/**
 * register.js - 차량 등록 신청 로직
 * 조회 비밀번호 없이 대기 목록에 저장
 */

(function() {
  const regName = document.getElementById('regName');
  const regVehicleNum = document.getElementById('regVehicleNum');
  const regPhone = document.getElementById('regPhone');
  const regSaveBtn = document.getElementById('regSaveBtn');
  const regLoading = document.getElementById('regLoading');
  const regError = document.getElementById('regError');
  const regSuccess = document.getElementById('regSuccess');
  const showQrBtn = document.getElementById('showQrBtn');
  const qrCard = document.getElementById('qrCard');
  const qrCode = document.getElementById('qrCode');
  const qrUrl = document.getElementById('qrUrl');
  const printQrBtn = document.getElementById('printQrBtn');
  const downloadQrBtn = document.getElementById('downloadQrBtn');

  function showError(msg) {
    regError.textContent = msg;
    regError.classList.add('show');
    regSuccess.classList.remove('show');
  }

  function showSuccessMsg(msg) {
    regSuccess.textContent = msg;
    regSuccess.classList.add('show');
    regError.classList.remove('show');
  }

  function hideMessages() {
    regError.classList.remove('show');
    regSuccess.classList.remove('show');
  }

  function setLoading(on) {
    regLoading.classList.toggle('show', on);
    regSaveBtn.disabled = on;
  }

  regSaveBtn.addEventListener('click', async function() {
    hideMessages();

    const name = regName.value.trim();
    const vehicleNumber = regVehicleNum.value.trim();
    const phone = regPhone.value.trim().replace(/\D/g, '');

    if (!name) { showError('이름을 입력해주세요.'); return; }
    if (!vehicleNumber) { showError('차량번호를 입력해주세요.'); return; }
    if (!phone || phone.length < 10) { showError('올바른 휴대폰번호를 입력해주세요.'); return; }

    setLoading(true);

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, vehicleNumber, phone })
      });
      const result = await resp.json();
      if (result.success) {
        showSuccessMsg('등록 신청이 완료되었습니다. 관리자 승인 후 조회가 가능합니다.');
        regName.value = '';
        regVehicleNum.value = '';
        regPhone.value = '';
      } else {
        showError(result.error || '등록에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      showError('서버 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  });

  // QR 코드
  let qrGenerated = false;

  showQrBtn.addEventListener('click', function() {
    qrCard.style.display = qrCard.style.display === 'none' ? '' : 'none';
    if (!qrGenerated) {
      const url = window.location.href.split('?')[0];
      qrUrl.textContent = url;
      qrCode.innerHTML = '';
      new QRCode(qrCode, { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.H });
      qrGenerated = true;
    }
  });

  printQrBtn.addEventListener('click', function() {
    window.print();
  });

  downloadQrBtn.addEventListener('click', function() {
    const canvas = qrCode.querySelector('canvas');
    const img = canvas || qrCode.querySelector('img');
    if (!img) return;
    const a = document.createElement('a');
    a.href = canvas ? canvas.toDataURL('image/png') : img.src;
    a.download = 'register-qr-code.png';
    a.click();
  });
})();
