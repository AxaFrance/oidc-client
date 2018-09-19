import { Log } from 'oidc-client';
import * as loggerService from './loggerService';

jest.mock('oidc-client');

describe('LoggerService tests suite', () => {
  const fakeConsole = {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };
  beforeEach(() => {
    Log.DEBUG = 4;
    Log.INFO = 3;
    Log.WARN = 2;
    Log.ERROR = 1;
    Log.NONE = 0;
  });

  it('Should oidc setLogger and set local logger when call setLogger', () => {
    loggerService.setLogger(1, fakeConsole);
    expect(Log.logger).toBe(fakeConsole);
  });

  it('Should throw Range error if setLogger set with bas level', () => {
    expect(() => loggerService.setLogger(-1, fakeConsole)).toThrow(RangeError);
    expect(() => loggerService.setLogger(-6, fakeConsole)).toThrow(RangeError);
  });

  it('Should not call logger debug when call debug and level is under the debug level', () => {
    loggerService.setLogger(1, fakeConsole);
    loggerService.oidcLog.debug('message 1', 'message 2');
    expect(fakeConsole.debug).not.toBeCalled();
  });

  it('Should call logger debug with correct message when call debug and level is upper or equal the debug level', () => {
    loggerService.setLogger(4, fakeConsole);
    loggerService.oidcLog.debug('message 1', 'message 2');
    expect(fakeConsole.debug).toBeCalledWith(
      'DEBUG [react-context-oidc] :',
      'message 1',
      'message 2'
    );
  });

  it('Should not call logger info when call info and level is under the info level', () => {
    loggerService.setLogger(1, fakeConsole);
    loggerService.oidcLog.info('message 1', 'message 2');
    expect(fakeConsole.info).not.toBeCalled();
  });

  it('Should call logger debug with correct message when call info and level is upper or equal the info level', () => {
    loggerService.setLogger(3, fakeConsole);
    loggerService.oidcLog.info('message 1', 'message 2');
    expect(fakeConsole.info).toBeCalledWith(
      'INFO [react-context-oidc] :',
      'message 1',
      'message 2'
    );
  });

  it('Should not call logger warn when call info and level is under the warn level', () => {
    loggerService.setLogger(1, fakeConsole);
    loggerService.oidcLog.warn('message 1', 'message 2');
    expect(fakeConsole.warn).not.toBeCalled();
  });

  it('Should call logger debug with correct message when call warn and level is upper or equal the warn level', () => {
    loggerService.setLogger(2, fakeConsole);
    loggerService.oidcLog.warn('message 1', 'message 2');
    expect(fakeConsole.warn).toBeCalledWith(
      'WARN [react-context-oidc] :',
      'message 1',
      'message 2'
    );
  });

  it('Should not call logger error when call info and level is under the error level', () => {
    loggerService.setLogger(0, fakeConsole);
    loggerService.oidcLog.error('message 1', 'message 2');
    expect(fakeConsole.error).not.toBeCalled();
  });

  it('Should call logger debug with correct message when call error and level is upper or equal the error level', () => {
    loggerService.setLogger(1, fakeConsole);
    loggerService.oidcLog.error('message 1', 'message 2');
    expect(fakeConsole.error).toBeCalledWith(
      'ERROR [react-context-oidc] :',
      'message 1',
      'message 2'
    );
  });
});
