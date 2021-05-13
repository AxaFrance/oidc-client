import { compose } from './compose';

describe('Compose test suite', () => {
  it('Should call function in corect order', () => {
    const funcA = a => `A(${a})`;
    const funcB = a => `B(${a})`;
    const funcC = a => `C(${a})`;

    expect(
      compose(
        funcA,
        funcC,
        funcB
      )('param')
    ).toEqual('A(C(B(param)))');
  });
});
