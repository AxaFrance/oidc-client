import { withProps } from 'recompose';
import { defer, from, Observable } from 'rxjs';

export type Fetch = (
  input?: Request | string,
  init?: RequestInit
) => Promise<Response>;

export type FetchObservable = (
  input?: Request | string,
  init?: RequestInit
) => Observable<Response>;

// tslint:disable-next-line:interface-name
export interface WithFetchObservable  {fetchWithObservable: FetchObservable;
};

export const fetchWithObservable = (fetch: Fetch) => (input?: Request | string,
  init?: RequestInit
): Observable<Response> => {
  return defer(() => from(fetch(input, init)));
};

export const withFetchObservable = (fetch: Fetch): WithFetchObservable => ({
  fetchWithObservable: fetchWithObservable(fetch),
});

const enhance = (fetch: Fetch) =>
  withProps<any, WithFetchObservable>(withFetchObservable(fetch));
 
export default enhance;