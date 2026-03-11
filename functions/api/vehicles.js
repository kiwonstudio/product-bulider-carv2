// GET /api/vehicles → KV에서 차량 데이터 읽기
export async function onRequestGet(context) {
  const data = await context.env.VEHICLES.get('vehicleData');
  if (!data) {
    return new Response(JSON.stringify({
      adminPasswordHash: '', adminSalt: '',
      lookupPasswordHash: '', lookupSalt: '',
      vehicles: []
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(data, { headers: { 'Content-Type': 'application/json' } });
}

// POST /api/vehicles → KV에 차량 데이터 저장
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body.vehicles || !Array.isArray(body.vehicles)) {
      return new Response(JSON.stringify({ success: false, error: '잘못된 데이터 형식' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await context.env.VEHICLES.put('vehicleData', JSON.stringify(body));
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
