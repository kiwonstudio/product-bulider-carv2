// GET /api/vehicles → KV에서 차량 데이터 읽기
export async function onRequestGet(context) {
  const data = await context.env.VEHICLES.get('vehicleData');
  if (!data) {
    return new Response(JSON.stringify({
      adminPasswordHash: '', adminSalt: '',
      lookupPasswordHash: '', lookupSalt: '',
      vehicles: [],
      version: 0
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  // 기존 데이터에 version이 없으면 추가
  const parsed = JSON.parse(data);
  if (typeof parsed.version === 'undefined') parsed.version = 0;
  return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/vehicles → KV에 차량 데이터 저장 (버전 관리로 중복 방지)
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body.vehicles || !Array.isArray(body.vehicles)) {
      return new Response(JSON.stringify({ success: false, error: '잘못된 데이터 형식' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 버전 체크로 동시 수정 방지
    const existing = await context.env.VEHICLES.get('vehicleData');
    if (existing) {
      const current = JSON.parse(existing);
      const currentVersion = current.version || 0;
      const clientVersion = body.version || 0;

      if (clientVersion < currentVersion) {
        return new Response(JSON.stringify({
          success: false,
          error: '다른 관리자가 이미 데이터를 수정했습니다. 서버에서 최신 데이터를 불러온 후 다시 시도하세요.',
          conflict: true,
          serverVersion: currentVersion
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 버전 증가
    body.version = (body.version || 0) + 1;

    await context.env.VEHICLES.put('vehicleData', JSON.stringify(body));
    return new Response(JSON.stringify({ success: true, version: body.version }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: '서버 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
