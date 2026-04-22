import { test, expect } from '@playwright/test';

test.describe('Integrações e IA', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta todos os consoles para debug
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // Handler global de diálogos para simplificar
    page.on('dialog', async dialog => {
      console.log('DIALOG DETECTED:', dialog.message());
      await dialog.accept();
    });

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

  test('Deve sugerir categoria usando mock da Gemini API', async ({ page }) => {
    // Configura a chave
    await page.goto('/configuracoes');
    const input = page.getByPlaceholder(/Insira sua API Key/i);
    await expect(input).toBeVisible();
    // Pequena espera para garantir que o useEffect de loadData terminou e não vai sobrescrever o input
    await page.waitForTimeout(1000); 
    await input.fill('MOCK_KEY');
    await page.getByRole('button', { name: /Salvar Tudo/i }).click();

    // Mock Robusto
    await page.route('**/generativelanguage.googleapis.com/**', async route => {
      console.log('Intercepted Google API call:', route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify([{
                  index: 0,
                  categoria_sugerida: 'Alimentação',
                  tipo_custo_sugerido: 'Variável',
                  motivo: 'Mock de teste'
                }])
              }]
            }
          }]
        }),
      });
    });

    await page.goto('/transacoes/saidas/nova');
    await page.getByPlaceholder(/Ex: Almoço, Supermercado.../i).fill('Mercado Teste IA');
    await page.getByPlaceholder('0,00').fill('100');
    await page.locator('select').first().selectOption('Outros');
    await page.getByRole('button', { name: /Salvar Lançamento/i }).click();

    await page.goto('/transacoes');
    await expect(page.getByText('Mercado Teste IA').first()).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: /Categorizar Saídas/i }).click({ force: true });

    // Espera o botão "Visualizar" da notificação de background
    const btnVisualizar = page.getByRole('button', { name: /Visualizar/i });
    await expect(btnVisualizar).toBeVisible({ timeout: 25000 });
    await btnVisualizar.click({ force: true });

    // Verificar se o modal de sugestões aparece
    await expect(page.locator('h3:has-text("Sugestões de IA")')).toBeVisible({ timeout: 10000 });
    // Usamos um seletor mais específico para o texto dentro da tabela do modal
    await expect(page.locator('td:has-text("Alimentação")').first()).toBeVisible();
  });

  test('Deve simular erro de configuração de API', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Família Padrão').first()).toBeVisible();
    
    const btnInsights = page.getByRole('button', { name: /Insights com IA/i });
    await expect(btnInsights).toBeVisible();
    
    // O clique deve disparar um alert que será aceito pelo handler global
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Insights com IA'));
      if (btn) btn.click();
    });
    
    await expect(btnInsights).toBeVisible();
  });
});
