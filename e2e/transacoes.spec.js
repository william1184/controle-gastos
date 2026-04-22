import { test, expect } from '@playwright/test';

test.describe('Gestão de Transações', () => {
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
    
    // Entra na entidade padrão
    await page.goto('/selecao-entidade');
    await page.getByText('Família Padrão').click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Inserção Rápida de Nova Despesa (Saída)', async ({ page }) => {
    await page.goto('/transacoes/saidas/nova');
    
    // Preenche formulário usando placeholders (mais estáveis que labels sem id)
    await page.getByPlaceholder(/Ex: Almoço, Supermercado.../i).fill('Supermercado E2E');
    await page.getByPlaceholder('0,00').fill('150');
    
    await page.getByRole('button', { name: /Salvar Lançamento/i }).click();
    
    // Verifica redirecionamento e listagem
    await expect(page).toHaveURL(/.*transacoes/);
    await expect(page.locator('table')).toContainText('Supermercado E2E');
    await expect(page.locator('table')).toContainText('150');
  });

  test('Inserção de Nova Receita (Entrada)', async ({ page }) => {
    await page.goto('/transacoes/entradas/nova');
    
    await page.getByPlaceholder(/Ex: Salário, Freelance/i).fill('Salário E2E');
    await page.getByPlaceholder('0,00').fill('5000');
    
    await page.getByRole('button', { name: /Salvar Entrada/i }).click();
    
    await expect(page).toHaveURL(/.*transacoes/);
    await expect(page.locator('table')).toContainText('Salário E2E');
    await expect(page.locator('table')).toContainText('5.000');
  });

  test('Exclusão de Transação', async ({ page }) => {
    await page.goto('/transacoes/saidas/nova');
    await page.getByPlaceholder(/Ex: Almoço, Supermercado.../i).fill('Transação para Excluir');
    await page.getByPlaceholder('0,00').fill('100');
    await page.getByRole('button', { name: /Salvar Lançamento/i }).click();
    
    await expect(page).toHaveURL(/.*transacoes/);
    const row = page.locator('tr', { hasText: 'Transação para Excluir' });
    await expect(row).toBeVisible();
    
    page.on('dialog', dialog => dialog.accept());
    await row.getByRole('button', { name: '🗑️' }).click();
    
    await expect(row).not.toBeVisible();
  });
});
