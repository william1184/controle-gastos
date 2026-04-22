import { test, expect } from '@playwright/test';

test.describe('Onboarding & Inicialização', () => {
  test.beforeEach(async ({ page }) => {
    // Garante base limpa
    await page.goto('/');
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('/sql');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve(); 
      });
    });
    await page.reload();
  });

  test('Deve navegar da Landing Page até o Dashboard usando a entidade padrão', async ({ page }) => {
    await page.goto('/');
    
    // 1. Clicar no CTA da Landing Page
    const btnComecar = page.getByRole('link', { name: /Começar Agora/i });
    await expect(btnComecar).toBeVisible();
    await btnComecar.click();

    // 2. Verificar Seleção de Entidade (deve ter a entidade 'Família Padrão' vinda do seed)
    await expect(page).toHaveURL(/.*selecao-entidade/);
    const entidadePadrao = page.getByText('Família Padrão');
    await expect(entidadePadrao).toBeVisible();
    await entidadePadrao.click();

    // 3. Verificar Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Família Padrão');
  });

  test('Deve criar uma nova entidade e entrar nela', async ({ page }) => {
    await page.goto('/selecao-entidade');
    
    // 1. Abrir modal de criação
    await page.getByText('Adicionar Entidade').click();
    
    // 2. Preencher formulário
    await page.getByPlaceholder(/Ex: Família Silva/i).fill('Nova Entidade E2E');
    await page.getByRole('button', { name: /Criar e Entrar/i }).click();

    // 3. Verificar Dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Nova Entidade E2E');
  });
});
