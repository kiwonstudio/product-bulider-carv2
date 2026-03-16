// GET /api/register → 대기 중인 등록 신청 목록 조회
export async function onRequestGet(context) {
  const data = await context.env.VEHICLES.get('pendingRegistrations');
  if (!data) {
    return new Response(JSON.stringify({ pending: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(data, { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/register → 차량 등록 신청 (대기 목록에 추가)
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { name, vehicleNumber, phone } = body;

    if (!name || !vehicleNumber || !phone) {
      return new Response(JSON.stringify({ success: false, error: '모든 필드를 입력해주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 기존 대기 목록 가져오기
    const existing = await context.env.VEHICLES.get('pendingRegistrations');
    let pendingData = existing ? JSON.parse(existing) : { pending: [] };
    if (!pendingData.pending) pendingData.pending = [];

    // 차량번호 중복 체크 (대기 목록 내)
    const norm = vehicleNumber.replace(/\s+/g, '');
    const dupPending = pendingData.pending.find(p => p.vehicleNumber.replace(/\s+/g, '') === norm);
    if (dupPending) {
      return new Response(JSON.stringify({ success: false, error: '이미 등록 신청된 차량번호입니다.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 등록된 차량 목록에서도 중복 체크
    const vehicleData = await context.env.VEHICLES.get('vehicleData');
    if (vehicleData) {
      const vData = JSON.parse(vehicleData);
      if (vData.vehicles && vData.vehicles.find(v => v.vehicleNumber.replace(/\s+/g, '') === norm)) {
        return new Response(JSON.stringify({ success: false, error: '이미 등록된 차량번호입니다.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 대기 목록에 추가
    const newEntry = {
      id: Date.now(),
      name,
      vehicleNumber,
      phone,
      registeredAt: new Date().toISOString()
    };
    pendingData.pending.push(newEntry);

    await context.env.VEHICLES.put('pendingRegistrations', JSON.stringify(pendingData));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/register → 승인된 대기 항목 삭제
export async function onRequestDelete(context) {
  try {
    const body = await context.request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return new Response(JSON.stringify({ success: false, error: '삭제할 항목을 지정해주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await context.env.VEHICLES.get('pendingRegistrations');
    let pendingData = existing ? JSON.parse(existing) : { pending: [] };
    if (!pendingData.pending) pendingData.pending = [];

    const idSet = new Set(ids);
    pendingData.pending = pendingData.pending.filter(p => !idSet.has(p.id));

    await context.env.VEHICLES.put('pendingRegistrations', JSON.stringify(pendingData));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
