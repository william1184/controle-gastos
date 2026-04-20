import { initDb } from '@/lib/db';
import { addEntidade, setActiveEntidade } from '@/lib/entidadeDb';
import { deleteRecorrencia, getRecorrencias } from '@/lib/recorrenciaDb';
import { addSaida } from '@/lib/saidasDb';
import { addUsuario, setActiveUsuario } from '@/lib/usuarioDb';

describe('recorrenciaDb Service', () => {
  let entidadeId;
  let usuarioId;

  beforeAll(async () => {
    await initDb();

    entidadeId = await addEntidade({ nome: 'Entidade Teste Recorrencia' });
    setActiveEntidade(entidadeId);

    usuarioId = await addUsuario({ nome: 'User Teste Rec', entidade_id: entidadeId });
    await setActiveUsuario(usuarioId);
  });

  test('should retrieve active recurrences for the entity', async () => {
    const saida = {
      data: '2026-04-20',
      apelido: 'Assinatura Netflix',
      categoria: 'Lazer',
      total: 55.90,
      usuarioId: usuarioId,
      recorrencia: { frequencia: 'mensal' }
    };

    await addSaida(saida);

    const recurrences = await getRecorrencias();
    expect(recurrences.length).toBeGreaterThanOrEqual(1);
    expect(recurrences.some(r => r.descricao === 'Assinatura Netflix')).toBe(true);
  });

  test('should logical delete a recurrence', async () => {
    const all = await getRecorrencias();
    const toDelete = all[0];

    await deleteRecorrencia(toDelete.id);

    const remaining = await getRecorrencias();
    expect(remaining.find(r => r.id === toDelete.id)).toBeUndefined();
  });
});
