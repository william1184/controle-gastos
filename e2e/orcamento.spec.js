import { test, expect } from '@playwright/test';

test.describe('Gestão de Orçamento (Budget)', () => {
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
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Criação de Limite de Orçamento', async ({ page }) => {
    await page.goto('/orcamento');
    await expect(page.locator('h1')).toContainText('Orçamento');

    // Localiza a linha de 'Lazer' de forma mais robusta
    const rowLazer = page.locator('div.p-6', { has: page.getByRole('heading', { name: 'Lazer' }) }).first();
    const clickableValue = rowLazer.locator('div.cursor-pointer');
    await expect(clickableValue).toBeVisible({ timeout: 10000 });
    
    // Força o clique
    await clickableValue.click({ force: true });
    
    const inputEdit = rowLazer.locator('input[type="text"]');
    await expect(inputEdit).toBeVisible({ timeout: 10000 });
    await inputEdit.fill('300');
    await inputEdit.press('Enter');
    
    // Cria transação
    await page.goto('/transacoes/saidas/nova');
    
    // Define uma data fixa para evitar problemas de fuso horário com o orçamento
    const hoje = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').fill(hoje);
    
    await page.getByPlaceholder(/Ex: Almoço, Supermercado.../i).fill('Cinema IMAX');
    await page.getByPlaceholder('0,00').fill('350');
    
    // Seleciona Lazer no select (Categoria é o primeiro select)
    await page.locator('select').first().selectOption({ label: 'Lazer' });
    
    // Handler para o alert de sucesso
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Salvar Lançamento/i }).click();
    
    // Espera voltar para a lista de transações
    await expect(page).toHaveURL(/.*transacoes/);

    await page.goto('/orcamento');
    // Verifica se existe o indicador de estouro específico (usa first() devido a mobile/desktop)
    await expect(page.getByText('116.7% utilizado').first()).toBeVisible({ timeout: 20000 });
  });
});
