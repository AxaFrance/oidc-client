

describe('react-oidc', () => {
  
  beforeEach(() => {
    cy.visit('https://black-rock-0dc6b0d03.1.azurestaticapps.net')
  });

  it('displays two todo items by default', () => {
    cy.contains('Login').click()
    cy.wait(1100);
    cy.get("#Username").type("Bob");
    cy.wait(1100);
    cy.get("#Password").type("Bob").type('{enter}');

    cy.contains('Access Token');
  });

});
