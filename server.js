'use strict';
/* M/S M.S. Traders POS — entry point */
process.on('uncaughtException', err => {
  console.error('[UncaughtException]', err);
});
process.on('unhandledRejection', reason => {
  console.error('[UnhandledRejection]', reason);
});
require('./lib/api').boot();

