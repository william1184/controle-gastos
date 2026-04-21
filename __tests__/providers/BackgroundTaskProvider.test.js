import { render, screen, act } from '@testing-library/react';
import { BackgroundTaskProvider, useBackgroundTask } from '@/providers/BackgroundTaskProvider';

const TestComponent = ({ taskPromise, onSuccess, onError }) => {
  const { runTask, isTaskRunning, tasks, notifications } = useBackgroundTask();
  
  return (
    <div>
      <button onClick={() => runTask('task-1', 'Teste Task', taskPromise, onSuccess, onError)}>Run</button>
      <div data-testid="status">{isTaskRunning('task-1') ? 'running' : 'idle'}</div>
      <div data-testid="tasks-count">{tasks.length}</div>
      <div data-testid="notifications-count">{notifications.length}</div>
    </div>
  );
};

describe('BackgroundTaskProvider', () => {
  it('deve gerenciar o ciclo de vida de uma tarefa com sucesso', async () => {
    let resolveTask;
    const promise = new Promise((resolve) => { resolveTask = resolve; });
    const taskPromise = jest.fn().mockReturnValue(promise);
    const onSuccess = jest.fn();

    render(
      <BackgroundTaskProvider>
        <TestComponent taskPromise={taskPromise} onSuccess={onSuccess} />
      </BackgroundTaskProvider>
    );

    const button = screen.getByText('Run');
    act(() => {
      button.click();
    });

    expect(screen.getByTestId('status').textContent).toBe('running');
    expect(screen.getByTestId('tasks-count').textContent).toBe('1');
    expect(screen.getByText('Teste Task...')).toBeDefined();

    await act(async () => {
      resolveTask('resultado');
    });

    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByTestId('tasks-count').textContent).toBe('0');
    expect(screen.getByTestId('notifications-count').textContent).toBe('1');
    expect(screen.getByText('Concluído')).toBeDefined();
  });

  it('deve gerenciar o ciclo de vida de uma tarefa com erro', async () => {
    let rejectTask;
    const promise = new Promise((_, reject) => { rejectTask = reject; });
    const taskPromise = jest.fn().mockReturnValue(promise);
    const onError = jest.fn();

    render(
      <BackgroundTaskProvider>
        <TestComponent taskPromise={taskPromise} onError={onError} />
      </BackgroundTaskProvider>
    );

    const button = screen.getByText('Run');
    act(() => {
      button.click();
    });

    await act(async () => {
      rejectTask(new Error('Falha'));
    });

    expect(screen.getByTestId('status').textContent).toBe('idle');
    expect(screen.getByText('Falha')).toBeDefined();
    expect(screen.getByText('❌')).toBeDefined();
  });
});
