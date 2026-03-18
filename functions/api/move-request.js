// GET /api/move-request → 이동 요청 목록 조회
export async function onRequestGet(context) {
  const data = await context.env.VEHICLES.get('moveRequests');
  if (!data) {
    return new Response(JSON.stringify({ requests: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(data, { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/move-request → 차량 이동 요청 제출
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { vehicleNumber, name } = body;

    if (!vehicleNumber) {
      return new Response(JSON.stringify({ success: false, error: '차량번호가 필요합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await context.env.VEHICLES.get('moveRequests');
    let requestData = existing ? JSON.parse(existing) : { requests: [] };
    if (!requestData.requests) requestData.requests = [];

    // 동일 차량 5분 내 중복 요청 방지
    const now = Date.now();
    const norm = vehicleNumber.replace(/\s+/g, '');
    const recent = requestData.requests.find(r =>
      r.vehicleNumber.replace(/\s+/g, '') === norm &&
      (now - r.requestedAt) < 5 * 60 * 1000
    );
    if (recent) {
      return new Response(JSON.stringify({ success: false, error: '동일 차량에 대해 5분 내 재요청할 수 없습니다.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newEntry = {
      id: now,
      vehicleNumber,
      name: name || '',
      requestedAt: now
    };
    requestData.requests.push(newEntry);

    await context.env.VEHICLES.put('moveRequests', JSON.stringify(requestData));

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

// DELETE /api/move-request → 확인한 이동 요청 삭제
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

    const existing = await context.env.VEHICLES.get('moveRequests');
    let requestData = existing ? JSON.parse(existing) : { requests: [] };
    if (!requestData.requests) requestData.requests = [];

    const idSet = new Set(ids);
    requestData.requests = requestData.requests.filter(r => !idSet.has(r.id));

    await context.env.VEHICLES.put('moveRequests', JSON.stringify(requestData));

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
