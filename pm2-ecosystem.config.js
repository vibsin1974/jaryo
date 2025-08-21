module.exports = {
  apps: [{
    name: 'jaryo-file-manager',
    script: 'server.js',
    cwd: '/volume1/web/jaryo',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    log_file: '/volume1/web/jaryo/logs/combined.log',
    out_file: '/volume1/web/jaryo/logs/out.log',
    error_file: '/volume1/web/jaryo/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
