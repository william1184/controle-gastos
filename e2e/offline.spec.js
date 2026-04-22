import { test, expect } from '@playwright/test';

test.describe('Resiliência Local (Offline-First)', () => {
  test.beforeEach(async ({ page }) => {
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
    
    await page.goto('/selecao-entidade');
    await page.getByText('Família Padrão').click();
  });

  test('Persistência de Dados Pós-Recarregamento', async ({ page }) => {
    await page.goto('/transacoes/saidas/nova');
    
    await page.getByPlaceholder(/Ex: Almoço, Supermercado.../i).fill('Compra Teste Reload');
    await page.getByPlaceholder('0,00').fill('99.90');
    
    await page.getByRole('button', { name: /Salvar Lançamento/i }).click();
    
    await expect(page).toHaveURL(/.*transacoes/);
    await expect(page.locator('table')).toContainText('Compra Teste Reload');

    await page.reload();
    await expect(page.locator('table')).toContainText('Compra Teste Reload');
    
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Família Padrão');
    
    await page.goto('/transacoes');
    await expect(page.locator('table')).toContainText('Compra Teste Reload');
  });
});
