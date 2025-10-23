module.exports = {
  apps: [
    {
      name: "EvoCore",
      cwd: "C:/Users/Administrator/Desktop/GuildForge",
      script: "npm",
      args: "run start", // uses your "start" script in package.json
      interpreter: "cmd.exe",
      interpreter_args: "/k", // keeps the CMD window open so you can view logs

      // Auto-restart if it crashes
      autorestart: true,
      watch: false,
      max_restarts: 10, // avoid infinite restart loops
      exp_backoff_restart_delay: 200, // exponential backoff if it keeps crashing

      // Logging
      error_file: "./logs/err.log",       // errors only
      out_file: "./logs/out.log",         // standard output
      log_file: "./logs/combined.log",    // combined log
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm Z",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};




