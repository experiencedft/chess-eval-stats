import { createLogger, transports, format } from 'winston'
const { combine, timestamp, label, printf } = format;

//const baseFormatter = format.simple

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        label({ label: '-'}),
        format.timestamp(),
        myFormat
      )
    }),
    new transports.File({ 
      filename: 'Extract.log',  
      level: 'info',
      format: format.combine(
        label({ label: '-'}),
        format.timestamp(),
        myFormat
      ) 
    }),
  ]
})

export default logger
