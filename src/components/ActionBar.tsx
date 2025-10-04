import React from 'react';

interface ActionBarProps {
  onSimpleVoiceCommand: () => void;
  onOpenChat: () => void;
  onImageTask: () => void;
  isListening: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({ onSimpleVoiceCommand, onOpenChat, onImageTask, isListening }) => {
  const buttonBaseStyle = "flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 h-full";

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md mb-4 sm:mb-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        
        {/* Simple Voice Command Button */}
        <button
          onClick={onSimpleVoiceCommand}
          disabled={isListening}
          className={`
            ${buttonBaseStyle} 
            ${isListening ? 'bg-red-200 dark:bg-red-900/50 cursor-not-allowed' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
          `}
        >
          <div className={`relative flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full ${isListening ? 'bg-red-500' : 'bg-[var(--accent-color-600)]'} text-white shadow-lg`}>
            {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="mt-2 sm:mt-3 font-semibold text-sm sm:text-lg text-gray-800 dark:text-white">Sesle Görev</p>
          <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 hidden sm:block">Sadece konuşun, biz not alalım.</p>
        </button>

        {/* AI Chat Button */}
        <button
          onClick={onOpenChat}
          disabled={isListening}
          className={`${buttonBaseStyle} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white dark:bg-gray-800 text-[var(--accent-color-500)] shadow-inner">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 8.25c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875m0 0c0 1.036-.84 1.875-1.875 1.875h-1.5A1.875 1.875 0 018.25 14.25v-1.5" />
                <path fillRule="evenodd" d="M3 8.25a5.25 5.25 0 015.25-5.25h6a5.25 5.25 0 015.25 5.25v7.5a5.25 5.25 0 01-5.25 5.25h-6a5.25 5.25 0 01-5.25-5.25v-7.5zM4.5 8.25a3.75 3.75 0 013.75-3.75h6a3.75 3.75 0 013.75 3.75v7.5a3.75 3.75 0 01-3.75 3.75h-6a3.75 3.75 0 01-3.75-3.75v-7.5z" clipRule="evenodd" />
             </svg>
          </div>
          <p className="mt-2 sm:mt-3 font-semibold text-sm sm:text-lg text-gray-800 dark:text-white">AI Sohbet</p>
          <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 hidden sm:block">Asistanla sohbet edin.</p>
        </button>

        {/* New Image Task Button */}
        <button
          onClick={onImageTask}
          disabled={isListening}
          className={`${buttonBaseStyle} bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white dark:bg-gray-800 text-[var(--accent-color-500)] shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="mt-2 sm:mt-3 font-semibold text-sm sm:text-lg text-gray-800 dark:text-white">Resimle</p>
          <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 hidden sm:block">Resimden akıllı görev yaratın.</p>
        </button>

      </div>
    </div>
  );
};

export default ActionBar;
