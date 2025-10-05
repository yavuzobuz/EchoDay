import React, { useState } from 'react';
import HeaderCyberpunk from './components/Header-cyberpunk';
import { AccentColor } from './App-cyberpunk';

interface MainCyberpunkProps {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  apiKey: string;
  assistantName: string;
  onNavigateToProfile: () => void;
  onShowWelcome: () => void;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

const MainCyberpunk: React.FC<MainCyberpunkProps> = ({
  accentColor,
  setAccentColor,
  apiKey,
  assistantName,
  onNavigateToProfile,
  onShowWelcome
}) => {
  // Mark apiKey as intentionally unused to satisfy noUnusedLocals
  void apiKey;
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Initialize neural link', completed: false, priority: 'high', timestamp: '14:30' },
    { id: '2', text: 'Calibrate holographic display', completed: true, priority: 'medium', timestamp: '12:00' },
    { id: '3', text: 'Update cyber implants', completed: false, priority: 'low', timestamp: '16:45' },
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [notepadText, setNotepadText] = useState('> NEURAL LOG ENTRY #001\n> SYSTEM STATUS: OPERATIONAL\n> \n> Welcome to NEON-DAY cyberpunk journal...\n> All thoughts are encrypted and secure.\n> \n> [END LOG]');

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: newTaskText,
        completed: false,
        priority: 'medium',
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };
      setTasks([newTask, ...tasks]);
      setNewTaskText('');
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setNewTaskText('Voice command received: New mission briefing');
      }, 2000);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'neon-text-pink';
      case 'medium': return 'neon-text-cyan';
      case 'low': return 'neon-text-green';
      default: return 'text-white';
    }
  };

  return (
    <div className="min-h-screen">
      <HeaderCyberpunk 
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        onNavigateToProfile={onNavigateToProfile}
        onShowWelcome={onShowWelcome}
      />

      <main className="container mx-auto p-4 max-w-7xl">
        {/* 🎮 STATS BAR 🎮 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
            { label: 'AKTİF', value: tasks.filter(t => !t.completed).length, icon: '⚡', color: 'cyan' },
            { label: 'TAMAMLANDI', value: tasks.filter(t => t.completed).length, icon: '✓', color: 'green' },
            { label: 'ÖNCELİKLİ', value: tasks.filter(t => t.priority === 'high').length, icon: '⚠', color: 'pink' },
            { label: 'NEURAL SYNC', value: '99%', icon: '◈', color: 'purple' }
          ].map((stat, i) => (
            <div key={i} className="retro-card rounded-lg p-4 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-terminal text-xs text-gray-400">{stat.label}</p>
                  <p className="font-cyber text-2xl neon-text-cyan mt-1">{stat.value}</p>
                </div>
                <div className={`text-3xl float-animation neon-text-${stat.color}`}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 📋 TASK PANEL 📋 */}
          <div className="retro-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-retro text-xl neon-text-pink flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span>GÖREVLER</span>
              </h2>
              <div className="flex gap-2">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className="audio-bar w-1 rounded"
                    style={{ 
                      animationDelay: `${i * 0.1}s`,
                      height: `${20 + Math.random() * 30}px`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* ✍️ ADD TASK INPUT ✍️ */}
            <div className="mb-6">
              <div className="flex gap-2">
                <div className="flex-1 neon-border rounded-lg bg-black/50 p-3">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Görev girin..."
                    className="w-full bg-transparent font-terminal text-sm text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
                <button
                  onClick={toggleRecording}
                  className={`cyber-button rounded-lg px-4 ${isRecording ? 'animate-pulse' : ''}`}
                >
                  <span className="text-xl">{isRecording ? '🔴' : '🎤'}</span>
                </button>
                <button
                  onClick={handleAddTask}
                  className="cyber-button rounded-lg px-6 font-terminal text-sm"
                >
                  EKLE
                </button>
              </div>
              {isRecording && (
                <p className="font-terminal text-xs neon-text-green mt-2 animate-pulse">
                  &gt; SES KOMUTU DİNLENİYOR...
                </p>
              )}
            </div>

            {/* 📜 TASK LIST 📜 */}
            <div className="space-y-3 max-h-96 overflow-y-auto cyber-scrollbar">
              {tasks.length === 0 ? (
                <div className="terminal-window rounded-lg p-6 text-center">
                  <p className="font-terminal text-sm neon-text-green">
                    &gt; AKTİF GÖREV YOK<br/>
                    &gt; SİSTEM TALİMAT BEKLİYOR...
                  </p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`neon-border rounded-lg p-4 bg-black/60 hover:bg-black/80 transition-all duration-300 ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300 ${
                          task.completed 
                            ? 'bg-cyan-500 border-cyan-500' 
                            : 'border-cyan-500 hover:border-pink-500'
                        }`}
                      >
                        {task.completed && <span className="text-black text-xs">✓</span>}
                      </button>
                      <div className="flex-1">
                        <p className={`font-terminal text-sm ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {task.text}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-terminal text-xs text-gray-500">{task.timestamp}</span>
                          <span className={`font-terminal text-xs ${getPriorityColor(task.priority)}`}>
                            [{task.priority.toUpperCase()}]
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-400 transition-colors duration-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 📝 NOTEPAD PANEL 📝 */}
          <div className="retro-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-retro text-xl neon-text-cyan flex items-center gap-2">
                <span className="text-2xl">📟</span>
                <span>NEURAL GÜNLÜK</span>
              </h2>
              <button className="cyber-button rounded px-4 py-2 font-terminal text-xs">
                ŞİFRELE
              </button>
            </div>

            <div className="terminal-window rounded-lg p-4 h-96">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-terminal text-xs neon-text-green">KAYIT EDİLİYOR</span>
              </div>
              <textarea
                value={notepadText}
                onChange={(e) => setNotepadText(e.target.value)}
                className="w-full h-full bg-transparent font-terminal text-sm resize-none focus:outline-none cyber-scrollbar"
                placeholder="> Düşüncelerinizi girin..."
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button className="cyber-button rounded-lg px-4 py-2 font-terminal text-xs flex-1">
                🎤 SESLİ NOT
              </button>
              <button className="cyber-button rounded-lg px-4 py-2 font-terminal text-xs flex-1">
                💾 GÜNLÜĞÜ KAYDET
              </button>
            </div>
          </div>
        </div>

        {/* 🤖 AI ASSISTANT BAR 🤖 */}
        <div className="mt-6 retro-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full neon-border-pink bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center float-animation">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="font-terminal text-sm neon-text-pink">{assistantName || 'NEON-BOT'}</h3>
                <p className="font-terminal text-xs text-gray-500">AI Asistan Çevrimiçi</p>
              </div>
            </div>
            <button className="cyber-button rounded-lg px-6 py-3 font-terminal text-sm">
              AI İLE SOHBET
            </button>
          </div>
        </div>

        {/* 💾 FOOTER 💾 */}
        <div className="mt-6 text-center">
          <p className="font-terminal text-xs text-gray-600">
            NEON-DAY v2.077 | NEURAL INTERFACE ACTIVE | {new Date().toLocaleDateString('tr-TR')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default MainCyberpunk;
