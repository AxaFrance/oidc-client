import React from 'react';
import { CreateEvent, WindowInternal } from './withRouter';
import { describe, it, expect, vi } from 'vitest';

describe('WithRouter test Suite', () => {
  const generateKeyMock = () => '123ABC';
  const paramsMock = { bubbles: false, cancelable: false, detail: 'detail' };
  beforeEach(() => {});
  it('should CreateEvent return correct Event if not on IE', () => {
    const windowMock = {
      CustomEvent: vi.fn().mockImplementation((event, params) => {
        return { event, params };
      }),
    };
    const documentMock = {} as Document;
    const res = CreateEvent((windowMock as unknown) as WindowInternal, documentMock)(
      'event test',
      paramsMock
    );
    expect(res).toEqual({
      event: 'event test',
      params: { bubbles: false, cancelable: false, detail: 'detail' },
    });
  });

  it('should createEvent create a polyfill when the default func is undefined', () => {
    const windowMock = {
      Event: {
        prototype: 'protoMock',
      },
    };
    const evtMock = {
      initCustomEvent: vi.fn(),
    };
    const documentMock = {
      createEvent: vi.fn(() => evtMock),
    };
    const typedDocumentMock = (documentMock as unknown) as Document;
    const res = CreateEvent((windowMock as unknown) as WindowInternal, typedDocumentMock)(
      'event test',
      paramsMock
    );
    expect(res).toEqual({ ...evtMock });
    expect(documentMock.createEvent).toHaveBeenCalledWith('CustomEvent');
    expect(evtMock.initCustomEvent).toHaveBeenCalledWith('event test', false, false, 'detail');
  });
  
});
