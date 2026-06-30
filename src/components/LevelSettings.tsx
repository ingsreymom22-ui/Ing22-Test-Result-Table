import React, { useState } from 'react';
import { Level, Subject, Category, getLevelTotalWeight, getSubjectWeight } from '../types';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';

interface Props {
  level: Level;
  onUpdateLevel: (level: Level) => void;
  onClose: () => void;
  hideHeader?: boolean;
}

export default function LevelSettings({ level, onUpdateLevel, onClose, hideHeader = false }: Props) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryWeight, setNewCategoryWeight] = useState('');
  const [newCategoryItems, setNewCategoryItems] = useState('1');

  const totalWeight = getLevelTotalWeight(level);

  const handleUpdateLevelName = (name: string) => {
    onUpdateLevel({ ...level, name });
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSubject: Subject = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSubjectName.trim(),
      categories: []
    };
    onUpdateLevel({ ...level, subjects: [...level.subjects, newSubject] });
    setNewSubjectName('');
    setExpandedSubject(newSubject.id);
  };

  const handleUpdateSubjectName = (subjectId: string, name: string) => {
    const newSubjects = level.subjects.map(s => s.id === subjectId ? { ...s, name } : s);
    onUpdateLevel({ ...level, subjects: newSubjects });
  };

  const handleUpdateSubjectTarget = (subjectId: string, targetWeight: number) => {
    const newSubjects = level.subjects.map(s => s.id === subjectId ? { ...s, targetWeight } : s);
    onUpdateLevel({ ...level, subjects: newSubjects });
  };

  const handleDeleteSubject = (subjectId: string) => {
    onUpdateLevel({ ...level, subjects: level.subjects.filter(s => s.id !== subjectId) });
  };

  const handleAddCategory = (subjectId: string) => {
    if (!newCategoryName.trim() || !newCategoryWeight || !newCategoryItems) return;
    const count = Number(newCategoryItems);
    const newCategory: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCategoryName.trim(),
      weight: Number(newCategoryWeight),
      itemCount: count,
      itemMaxScores: Array(count).fill(100)
    };
    const newSubjects = level.subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, categories: [...s.categories, newCategory] };
      }
      return s;
    });
    onUpdateLevel({ ...level, subjects: newSubjects });
    setNewCategoryName('');
    setNewCategoryWeight('');
    setNewCategoryItems('1');
  };

  const handleUpdateCategory = (subjectId: string, categoryId: string, field: keyof Category, value: any) => {
    const newSubjects = level.subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          categories: s.categories.map(c => {
            if (c.id === categoryId) {
              const updatedCategory = { ...c, [field]: value };
              if (field === 'itemCount') {
                const count = Number(value);
                const currentScores = updatedCategory.itemMaxScores || [];
                // Resize array: keep existing scores, default new ones to 100
                updatedCategory.itemMaxScores = Array.from({ length: count }, (_, i) => currentScores[i] ?? 100);
              }
              return updatedCategory;
            }
            return c;
          })
        };
      }
      return s;
    });
    onUpdateLevel({ ...level, subjects: newSubjects });
  };

  const handleDeleteCategory = (subjectId: string, categoryId: string) => {
    const newSubjects = level.subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, categories: s.categories.filter(c => c.id !== categoryId) };
      }
      return s;
    });
    onUpdateLevel({ ...level, subjects: newSubjects });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {!hideHeader && (
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex-1">
            <input
              type="text"
              value={level.name}
              onChange={(e) => handleUpdateLevelName(e.target.value)}
              className="text-xl font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors px-1 w-full max-w-sm"
              placeholder="Level Name"
            />
            <p className="text-sm text-slate-500 px-1 mt-1">Configure subjects, assignments, and test weights for this level.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div className="p-5 space-y-4">
        {level.subjects.map((subject) => {
          const isExpanded = expandedSubject === subject.id;
          const subjectWeight = getSubjectWeight(subject);
          
          return (
            <div key={subject.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-3 flex items-center gap-3">
                <button
                  onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={subject.name}
                  onChange={(e) => handleUpdateSubjectName(subject.id, e.target.value)}
                  className="flex-1 min-w-[120px] bg-transparent font-medium text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                  placeholder="Subject Name"
                />
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-xs text-slate-500 hidden sm:inline">Target:</span>
                  <div className="relative">
                    <input 
                      type="number"
                      min="0"
                      value={subject.targetWeight ?? ''}
                      onChange={(e) => handleUpdateSubjectTarget(subject.id, Number(e.target.value))}
                      className="w-16 bg-white border border-slate-300 rounded px-1.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      placeholder="e.g. 25"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${
                    subject.targetWeight !== undefined && subjectWeight !== subject.targetWeight && subjectWeight !== 100
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : 'bg-slate-200 text-slate-600'
                  }`} title={subject.targetWeight !== undefined && subjectWeight !== subject.targetWeight && subjectWeight !== 100 ? 'Warning: Actual sum of categories does not match target weight (should equal target weight or 100%)' : 'Actual sum of categories'}>
                    {subjectWeight}% Actual
                  </span>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
                  {subject.categories.length > 0 ? (
                    <div className="space-y-2">
                      {subject.categories.map(category => (
                        <div key={category.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={category.name}
                              onChange={(e) => handleUpdateCategory(subject.id, category.id, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Category (e.g., Quizzes)"
                            />
                          </div>
                          <div className="w-24 relative flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-12">Items:</span>
                            <input
                              type="number"
                              min="1"
                              value={category.itemCount}
                              onChange={(e) => handleUpdateCategory(subject.id, category.id, 'itemCount', Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                              title="Number of items (e.g., 5 quizzes)"
                            />
                          </div>
                          <div className="w-24 relative flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-12">Weight:</span>
                            <input
                              type="number"
                              min="0"
                              value={category.weight}
                              onChange={(e) => handleUpdateCategory(subject.id, category.id, 'weight', Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center pr-6"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                          </div>
                          <button
                            onClick={() => handleDeleteCategory(subject.id, category.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic px-2">No categories defined yet.</p>
                  )}

                  <div className="flex items-center gap-3 p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50/50 mt-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New Category (e.g., Assignment)"
                      className="flex-1 bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={newCategoryItems}
                        onChange={(e) => setNewCategoryItems(e.target.value)}
                        placeholder="Items"
                        title="Number of items"
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                    </div>
                    <div className="w-24 relative">
                      <input
                        type="number"
                        min="0"
                        value={newCategoryWeight}
                        onChange={(e) => setNewCategoryWeight(e.target.value)}
                        placeholder="Weight %"
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6 text-center"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                    <button
                      onClick={() => handleAddCategory(subject.id)}
                      disabled={!newCategoryName || !newCategoryWeight || !newCategoryItems}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            placeholder="Add new subject (e.g., Mathematics)"
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddSubject}
            disabled={!newSubjectName.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        </div>

        <div className={`mt-6 p-4 rounded-xl flex items-center justify-between text-sm font-medium border ${totalWeight === 100 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          <div className="flex flex-col">
            <span className="text-base font-semibold">Total Level Weight: {totalWeight}%</span>
            {totalWeight !== 100 && (
              <span className="text-xs font-normal mt-0.5">Please ensure the sum of all category weights across subjects equals 100% (or your desired scale).</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

