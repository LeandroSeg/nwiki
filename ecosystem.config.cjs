module.exports = {
  apps: [{
    name: 'nwiki-server',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    error_file: '../logs/nwiki-err.log',
    out_file: '../logs/nwiki-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '500M',
  }],
}
