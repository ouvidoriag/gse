module.exports = {
  apps: [
    {
      name: 'pmdc-unificados',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3032
      },
      env_sigem_legacy: {
        NODE_ENV: 'production',
        PORT: 3015,
        APP_MODE: 'sigem'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
