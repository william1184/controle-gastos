import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    usePathname.mockReturnValue('/dashboard');
  });

  it('deve renderizar os itens do menu', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Transações')).toBeDefined();
    expect(screen.getByText('Categorias')).toBeDefined();
  });

  it('deve destacar o item ativo baseado no pathname', () => {
    usePathname.mockReturnValue('/transacoes');
    render(<Sidebar />);
    
    const transacoesButton = screen.getByRole('button', { name: /💸 Transações/i });
    expect(transacoesButton.className).toContain('bg-blue-50');
    expect(transacoesButton.className).toContain('text-blue-600');
  });

  it('deve exibir informações da entidade ativa quando fornecida', () => {
    const activeEntidade = {
      nome: 'Empresa Teste',
      is_contexto_pessoal: false
    };
    
    render(<Sidebar activeEntidade={activeEntidade} />);
    
    expect(screen.getByText('Empresa Teste')).toBeDefined();
    expect(screen.getByText('Empresa')).toBeDefined();
    expect(screen.getByText('🏢')).toBeDefined();
  });

  it('deve chamar handleSwitchEntidade ao clicar no botão de troca', () => {
    const handleSwitchEntidade = jest.fn();
    const activeEntidade = {
      nome: 'Pessoal Teste',
      is_contexto_pessoal: true
    };
    
    render(<Sidebar activeEntidade={activeEntidade} handleSwitchEntidade={handleSwitchEntidade} />);
    
    const button = screen.getByRole('button', { name: /Trocar Entidade/i });
    fireEvent.click(button);
    
    expect(handleSwitchEntidade).toHaveBeenCalledTimes(1);
  });
});
