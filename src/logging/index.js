const winston = require("winston");

const {colorize, combine, timestamp, printf} = winston.format;

const logger = winston.createLogger({
    level: 'debug',
    format: combine(
      colorize({level: true}),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      printf(({ message, timestamp, level, label }) => {
          return `${timestamp} [${level}] (${label}) -> ${message}`;
      })
    ),
    transports: [new winston.transports.Console()],
});


module.exports = {
    logger
}
