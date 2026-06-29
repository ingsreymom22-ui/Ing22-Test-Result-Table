import React, { useState, useEffect } from 'react';
import { X, User, Save, Copy, FileText, Database } from 'lucide-react';
import { Level, Subject } from '../types';
import LevelSettings from './LevelSettings';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

interface Props {
  level: Level;
  levels: Level[];
  onUpdateLevel: (level: Level) => void;
  onReplaceLevels: (levels: Level[]) => void;
  onClose: () => void;
}

const TEMPLATE_100_PERCENT: Subject[] = [
  {
    id: 's1',
    name: 'Listening',
    categories: [
      { id: 'c1', name: 'Quizzes', weight: 5, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] },
      { id: 'c2', name: 'Assignment', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c3', name: 'Class Participation', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c4', name: 'Homework', weight: 10, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] }
    ]
  },
  {
    id: 's2',
    name: 'Reading',
    categories: [
      { id: 'c1', name: 'Quizzes', weight: 5, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] },
      { id: 'c2', name: 'Assignment', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c3', name: 'Class Participation', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c4', name: 'Homework', weight: 10, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] }
    ]
  },
  {
    id: 's3',
    name: 'Grammar',
    categories: [
      { id: 'c1', name: 'Quizzes', weight: 5, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] },
      { id: 'c2', name: 'Assignment', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c3', name: 'Class Participation', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c4', name: 'Homework', weight: 10, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] }
    ]
  },
  {
    id: 's4',
    name: 'Vocabulary',
    categories: [
      { id: 'c1', name: 'Quizzes', weight: 5, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] },
      { id: 'c2', name: 'Assignment', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c3', name: 'Class Participation', weight: 5, itemCount: 1, itemMaxScores: [100] },
      { id: 'c4', name: 'Homework', weight: 10, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] }
    ]
  }
];

export default function SettingsModal({ level, levels, onUpdateLevel, onReplaceLevels, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'level' | 'templates' | 'appearance' | 'account'>('level');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authError, setAuthError] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<{id: string, name: string, authorName: string, levels: Level[]}[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      fetchTemplates();
    });
    return () => unsubscribe();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Fetch globally shared templates
      const querySnapshot = await getDocs(collection(db, `templates`));
      const templates: any[] = [];
      querySnapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() });
      });
      setSavedTemplates(templates);
    } catch (e) {
      console.error("Error fetching templates:", e);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user) return;
    const templateName = prompt("Enter template name (e.g., 'Foundation Term 1'):");
    if (!templateName) return;
    
    try {
      const templateId = Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, `templates`, templateId), {
        name: templateName,
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Teacher',
        levels: levels
      });
      fetchTemplates();
    } catch (e) {
      console.error("Error saving template:", e);
      alert("Failed to save template. Make sure you are signed in.");
    }
  };

  const handleLoadTemplate = (templateLevels: Level[]) => {
    if (confirm("This will replace all your current levels with the template. Are you sure?")) {
      onReplaceLevels(templateLevels);
      alert("Template applied to all levels!");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleRenameTemplate = async (templateId: string, authorId: string, currentName: string) => {
    if (!user || user.uid !== authorId) return;
    const newName = prompt("Enter new name for this template:", currentName);
    if (!newName || newName === currentName) return;
    
    try {
      await updateDoc(doc(db, `templates`, templateId), {
        name: newName
      });
      fetchTemplates();
    } catch (e) {
      console.error("Error renaming template:", e);
      alert("Failed to rename template.");
    }
  };

  const handleDeleteTemplate = async (templateId: string, authorId: string) => {
    if (!user || user.uid !== authorId) return;
    if (confirm("Are you sure you want to delete this template from the community library?")) {
      try {
        await deleteDoc(doc(db, `templates`, templateId));
        fetchTemplates();
      } catch (e) {
        console.error("Error deleting template:", e);
        alert("Failed to delete template.");
      }
    }
  };

  const handleDuplicateTemplate = async (template: {id: string, name: string, authorName: string, levels: Level[]}) => {
    if (!user) {
      alert("Please sign in to duplicate templates.");
      return;
    }
    
    try {
      const templateId = Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, `templates`, templateId), {
        name: template.name + ' (Copy)',
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Teacher',
        levels: template.levels
      });
      fetchTemplates();
      alert("Template duplicated successfully!");
    } catch (e) {
      console.error("Error duplicating template:", e);
      alert("Failed to duplicate template.");
    }
  };

  const applyTemplateToCurrent = () => {
    if (confirm("This will replace the current level's subjects. Continue?")) {
      onUpdateLevel({ ...level, subjects: JSON.parse(JSON.stringify(TEMPLATE_100_PERCENT)) });
      alert("Template applied to current level!");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex border-b border-slate-200">
          <button
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'level' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('level')}
          >
            Current Level
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates & Sync
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'appearance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'account' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('account')}
          >
            Account
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="p-4 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
          {activeTab === 'level' && (
             <div className="p-6">
                <LevelSettings level={level} onUpdateLevel={onUpdateLevel} onClose={() => {}} hideHeader={true} />
             </div>
          )}

          {activeTab === 'templates' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Templates Library</h2>
                  <p className="text-sm text-slate-500">Save your full level structures to the community library, or load existing ones.</p>
                </div>
                {user ? (
                  <button onClick={handleSaveTemplate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    <Save className="w-4 h-4" />
                    Save My Levels as Template
                  </button>
                ) : (
                  <button onClick={() => setActiveTab('account')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium border border-slate-200">
                    <User className="w-4 h-4" />
                    Sign In to Save Templates
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedTemplates.map(template => (
                  <div key={template.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-purple-50 rounded-xl shrink-0">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-lg line-clamp-1" title={template.name}>{template.name}</h4>
                        <p className="text-sm text-slate-500 mt-1">{template.levels.length} levels configured</p>
                        <p className="text-xs text-slate-400 mt-1">By {template.authorName || 'Teacher'}</p>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleLoadTemplate(template.levels)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Copy className="w-4 h-4" /> Load
                        </button>
                        <button 
                          onClick={() => handleDuplicateTemplate(template)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Duplicate to Library"
                        >
                          <Copy className="w-4 h-4" /> Duplicate
                        </button>
                      </div>
                      
                      {user && user.uid === (template as any).authorId && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleRenameTemplate(template.id, (template as any).authorId, template.name)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            Rename
                          </button>
                          <button 
                            onClick={() => handleDeleteTemplate(template.id, (template as any).authorId)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-xl shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-lg">Standard 100% Template</h4>
                      <p className="text-sm text-slate-500 mt-1">Listening (25%), Reading (25%), Grammar (25%), Vocabulary (25%). Each with Quizzes, Assignment, Participation, and Homework.</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <button 
                      onClick={applyTemplateToCurrent}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <Copy className="w-4 h-4" /> Apply to Current Level Only
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Appearance</h2>
                <p className="text-sm text-slate-500">Customize the look and feel of your app.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Interface Font</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => {
                        document.documentElement.style.setProperty('--font-sans', e.target.value);
                      }}
                      defaultValue="Inter, sans-serif"
                    >
                      <option value="Inter, sans-serif">Inter (Default)</option>
                      <option value="system-ui, sans-serif">System Default</option>
                      <option value="'Comic Sans MS', cursive, sans-serif">Comic Sans (Fun)</option>
                      <option value="'Times New Roman', serif">Times New Roman (Formal)</option>
                      <option value="'Space Grotesk', sans-serif">Space Grotesk (Modern)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Accent Theme</label>
                    <div className="flex gap-3">
                      {['blue', 'purple', 'emerald', 'rose'].map(color => (
                        <button key={color} className={`w-10 h-10 rounded-full border-2 border-transparent hover:scale-110 transition-transform bg-${color}-500`} title={color}></button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Note: Theme colors are currently hardcoded for stability. Future updates will allow full theme customization.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="p-6 max-w-md mx-auto">
              {!user ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Sign In</h2>
                    <p className="text-sm text-slate-500">Sign in to sync your class records.</p>
                  </div>
                  
                  {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{authError}</div>}
                  
                  <div className="space-y-2">
                    <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                      Continue with Google
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-8 h-8" />}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">{user.displayName || 'Teacher'}</h3>
                  <p className="text-sm text-slate-500 mb-6">{user.email}</p>
                  
                  <div className="bg-slate-50 p-4 rounded-lg mb-6 text-left">
                    <p className="text-sm font-medium text-slate-700 mb-1">Status: Logged In</p>
                    <p className="text-xs text-slate-500">Your class records and settings are synced and secured.</p>
                  </div>

                  <button onClick={handleLogout} className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

