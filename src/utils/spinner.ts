import ora from "ora";
import * as log from "npmlog";

export interface Spinner {
  start(): void;
  stop(): void;
  succeed(message?: string): void;
  fail(message?: string): void;
}

let isProgressDisabled = false;

export function disableProgress() {
  isProgressDisabled = true;
}

export function createSpinner(initialMessage: string): Spinner {
  if (isProgressDisabled) {
    log.info('dotrepo', initialMessage)
    return {
      start() {},
      stop() {},
      succeed(message) {
        log.info("dotrepo", message || `${initialMessage} succeeded`);
      },
      fail(message) {
        log.error("dotrepo", message || `${initialMessage} failed`);
      },
    };
  }

  const spinner = ora(initialMessage).start();
  return {
    start() {
      spinner.start();
    },
    stop() {
      spinner.stop();
    },
    succeed(message) {
      spinner.succeed(message);
    },
    fail(message) {
      spinner.fail(message);
    },
  };
}
