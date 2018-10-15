import { fetchWithObservable } from "./withFetchObservable";

describe('fetch observable ', () => {
    describe('fetchWithObservable factory', () => {
        const headers  = new Headers({
            'Content-Type': 'application/json',
          })
          const response = { status: 200 }
        it('should call fetch with right params', (done: jest.DoneCallback) => {
            expect.assertions(2);
          
            const fetch = jest.fn().mockReturnValue( new Promise(resolve => {
                resolve(response);
              }));
            fetchWithObservable(fetch)('url', {  headers}).subscribe((resp)=> {
                expect(fetch).toHaveBeenCalledWith('url', {headers});
                expect(resp.status).toEqual( 200 );
                done()
            });
       
        });
    
    });
    
});