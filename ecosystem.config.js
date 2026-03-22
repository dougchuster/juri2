// PM2 Ecosystem — Sistema Juridico ADV
// Uso: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sistema-juridico',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/sistema-juridico',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/juridico-app.err.log',
      out_file: '/var/log/pm2/juridico-app.out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'sistema-juridico-worker',
      script: 'npm',
      args: 'run worker:start',
      cwd: '/var/www/sistema-juridico',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/juridico-worker.err.log',
      out_file: '/var/log/pm2/juridico-worker.out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
