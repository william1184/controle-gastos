"use client";
import { createContext, useContext, useState } from 'react';

const BackgroundTaskContext = createContext();

export function BackgroundTaskProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const runTask = async (id, title, taskPromise, onSuccess, onError) => {
    setTasks((prev) => [...prev, { id, title, status: 'running' }]);
    try {
      const result = await taskPromise();
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setNotifications((prev) => [...prev, { id, title, result, onSuccess, status: 'success' }]);
    } catch (error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setNotifications((prev) => [...prev, { id, title, error, onError, status: 'error' }]);
    }
  };



  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const isTaskRunning = (id) => tasks.some((t) => t.id === id);

  return (
    <BackgroundTaskContext.Provider value={{ runTask, isTaskRunning, tasks, notifications }}>
      {children}
      
      {/* UI para exibir Status de Tarefas e Notificações flutuantes */}
      <div className="fixed flex flex-col gap-3 pointer-events-none" style={{ bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
        {tasks.map((task) => (
          <div key={`task-${task.id}`} className="bg-blue-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-blue-500 pointer-events-auto">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="font-medium">{task.title}...</span>
          </div>
        ))}
        {notifications.map((notif) => (
          <div key={`notif-${notif.id}`} className={`p-4 rounded-lg shadow-xl flex flex-col gap-2 border ${notif.status === 'success' ? 'bg-green-600 border-green-500' : 'bg-red-600 border-red-500'} text-white max-w-sm pointer-events-auto`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{notif.status === 'success' ? '✅' : '❌'}</span>
              <p className="font-bold text-lg">{notif.status === 'success' ? 'Concluído' : 'Falha'}</p>
            </div>
            <p className="text-sm font-medium">{notif.title}</p>
            <div className="flex justify-end gap-2 mt-2">
               {notif.status === 'success' && notif.onSuccess && (
                 <button onClick={() => { notif.onSuccess(notif.result); dismissNotification(notif.id); }} className="bg-white text-green-700 px-4 py-1.5 rounded text-sm font-bold hover:bg-gray-100 transition shadow">Visualizar</button>
               )}
               {notif.status === 'error' && notif.onError && (
                 <button onClick={() => { notif.onError(notif.error); dismissNotification(notif.id); }} className="bg-white text-red-700 px-4 py-1.5 rounded text-sm font-bold hover:bg-gray-100 transition shadow">Detalhes</button>
               )}
               <button onClick={() => dismissNotification(notif.id)} className="bg-transparent border border-white px-4 py-1.5 rounded text-sm font-medium hover:bg-white hover:bg-opacity-20 transition">Fechar</button>
            </div>
          </div>
        ))}
      </div>
    </BackgroundTaskContext.Provider>
  );
}

export const useBackgroundTask = () => useContext(BackgroundTaskContext);