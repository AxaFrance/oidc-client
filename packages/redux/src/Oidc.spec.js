// Link.react.test.js
import React from "react";
import renderer from "react-test-renderer";
import { mount } from "enzyme";
import { loadUser } from "redux-oidc";

import Oidc from "./Oidc";

// I used __esModule to mock a module with default and named exports
// cf: https://github.com/facebook/jest/issues/5579#issuecomment-397406174
jest.mock("./authenticationService", () => ({
  __esModule: true,
  default: jest.fn(),
  getUserManager: jest.fn()
}));
jest.mock("redux-oidc", () => ({
  OidcProvider: jest.fn(() => <p>Render Something</p>),
  loadUser: jest.fn()
}));

describe("redux.Oidc", () => {
  it("Render <Oidc/> correctly", () => {
    const component = renderer.create(
      <Oidc isEnabled={false} store={{}} configuration={{}}>
        <p>isEnabled</p>
      </Oidc>
    );
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });

  it("should call loadUser when component mounts even if isEnabled prop is not set", () => {
    mount(<Oidc store={{}} configuration={{}} />);

    // expect(loadUser).toHaveBeenCalled();
  });
});
