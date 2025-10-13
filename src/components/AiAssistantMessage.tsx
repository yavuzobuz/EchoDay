import React from 'react';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useI18n } from '../contexts/I18nContext';
import DOMPurify from 'dompurify';

interface AiAssistantMessageProps {
  message: string;
  onClose: () => void;
  title?: string;
}

const AiAssistantMessage: React.FC<AiAssistantMessageProps> = ({ message, onClose, title }) => {
  if (!message) return null;

  const { t } = useI18n();
  const { isSpeaking, speak, cancel, hasSupport } = useTextToSpeech();
  const displayTitle = title || t('aiAssistant.title', 'Akıllı Asistan');

  const handleSpeakClick = () => {
    if (isSpeaking) {
      cancel();
    } else {
      speak(message);
    }
  };

  const tableStartIndex = message.indexOf('<table');
  const tableEndIndex = message.lastIndexOf('</table>');
  const hasHtmlTable = tableStartIndex !== -1 && tableEndIndex !== -1;

  let preTableContent: string | null = null;
  let tableHtml: string | null = null;

  if (hasHtmlTable) {
    preTableContent = message.substring(0, tableStartIndex).trim();
    tableHtml = message.substring(tableStartIndex, tableEndIndex + '</table>'.length);
  }

  return (
    <div className="relative bg-white dark:bg-gray-800 border-l-4 border-[var(--accent-color-500)] text-gray-700 dark:text-gray-200 p-4 rounded-lg my-4 shadow-lg" role="alert">
       <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-[var(--accent-color-500)] mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 11v4h2v-4H9zm0-4h2v2H9V7z"/></svg>
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <p className="font-bold">{displayTitle}</p>
              {hasSupport && message && (
                <button
                  onClick={handleSpeakClick}
                  className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label={isSpeaking ? t('aiAssistant.speakButton.stop', 'Okumayı durdur') : t('aiAssistant.speakButton.read', 'Sesli oku')}
                  title={isSpeaking ? t('aiAssistant.speakButton.stop', 'Okumayı durdur') : t('aiAssistant.speakButton.read', 'Sesli oku')}
                >
                  {isSpeaking ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            {hasHtmlTable ? (
               <>
                {preTableContent && <p className="text-sm whitespace-pre-wrap mb-2">{preTableContent}</p>}
                {tableHtml && (
                    <div
                        className="text-sm overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:dark:border-gray-600 [&_th]:bg-gray-100 [&_th]:dark:bg-gray-700 [&_th]:font-semibold [&_td]:p-2 [&_td]:border [&_td]:border-gray-200 [&_td]:dark:border-gray-700"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tableHtml, { ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td'], ALLOWED_ATTR: [] }) }}
                    />
                )}
               </>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            )}
        </div>
       </div>
       <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
       </button>
    </div>
  );
};

export default AiAssistantMessage;
