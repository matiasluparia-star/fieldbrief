import './binance-server.mjs';
const port = process.env.PORT || 10000;
setTimeout(async () => {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/build-binance`);
    const body = await r.text();
    console.log('BINANCE_AUTOBUILD', r.status, body);
  } catch (e) {
    console.error('BINANCE_AUTOBUILD_ERROR', e?.message || e);
  }
}, 1500);
