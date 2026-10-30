describe('Fruta Clear 3D — Flujo Completo de Partida E2E (P1-4)', () => {
  beforeEach(() => {
    cy.window().then(win => {
      win.localStorage.setItem(
        'tileclear_player_save_v1',
        JSON.stringify({
          uid: 'e2e_test_player',
          username: 'Tester3D',
          highScore: 300,
          currentLevel: 1,
          coins: 50,
          activeSkin: 'default_fruits',
          activeBackground: 'default_blue',
          unlockedSkins: ['default_fruits'],
          unlockedBackgrounds: ['default_blue'],
          tutorialCompleted: true,
        }),
      );
    });
  });

  it('Completa el flujo de partida: selección de fichas al tray, deshacer, varita mágica y modales', () => {
    cy.visit('/');

    // 1. Verifica HUD, tablero 3D, barra de power-ups y bandeja de 7 casillas
    cy.get('.game-hud-toolbar').should('be.visible');
    cy.get('.board-arena').should('be.visible');
    cy.get('.powerups-bar').should('be.visible');
    cy.get('.tray-container .tray-slot').should('have.length', 7);

    // 2. Selecciona una ficha libre del tablero y verifica que entra a la bandeja
    cy.get('.board-arena .tile:not(.is-blocked)').first().click();
    cy.get('.tray-container .tray-slot.is-filled').should('have.length', 1);

    // 3. Usa el Power-Up Deshacer (Undo) y comprueba que la bandeja vuelve a vaciarse
    cy.get('button[aria-label*="Deshacer"]').click();
    cy.get('.tray-container .tray-slot.is-filled').should('have.length', 0);

    // 4. Usa el Power-Up Varita Mágica (Auto-Match) para despejar un trío automáticamente
    cy.get('button[aria-label*="Varita mágica"]').click();
    cy.wait(600);
    cy.get('.progress-count').should('not.contain', '0/');

    // 5. Abre y cierra los modales de Misiones Diarias, Tienda (pestaña Ayudas) y Pausa
    cy.get('button[aria-label="Misiones diarias"]').click();
    cy.get('[aria-label="Misiones Diarias"]').should('be.visible');
    cy.get('button[aria-label="Cerrar misiones diarias"]').click();

    cy.get('button[aria-label="Abrir tienda"]').click();
    cy.contains('button', 'Ayudas').click();
    cy.contains('Recarga Deshacer').should('be.visible');
    cy.get('button[aria-label="Cerrar tienda"]').click();

    cy.get('button[aria-label="Pausar partida"]').click();
    cy.contains('JUEGO EN PAUSA').should('be.visible');
    cy.contains('button', 'CONTINUAR PARTIDA').click();
  });
});
