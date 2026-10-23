// Optional on a VPS; managed Node hosting already supervises npm start.
module.exports = {
  apps: [{
    name: 'sinakratos-resume', cwd: __dirname, script: 'server.mjs',
    interpreter: process.execPath, instances: 1, exec_mode: 'fork', watch: false,
    env: { NODE_ENV: 'production', APP_HOST: '127.0.0.1', PORT: '3001' },
  }],
};
