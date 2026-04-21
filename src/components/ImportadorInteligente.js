"use client";
import React, { useState, useCallback } from 'react';
import { useNotification } from '@/lib/NotificationContext';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { getConfig } from '@/lib/configuracaoDb';

export default function ImportadorInteligente({ onResultReady, categorias = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState([]);
  const { addNotification } = useNotification();

  const processFile = async (file) => {
    const taskId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    // Add to visual queue
    setQueue(prev => [...prev, { id: taskId, name: file.name, status: 'processing' }]);

    try {
      const apiKey = await getConfig('geminiApiKey') || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      const ai = new GenerativeLanguageApi(apiKey);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64Data = reader.result.split(',')[1];
            const mimeType = file.type;
            const catsNames = categorias.map(c => c.nome);

            const result = await ai.processDocument(base64Data, mimeType, catsNames);
            
            // Success
            setQueue(prev => prev.filter(t => t.id !== taskId));
            addNotification(`Documento "${file.name}" processado!`, 'success');
            onResultReady(result);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
      });

    } catch (error) {
      console.error('Erro no processamento paralelo:', error);
      setQueue(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t));
      addNotification(`Erro ao processar "${file.name}": ${error.message}`, 'error');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  }, [categorias, onResultReady]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(processFile);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-8 transition-all flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden ${
          isDragging ? 'border-blue-500 bg-blue-50/50 scale-[0.98]' : 'border-gray-200 hover:border-blue-400 bg-white'
        }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          accept="image/*,application/pdf"
        />
        
        <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
          ✨
        </div>
        <h3 className="text-xl font-black text-gray-800 mb-1">Importação Inteligente</h3>
        <p className="text-sm text-gray-500 font-medium">Arraste Cupons, Notas ou Faturas (PDF/Img)</p>
        
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] flex items-center justify-center animate-pulse">
            <span className="text-blue-600 font-black text-lg">Solte para processar com IA</span>
          </div>
        )}
      </div>

      {queue.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Processamento em Segundo Plano</h4>
          {queue.map(task => (
            <div key={task.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center justify-between animate-slideIn">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${task.status === 'processing' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  {task.status === 'processing' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : '⚠️'}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 truncate max-w-[200px]">{task.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    {task.status === 'processing' ? 'Analisando documento...' : 'Erro no processamento'}
                  </p>
                </div>
              </div>
              
              {task.status === 'error' && (
                <button 
                  onClick={() => setQueue(prev => prev.filter(t => t.id !== task.id))}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
