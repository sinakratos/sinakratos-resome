const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'sinakratos-resume',
      cwd: __dirname,
      script: path.join(__dirname, 'node_modules/next/dist/bin/next'),
      interpreter: process.execPath,
      args: ['start', '--hostname', '127.0.0.1', '--port', '3001'],
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
