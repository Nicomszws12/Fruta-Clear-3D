describe('Fruta Clear 3D E2E', () => {
  it('Carga la pantalla principal con el HUD, tablero 3D, ayudas y bandeja', () => {
    cy.visit('/');
    cy.get('.game-hud-toolbar').should('exist');
    cy.get('.board-arena').should('exist');
    cy.get('.powerups-bar').should('exist');
    cy.get('.tray-container').should('exist');
  });
});
