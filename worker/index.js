console.log('StrataBid worker started. Waiting for jobs...');
setInterval(() => {
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, 60000);
