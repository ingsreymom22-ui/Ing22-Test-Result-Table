import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Plus, Download, Calculator, GraduationCap, Users, FolderOpen, Save, FileSpreadsheet, FileText, Search, Maximize, Minimize, Pin, LogOut } from 'lucide-react';
import { Level, Student, ClassRecord, getLevelTotalWeight, calculateGrade } from './types';
import SettingsModal from './components/SettingsModal';
import GradeTable from './components/GradeTable';
import { exportToExcel, exportToPDF } from './lib/exportUtils';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { subscribeToLevels, subscribeToClasses, saveLevel, saveClassRecord, deleteClassRecordRef, deleteLevel } from './lib/firestoreUtils';

const DEFAULT_LEVELS: Level[] = [
  { id: 'l1', name: 'Foundation 1', subjects: [{ id: 's1', name: 'Listening', categories: [{ id: 'c1', name: 'Quizzes', weight: 5, itemCount: 5, itemMaxScores: [100, 100, 100, 100, 100] }, { id: 'c2', name: 'Assignment', weight: 20, itemCount: 2, itemMaxScores: [100, 100] }] }] },
  { id: 'l2', name: 'Foundation 2', subjects: [] },
  { id: 'l3', name: 'Survivor 1', subjects: [] },
  { id: 'l4', name: 'Survivor 2', subjects: [] },
  { id: 'l5', name: 'Explorer 1', subjects: [] },
  { id: 'l6', name: 'Explorer 2', subjects: [] },
  { id: 'l7', name: 'Achiever 1', subjects: [] },
  { id: 'l8', name: 'Achiever 2', subjects: [] },
  { id: 'l9', name: 'Master 1', subjects: [] },
  { id: 'l10', name: 'Master 2', subjects: [] },
  { id: 'l11', name: 'Champion 1', subjects: [] },
  { id: 'l12', name: 'Champion 2', subjects: [] },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [levels, setLevels] = useState<Level[]>([]);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  
  const [currentRecordId, setCurrentRecordId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubLevels = subscribeToLevels(user.uid, (fetchedLevels) => {
      if (fetchedLevels.length === 0) {
        // Initialize default levels for new users
        setLevels(DEFAULT_LEVELS);
        DEFAULT_LEVELS.forEach(l => saveLevel(user.uid, l));
      } else {
        setLevels(fetchedLevels);
      }
    });
    const unsubClasses = subscribeToClasses(user.uid, (fetchedClasses) => {
      setClassRecords(fetchedClasses);
      if (fetchedClasses.length > 0 && !currentRecordId) {
        setCurrentRecordId(fetchedClasses[0].id);
      }
    });
    return () => {
      unsubLevels();
      unsubClasses();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLevels([]);
      setClassRecords([]);
      setCurrentRecordId('');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const filteredRecords = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = classRecords.filter(cr => 
      cr.className.toLowerCase().includes(query) ||
      cr.teacherName.toLowerCase().includes(query) ||
      cr.termName.toLowerCase().includes(query) ||
      (levels.find(l => l.id === cr.levelId)?.name.toLowerCase() || '').includes(query)
    );
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.className.localeCompare(b.className);
    });
  }, [classRecords, levels, searchQuery]);

  const currentRecord = classRecords.find(cr => cr.id === currentRecordId) || classRecords[0];
  const currentLevel = levels.find(l => l.id === currentRecord?.levelId) || levels[0];
  const totalWeight = currentLevel ? getLevelTotalWeight(currentLevel) : 0;

  const handleUpdateLevel = (updatedLevel: Level) => {
    if (!user) return;
    saveLevel(user.uid, updatedLevel);
  };

  const handleReplaceLevels = (newLevels: Level[]) => {
    if (!user) return;
    // Just save all the newly set levels, real-time sync will pick them up
    newLevels.forEach(l => saveLevel(user.uid, l));
  };

  const handleUpdateCurrentRecord = (field: keyof ClassRecord, value: any) => {
    if (!currentRecord || !user) return;
    const updated = { ...currentRecord, [field]: value };
    saveClassRecord(user.uid, updated);
  };

  const handleCreateNewRecord = () => {
    if (!user || levels.length === 0) return;
    const newRecord: ClassRecord = {
      id: Math.random().toString(36).substr(2, 9),
      termName: 'New Term',
      className: 'New Class',
      teacherName: user.displayName || 'Teacher Name',
      levelId: levels[0].id,
      students: []
    };
    saveClassRecord(user.uid, newRecord);
    setCurrentRecordId(newRecord.id);
  };

  const handleDeleteCurrentRecord = () => {
    if (classRecords.length <= 1 || !currentRecord || !user) return;
    deleteClassRecordRef(user.uid, currentRecord.id);
    const remaining = classRecords.filter(cr => cr.id !== currentRecord.id);
    if (remaining.length > 0) {
      setCurrentRecordId(remaining[0].id);
    }
  };

  const handleAddStudent = () => {
    if (!currentRecord || !user) return;
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Student',
      scores: {},
      attendance: '',
      comment: ''
    };
    const updated = { ...currentRecord, students: [...currentRecord.students, newStudent] };
    saveClassRecord(user.uid, updated);
  };

  const handleUpdateStudentScore = (id: string, categoryId: string, itemIndex: number, value: any) => {
    if (!currentRecord || !user) return;
    const updated = {
      ...currentRecord,
      students: currentRecord.students.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          scores: { ...s.scores, [`${categoryId}_${itemIndex}`]: value }
        };
      })
    };
    saveClassRecord(user.uid, updated);
  };

  const handleUpdateStudentField = (id: string, field: string, value: any) => {
    if (!currentRecord || !user) return;
    const updated = {
      ...currentRecord,
      students: currentRecord.students.map(s => s.id === id ? { ...s, [field]: value } : s)
    };
    saveClassRecord(user.uid, updated);
  };

  const handleDeleteStudent = (id: string) => {
    if (!currentRecord || !user) return;
    const updated = { ...currentRecord, students: currentRecord.students.filter(s => s.id !== id) };
    saveClassRecord(user.uid, updated);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'T';
  const getTeacherColor = (name: string) => {
    const colors = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-sm w-full">
          <div className="bg-blue-600 p-3 rounded-xl inline-flex mb-4">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Teacher Grade Calculator</h2>
          <p className="text-slate-500 mb-6">Sign in to manage your classes and grading structures.</p>
          <button 
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Initializing Data</h2>
          <p className="text-slate-500 mb-4 animate-pulse">Setting up your default levels...</p>
        </div>
      </div>
    );
  }

  if (!currentRecord) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 flex-col">
         <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">No Classes Found</h2>
          <p className="text-slate-500 mb-6">You don't have any class records yet. Create one to get started.</p>
          <div className="flex flex-col gap-3">
             <button 
                onClick={handleCreateNewRecord}
                className="px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Class
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Sign out
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Developing Potential for Success</h1>
              <p className="text-sm text-slate-500">Performance Calculator</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full lg:w-auto">
            {/* Search and Class Selector */}
            <div className="flex flex-1 md:flex-none items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <div className="flex items-center px-2 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 focus:ring-0 text-sm w-32 outline-none"
              />
              <div className="w-px h-5 bg-slate-300 mx-2"></div>
              <select
                value={currentRecordId}
                onChange={(e) => setCurrentRecordId(e.target.value)}
                className="px-2 py-1.5 text-sm font-medium text-slate-800 bg-transparent border-0 focus:ring-0 min-w-[120px] max-w-[200px] cursor-pointer outline-none truncate"
              >
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(cr => (
                    <option key={cr.id} value={cr.id}>{cr.isPinned ? '📌 ' : ''}{cr.teacherName} - {cr.className}</option>
                  ))
                ) : (
                  <option disabled>No classes found</option>
                )}
              </select>
              <button
                onClick={() => handleUpdateCurrentRecord('isPinned', !currentRecord.isPinned)}
                className={`p-1.5 ml-1 rounded shadow-sm transition-colors ${currentRecord.isPinned ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-500 hover:text-blue-600 hover:bg-white'}`}
                title={currentRecord.isPinned ? "Unpin Class" : "Pin Class"}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateNewRecord}
                className="p-1.5 ml-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded shadow-sm transition-colors"
                title="Create New Class Record"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg whitespace-nowrap ${showSettings ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                <Settings className="w-4 h-4" />
                Level Config
              </button>
              
              <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shrink-0">
                <button
                  onClick={() => exportToExcel(currentRecord, currentLevel)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-r border-slate-200"
                  title="Export Summary to Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Excel
                </button>
                <button
                  onClick={() => exportToPDF(currentRecord, currentLevel)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors border-r border-slate-200"
                  title="Export Summary to PDF"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  PDF
                </button>
              </div>

              <button
                onClick={handleAddStudent}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 border border-transparent"
              >
                <Plus className="w-4 h-4" />
                Add Student
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 ml-1 text-slate-500 hover:text-red-600 bg-white border border-slate-300 rounded-lg shadow-sm transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-6 flex-1 flex flex-col">
        
        {/* Class Record Meta Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap gap-6 items-center shrink-0">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Term / Semester</label>
            <input 
              type="text" 
              value={currentRecord.termName} 
              onChange={e => handleUpdateCurrentRecord('termName', e.target.value)}
              className="w-full text-base font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5 transition-colors"
              placeholder="e.g. Term 1, 2024"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Class Name</label>
            <input 
              type="text" 
              value={currentRecord.className} 
              onChange={e => handleUpdateCurrentRecord('className', e.target.value)}
              className="w-full text-base font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5 transition-colors"
              placeholder="e.g. Morning Class A"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
            <div className="flex items-center gap-2 relative">
              <div className={`w-6 h-6 rounded flex shrink-0 items-center justify-center text-xs font-bold ${getTeacherColor(currentRecord.teacherName)}`}>
                {getInitials(currentRecord.teacherName)}
              </div>
              <input 
                type="text" 
                value={currentRecord.teacherName} 
                onChange={e => handleUpdateCurrentRecord('teacherName', e.target.value)}
                className="w-full text-base font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5 transition-colors"
                placeholder="Teacher Name"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Level Profile</label>
            <select
              value={currentRecord.levelId}
              onChange={(e) => handleUpdateCurrentRecord('levelId', e.target.value)}
              className="w-full text-base font-semibold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5 transition-colors cursor-pointer"
            >
              {levels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {showSettings && (
          <SettingsModal
            level={currentLevel}
            levels={levels}
            onUpdateLevel={handleUpdateLevel}
            onReplaceLevels={handleReplaceLevels}
            onClose={() => setShowSettings(false)}
          />
        )}

        <div className={`bg-white shadow-sm border border-slate-200 overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'rounded-xl flex-1 min-h-[400px]'}`}>
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
            <h2 className="text-lg font-medium text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              Student Roster & Grades
            </h2>
            <div className="flex items-center gap-3">
              {totalWeight !== 100 && totalWeight > 0 && (
                <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 hidden md:inline-block">
                  Warning: Level total weight is {totalWeight}%
                </span>
              )}
              {totalWeight === 0 && (
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 hidden md:inline-block">
                  Configure subjects in Level Config
                </span>
              )}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded shadow-sm transition-colors border border-slate-200"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-50 relative">
            {currentLevel.subjects.length > 0 ? (
              <GradeTable
                level={currentLevel}
                onUpdateLevel={handleUpdateLevel}
                students={currentRecord.students}
                onUpdateStudent={handleUpdateStudentScore}
                onUpdateStudentField={handleUpdateStudentField}
                onDeleteStudent={handleDeleteStudent}
              />
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center min-h-full">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-1">No Subjects Configured</h3>
                <p className="text-slate-500 mb-4 max-w-sm">Open Level Config to define subjects, categories, and their weights before adding student grades.</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Configure Level
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

