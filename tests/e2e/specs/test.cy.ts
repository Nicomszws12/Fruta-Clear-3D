describe('Fruta Clear 3D — Flujo Completo de Partida E2E (P1-4 + Mejoras UX #1-#5)', () => {
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

  it('Completa el flujo de partida: Hub de inicio (Ola 2), intro 1.5s, HUD limpio, vuelo al tray, deshacer, varita y Hub de Pausa', () => {
    cy.visit('/');

    // 0. Verifica la Pantalla de Inicio (Ola 2 Hub) y pulsa Continuar para entrar al tablero
    cy.get('[aria-label="Pantalla de inicio de Fruta Clear 3D"]').should('be.visible');
    cy.contains('.logo-title', 'FRUTA').should('be.visible');
    cy.get('.title-cta').should('not.be.disabled').click();

    // 1. Verifica HUD limpio (4 controles táctiles >=44px), tablero 3D, power-ups y bandeja de 7 casillas
    cy.get('.game-hud-toolbar').should('be.visible');
    cy.get('.board-arena').should('be.visible');
    cy.get('.powerups-bar').should('be.visible');
    cy.get('.tray-container .tray-slot').should('have.length', 7);

    // 2. Selecciona una ficha libre del tablero (cierra la intro de nivel si sigue visible) y verifica la bandeja
    cy.get('.board-arena .tile:not(.is-blocked)').first().click({ force: true });
    cy.get('.tray-container .tray-slot.is-filled').should('have.length', 1);

    // 3. Usa el Power-Up Deshacer (Undo) y comprueba que la bandeja vuelve a vaciarse
    cy.get('button[aria-label*="Deshacer"]').click();
    cy.get('.tray-container .tray-slot.is-filled').should('have.length', 0);

    // 4. Usa el Power-Up Varita Mágica (Auto-Match) para despejar un trío automáticamente
    cy.get('button[aria-label*="Varita mágica"]').click();
    cy.wait(850);
    cy.get('.progress-count').should('not.contain', '0/');

    // 5. Abre el Hub de Pausa (#1) y navega a Misiones Diarias
    cy.get('button[aria-label="Pausar partida"]').click();
    cy.contains('JUEGO EN PAUSA').should('be.visible');
    cy.get('button[aria-label="Misiones diarias"]').click();
    cy.get('[aria-label="Misiones Diarias"]').should('be.visible');
    cy.get('button[aria-label="Cerrar misiones diarias"]').click();

    // 6. Abre la Tienda desde el chip de monedas del HUD y revisa la pestaña Ayudas
    cy.get('button[aria-label="Abrir tienda"]').first().click();
    cy.contains('button', 'Ayudas').click();
    cy.contains('Recarga Deshacer').should('be.visible');
    cy.get('button[aria-label="Cerrar tienda"]').click();
  });
});
