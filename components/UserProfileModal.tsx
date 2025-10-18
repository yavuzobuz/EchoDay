import React, { useState, useEffect } from 'react';

interface UserProfile {
  name?: string;
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'friendly';
    responseLength: 'short' | 'medium' | 'detailed';
    topics: string[];
    language: string;
  };
  habits: {
    activeHours: string[];
    commonTasks: string[];
    frequentQuestions: string[];
  };
  context: {
    currentProjects: string[];
    goals: string[];
    challenges: string[];
  };
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onSave }) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    preferences: {
      communicationStyle: 'friendly',
      responseLength: 'medium',
      topics: [],
      language: 'tr'
    },
    habits: {
      activeHours: [],
      commonTasks: [],
      frequentQuestions: []
    },
    context: {
      currentProjects: [],
      goals: [],
      challenges: []
    }
  });

  const [newTopic, setNewTopic] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newGoal, setNewGoal] = useState('');

  // Load existing profile on mount
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('echoday_user_profile');
      if (stored) {
        try {
          setProfile(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('echoday_user_profile', JSON.stringify(profile));
    onSave(profile);
    onClose();
  };

  const addItem = (field: string, value: string, subField?: string) => {
    if (!value.trim()) return;
    
    setProfile(prev => {
      const newProfile = { ...prev };
      if (subField) {
        (newProfile as any)[field][subField] = [...(newProfile as any)[field][subField], value.trim()];
      } else {
        (newProfile as any)[field] = [...(newProfile as any)[field], value.trim()];
      }
      return newProfile;
    });
  };

  const removeItem = (field: string, index: number, subField?: string) => {
    setProfile(prev => {
      const newProfile = { ...prev };
      if (subField) {
        (newProfile as any)[field][subField] = (newProfile as any)[field][subField].filter((_: any, i: number) => i !== index);
      } else {
        (newProfile as any)[field] = (newProfile as any)[field].filter((_: any, i: number) => i !== index);
      }
      return newProfile;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🤖 AI Asistan Profili
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI asistanınızın sizi daha iyi tanıması için profilinizi özelleştirin
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Temel Bilgiler */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              👤 Temel Bilgiler
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  İsim (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={profile.name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="AI asistanınızın sizi nasıl çağırmasını istersiniz?"
                />
              </div>
            </div>
          </div>

          {/* İletişim Tercihleri */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💬 İletişim Tercihleri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  İletişim Stili
                </label>
                <select
                  value={profile.preferences.communicationStyle}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      communicationStyle: e.target.value as 'formal' | 'casual' | 'friendly'
                    }
                  }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="friendly">Dostane ve Samimi</option>
                  <option value="casual">Rahat ve Günlük</option>
                  <option value="formal">Resmi ve Profesyonel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yanıt Uzunluğu
                </label>
                <select
                  value={profile.preferences.responseLength}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      responseLength: e.target.value as 'short' | 'medium' | 'detailed'
                    }
                  }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="short">Kısa ve Öz</option>
                  <option value="medium">Orta Uzunlukta</option>
                  <option value="detailed">Detaylı Açıklamalar</option>
                </select>
              </div>
            </div>
          </div>

          {/* İlgi Alanları */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🎯 İlgi Alanları
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Yeni ilgi alanı ekle..."
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addItem('preferences', newTopic, 'topics');
                      setNewTopic('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addItem('preferences', newTopic, 'topics');
                    setNewTopic('');
                  }}
                  className="px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Ekle
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.preferences.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {topic}
                    <button
                      onClick={() => removeItem('preferences', index, 'topics')}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mevcut Projeler */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📋 Mevcut Projeler
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Üzerinde çalıştığınız proje..."
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addItem('context', newProject, 'currentProjects');
                      setNewProject('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addItem('context', newProject, 'currentProjects');
                    setNewProject('');
                  }}
                  className="px-4 py-3 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Ekle
                </button>
              </div>
              <div className="space-y-2">
                {profile.context.currentProjects.map((project, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md"
                  >
                    <span className="text-green-800 dark:text-green-200">{project}</span>
                    <button
                      onClick={() => removeItem('context', index, 'currentProjects')}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hedefler */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🎯 Hedefler
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Ulaşmak istediğiniz hedef..."
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addItem('context', newGoal, 'goals');
                      setNewGoal('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addItem('context', newGoal, 'goals');
                    setNewGoal('');
                  }}
                  className="px-4 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                  Ekle
                </button>
              </div>
              <div className="space-y-2">
                {profile.context.goals.map((goal, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md"
                  >
                    <span className="text-purple-800 dark:text-purple-200">{goal}</span>
                    <button
                      onClick={() => removeItem('context', index, 'goals')}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Profili Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
