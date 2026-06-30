import React, { useMemo, useState } from 'react';
import { Level, Student, calculateGrade, getSubjectWeight } from '../types';
import { Trash2, ArrowUpDown, EyeOff, Eye } from 'lucide-react';

interface Props {
  level: Level;
  onUpdateLevel?: (level: Level) => void;
  students: Student[];
  onUpdateStudent: (id: string, categoryId: string, itemIndex: number, value: any) => void;
  onUpdateStudentField: (id: string, field: string, value: any) => void;
  onDeleteStudent: (id: string) => void;
  resultMode: 'full' | 'midterm' | 'final';
}

const getSubjectColors = (index: number) => {
  const colors = [
    { bg: 'bg-blue-50/40', border: 'border-blue-100', text: 'text-blue-900', avgBg: 'bg-blue-100/60' },
    { bg: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-900', avgBg: 'bg-emerald-100/60' },
    { bg: 'bg-amber-50/40', border: 'border-amber-100', text: 'text-amber-900', avgBg: 'bg-amber-100/60' },
    { bg: 'bg-purple-50/40', border: 'border-purple-100', text: 'text-purple-900', avgBg: 'bg-purple-100/60' },
    { bg: 'bg-rose-50/40', border: 'border-rose-100', text: 'text-rose-900', avgBg: 'bg-rose-100/60' },
    { bg: 'bg-cyan-50/40', border: 'border-cyan-100', text: 'text-cyan-900', avgBg: 'bg-cyan-100/60' }
  ];
  return colors[index % colors.length];
};

export default function GradeTable({ level, onUpdateLevel, students, onUpdateStudent, onUpdateStudentField, onDeleteStudent, resultMode }: Props) {
  
  const [hiddenSubjects, setHiddenSubjects] = useState<string[]>([]);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const toggleSubject = (subjectId: string) => {
    setHiddenSubjects(prev => 
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setHiddenCategories(prev => 
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const subjectCols: { subject: any, colSpan: number, isHidden: boolean, index: number }[] = [];
  const categoryCols: { category: any, colSpan: number, subjectId: string, isHidden?: boolean, subjectIndex: number }[] = [];
  const itemCols: { categoryId: string, subjectId: string, itemIndex: number, label: string, maxScore: number, isAvg?: boolean, isHidden?: boolean, subjectIndex: number }[] = [];

  level.subjects.forEach((subject, subjectIndex) => {
    const isHidden = hiddenSubjects.includes(subject.id);
    let subjectSpan = 0;
    
    if (isHidden) {
      subjectCols.push({ subject, colSpan: 1, isHidden: true, index: subjectIndex });
      categoryCols.push({ category: { id: `hidden_cat_${subject.id}`, name: 'Hidden' }, colSpan: 1, subjectId: subject.id, isHidden: true, subjectIndex });
      itemCols.push({ categoryId: `hidden_cat_${subject.id}`, subjectId: subject.id, itemIndex: -2, label: '-', maxScore: 0, isHidden: true, subjectIndex });
    } else {
      // Filter categories according to resultMode
      const activeCategories = subject.categories.filter(c => {
        const isFinal = c.name.toLowerCase().includes('final');
        if (resultMode === 'midterm') return !isFinal;
        if (resultMode === 'final') return isFinal;
        return true;
      });

      activeCategories.forEach(category => {
        const isCatHidden = hiddenCategories.includes(category.id);
        // +1 for the Average column in each category if not hidden
        const catSpan = isCatHidden ? 1 : category.itemCount + 1;
        categoryCols.push({ category, colSpan: catSpan, subjectId: subject.id, subjectIndex });
        subjectSpan += catSpan;
        
        if (!isCatHidden) {
          for (let i = 0; i < category.itemCount; i++) {
            itemCols.push({
              categoryId: category.id,
              subjectId: subject.id,
              itemIndex: i,
              label: '',
              maxScore: category.itemMaxScores?.[i] ?? 100,
              subjectIndex
            });
          }
        }
        itemCols.push({
          categoryId: category.id,
          subjectId: subject.id,
          itemIndex: -1,
          label: 'Avg',
          maxScore: 100,
          isAvg: true,
          subjectIndex
        });
      });

      // Append Subject Avg Column at the end of the subject!
      categoryCols.push({ 
        category: { id: `subj_avg_${subject.id}`, name: 'Subject Avg' }, 
        colSpan: 1, 
        subjectId: subject.id, 
        subjectIndex 
      });
      subjectSpan += 1;

      itemCols.push({
        categoryId: `subj_avg_${subject.id}`,
        subjectId: subject.id,
        itemIndex: -3, // Special index for Subject average out of 100%
        label: '100%',
        maxScore: 100,
        isAvg: true,
        subjectIndex
      });

      if (subjectSpan > 0) {
        subjectCols.push({ subject, colSpan: subjectSpan, isHidden: false, index: subjectIndex });
      }
    }
  });

  const handleUpdateMaxScore = (subjectId: string, categoryId: string, itemIndex: number, newMax: number) => {
    if (!onUpdateLevel) return;
    const newSubjects = level.subjects.map(s => {
      if (s.id !== subjectId) return s;
      return {
        ...s,
        categories: s.categories.map(c => {
          if (c.id !== categoryId) return c;
          const newMaxScores = [...(c.itemMaxScores || Array(c.itemCount).fill(100))];
          newMaxScores[itemIndex] = newMax;
          return { ...c, itemMaxScores: newMaxScores };
        })
      };
    });
    onUpdateLevel({ ...level, subjects: newSubjects });
  };

  // Pre-calculate final scores and ranks
  const studentMetrics = useMemo(() => {
    const scores = students.map(student => {
      let weightedSubjectSum = 0;
      let totalSubjectWeight = 0;
      const categoryAvgs: Record<string, number> = {};
      const subjectScores: Record<string, number> = {};
      
      level.subjects.forEach(subject => {
        let subjectPointsEarned = 0;
        let subjectCatWeightSum = 0;
        
        // Filter categories according to resultMode
        const activeCategories = subject.categories.filter(c => {
          const isFinal = c.name.toLowerCase().includes('final');
          if (resultMode === 'midterm') return !isFinal;
          if (resultMode === 'final') return isFinal;
          return true;
        });

        activeCategories.forEach(category => {
          let categoryEarned = 0;
          let categoryMax = 0;
          for (let i = 0; i < category.itemCount; i++) {
            const score = student.scores[`${category.id}_${i}`];
            if (typeof score === 'number') {
              categoryEarned += score;
              categoryMax += (category.itemMaxScores?.[i] || 100);
            }
          }
          const categoryPercentage = categoryMax > 0 ? (categoryEarned / categoryMax) : 0;
          const pointsEarned = categoryPercentage * category.weight;
          categoryAvgs[category.id] = pointsEarned;
          
          subjectPointsEarned += pointsEarned;
          subjectCatWeightSum += category.weight;
        });
        
        const subjectScorePercentage = subjectCatWeightSum > 0 ? (subjectPointsEarned / subjectCatWeightSum) * 100 : 0;
        subjectScores[subject.id] = subjectScorePercentage;

        const subjectTargetWeight = subject.targetWeight !== undefined && subject.targetWeight > 0 
          ? subject.targetWeight 
          : (subject.categories.reduce((sum, c) => sum + c.weight, 0) || 100);
          
        weightedSubjectSum += (subjectScorePercentage * subjectTargetWeight);
        totalSubjectWeight += subjectTargetWeight;
      });
      
      const finalScore = totalSubjectWeight > 0 ? (weightedSubjectSum / totalSubjectWeight) : 0;
      return { id: student.id, finalScore, categoryAvgs, subjectScores };
    });

    const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);
    
    return scores.reduce((acc, curr) => {
      const rank = sortedScores.findIndex(s => s.finalScore === curr.finalScore) + 1;
      acc[curr.id] = { finalScore: curr.finalScore, rank, categoryAvgs: curr.categoryAvgs, subjectScores: curr.subjectScores };
      return acc;
    }, {} as Record<string, { finalScore: number, rank: number, categoryAvgs: Record<string, number>, subjectScores: Record<string, number> }>);
  }, [students, level, resultMode]);

  const sortedStudents = useMemo(() => {
    if (!sortConfig) return students;
    return [...students].sort((a, b) => {
      const aMetrics = studentMetrics[a.id] || { finalScore: 0, rank: 999 };
      const bMetrics = studentMetrics[b.id] || { finalScore: 0, rank: 999 };
      
      let aValue: any = '';
      let bValue: any = '';

      if (sortConfig.key === 'finalScore') {
        aValue = aMetrics.finalScore;
        bValue = bMetrics.finalScore;
      } else if (sortConfig.key === 'rank') {
        aValue = aMetrics.rank;
        bValue = bMetrics.rank;
      } else if (sortConfig.key === 'name') {
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, studentMetrics, sortConfig]);

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-sm text-slate-600 border-collapse min-w-max">
        <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
          {/* Row 1: Subjects */}
          <tr>
            <th rowSpan={3} className="px-2 py-2 font-semibold border-r border-slate-200 w-10 text-center sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">#</th>
            <th rowSpan={3} className="px-2 py-2 font-semibold border-r border-slate-200 w-[160px] min-w-[160px] max-w-[160px] sticky left-10 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
              <div className="flex items-center justify-center gap-1">Name <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
            </th>
            <th rowSpan={3} className="px-1 py-2 font-semibold border-r border-slate-200 text-center w-16 text-[10px]">Attnd%</th>
            {subjectCols.map(sc => {
              const theme = getSubjectColors(sc.index);
              return (
              <th key={sc.subject.id} colSpan={sc.colSpan} className={`px-4 py-2 font-semibold border-r border-b text-center ${sc.isHidden ? 'bg-slate-200 border-slate-300 text-slate-500' : `${theme.bg} ${theme.border} ${theme.text}`}`}>
                <div className="flex items-center justify-center gap-2">
                  <span>{sc.subject.name} <span className="opacity-75 font-normal">({getSubjectWeight(sc.subject)}%)</span></span>
                  <button onClick={() => toggleSubject(sc.subject.id)} className="opacity-60 hover:opacity-100 focus:outline-none transition-opacity" title={sc.isHidden ? 'Unhide Subject' : 'Hide Subject'}>
                    {sc.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </th>
            )})}
            <th rowSpan={3} className="px-4 py-3 font-semibold bg-blue-50 border-l border-blue-100 text-center shadow-[-1px_0_0_0_#dbeafe] cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSort('finalScore')}>
              <div className="flex items-center justify-center gap-1">Total Avg <ArrowUpDown className="w-3 h-3 text-blue-400" /></div>
            </th>
            <th rowSpan={3} className="px-4 py-3 font-semibold bg-blue-50 border-l border-blue-100 text-center cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSort('rank')}>
              <div className="flex items-center justify-center gap-1">Rank <ArrowUpDown className="w-3 h-3 text-blue-400" /></div>
            </th>
            <th rowSpan={3} className="px-4 py-3 font-semibold bg-blue-50 border-l border-blue-100 text-center">Grade</th>
            <th rowSpan={3} className="px-4 py-3 font-semibold bg-blue-50 border-l border-blue-100 text-center">Status</th>
            <th rowSpan={3} className="px-4 py-3 font-semibold border-l border-slate-200 text-center w-48">Comment</th>
            <th rowSpan={3} className="px-4 py-3 font-semibold text-center border-l border-slate-200 w-16">Act</th>
          </tr>
          
          {/* Row 2: Categories */}
          <tr>
            {categoryCols.map((cc, i) => {
              if (cc.isHidden) return null;
              const theme = getSubjectColors(cc.subjectIndex);
              const isCatHidden = hiddenCategories.includes(cc.category.id);
              return (
                <th key={`${cc.category.id}_${i}`} colSpan={cc.colSpan} className={`px-2 py-2 font-semibold border-r border-b text-center ${theme.bg} ${theme.border} ${theme.text} whitespace-nowrap`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{cc.category.name} <span className="opacity-75 normal-case font-normal ml-0.5">({cc.category.weight}%)</span></span>
                    <button onClick={() => toggleCategory(cc.category.id)} className="opacity-50 hover:opacity-100 focus:outline-none transition-opacity" title={isCatHidden ? 'Show Category Items' : 'Hide Category Items'}>
                      {isCatHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </th>
              );
            })}
          </tr>

          {/* Row 3: Items */}
          <tr>
            {itemCols.map((ic, i) => {
              if (ic.isHidden) return null;
              const theme = getSubjectColors(ic.subjectIndex);
              return (
                <th key={`${ic.categoryId}_${ic.itemIndex}_${i}`} className={`px-1 py-1 font-medium border-r border-b text-center ${ic.isAvg ? `${theme.avgBg} ${theme.text} w-20 ${theme.border}` : `${theme.bg} ${theme.text} w-16 ${theme.border}`}`}>
                  {ic.isAvg ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{ic.label}</span>
                      <span className="text-[10px] normal-case opacity-75">Score</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center text-[10px] opacity-75 normal-case">
                        <span className="mr-0.5">/</span>
                        <input
                          type="number"
                          min="1"
                          value={ic.maxScore}
                          onChange={(e) => handleUpdateMaxScore(ic.subjectId, ic.categoryId, ic.itemIndex, Number(e.target.value))}
                          className="w-8 bg-transparent border border-transparent hover:border-black/10 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 rounded text-center transition-all outline-none"
                          title="Edit Max Score"
                        />
                      </div>
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedStudents.map((student, index) => {
            const metrics = studentMetrics[student.id] || { finalScore: 0, rank: '-', categoryAvgs: {} };
            const finalScore = metrics.finalScore;
            const rank = metrics.rank;
            let grade = calculateGrade(finalScore);
            let status = finalScore >= 70 ? 'Pass' : (finalScore < 50 ? 'Fail + Support 1 Month' : 'Fail');
            
            const attendanceVal = parseFloat(student.attendance || '100');
            const isAttendanceFail = !isNaN(attendanceVal) && attendanceVal < 70;
            if (isAttendanceFail) {
              status = 'Auto-Fail';
              grade = 'F';
            }

            return (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors even:bg-slate-50/30 group">
                <td className="px-1 py-1 border-r border-slate-100 text-center font-medium text-slate-400 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">
                  {index + 1}
                </td>
                <td className="px-2 py-1 border-r border-slate-100 sticky left-10 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 z-10 shadow-[1px_0_0_0_#f1f5f9] transition-colors w-[160px] min-w-[160px] max-w-[160px]">
                  <input
                    type="text"
                    value={student.name}
                    onChange={(e) => onUpdateStudentField(student.id, 'name', e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 rounded px-1.5 py-0.5 font-medium text-slate-900 transition-all outline-none truncate"
                    placeholder="Student Name"
                  />
                </td>
                <td className="px-1 py-1 border-r border-slate-100">
                  <input
                    type="text"
                    value={student.attendance || ''}
                    onChange={(e) => onUpdateStudentField(student.id, 'attendance', e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 rounded px-1 py-0.5 text-center transition-all outline-none text-sm"
                    placeholder="e.g. 95%"
                  />
                </td>
                
                {itemCols.map((ic, i) => {
                  if (ic.isHidden) return null;
                  
                  const theme = getSubjectColors(ic.subjectIndex);

                  if (ic.itemIndex === -3) {
                    const subAvg = metrics.subjectScores?.[ic.subjectId] || 0;
                    return (
                      <td key={`${ic.categoryId}_subavg_${i}`} className={`px-1 py-1 border-r border-b border-slate-100 font-bold text-center text-sm ${theme.avgBg} ${theme.text}`}>
                        {subAvg.toFixed(1)}%
                      </td>
                    );
                  }

                  if (ic.isAvg) {
                    const avg = metrics.categoryAvgs[ic.categoryId] || 0;
                    return (
                      <td key={`${ic.categoryId}_avg_${i}`} className={`px-1 py-1 border-r border-b border-slate-100 font-medium text-center text-sm ${theme.avgBg} ${theme.text}`}>
                        {avg.toFixed(1)}
                      </td>
                    );
                  }

                  const scoreKey = `${ic.categoryId}_${ic.itemIndex}`;
                  const scoreValue = student.scores[scoreKey];
                  return (
                    <td key={scoreKey} className={`px-0.5 py-1 border-r border-b border-slate-100 ${theme.bg}`}>
                      <input
                        type="number"
                        min="0"
                        max={ic.maxScore}
                        value={scoreValue === undefined ? '' : scoreValue}
                        onChange={(e) => onUpdateStudent(student.id, ic.categoryId, ic.itemIndex, e.target.value === '' ? undefined : Number(e.target.value))}
                        className={`w-full min-w-[3rem] bg-transparent border border-transparent hover:bg-white/50 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 rounded px-0.5 py-0.5 text-center transition-all outline-none text-sm ${theme.text}`}
                        placeholder="-"
                      />
                    </td>
                  );
                })}

                <td className="px-2 py-1 bg-blue-50/30 font-semibold text-slate-900 text-center border-l border-blue-100/50 shadow-[-1px_0_0_0_#eff6ff] text-sm">
                  {finalScore.toFixed(2)}%
                </td>
                <td className="px-2 py-1 bg-blue-50/30 font-medium text-slate-700 text-center border-l border-blue-100/50 text-sm">
                  {rank}
                </td>
                <td className="px-2 py-1 bg-blue-50/30 text-center border-l border-blue-100/50">
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold ${
                    grade === 'A' ? 'bg-green-100 text-green-800' :
                    grade === 'B' ? 'bg-blue-100 text-blue-800' :
                    grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                    grade === 'D' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {grade}
                  </span>
                </td>
                <td className="px-2 py-1 bg-blue-50/30 text-center border-l border-blue-100/50">
                  <span className={`text-xs font-semibold ${status === 'Pass' ? 'text-green-600' : 'text-red-500'}`}>
                    {status}
                  </span>
                </td>
                <td className="px-1 py-1 border-l border-slate-100 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 transition-colors">
                  <input
                    type="text"
                    value={isAttendanceFail ? 'Auto-Fail' : (student.comment || '')}
                    onChange={(e) => onUpdateStudentField(student.id, 'comment', e.target.value)}
                    disabled={isAttendanceFail}
                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 rounded px-1.5 py-0.5 text-sm transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed truncate"
                    placeholder="Add comment..."
                  />
                </td>
                <td className="px-1 py-1 text-center border-l border-slate-100 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 transition-colors">
                  <button
                    onClick={() => onDeleteStudent(student.id)}
                    className="p-1 mx-auto text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                    title="Remove Student"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
          {students.length === 0 && (
            <tr>
              <td colSpan={itemCols.length + 9} className="px-6 py-12 text-center text-slate-500">
                No students added for this level yet. Click "Add Student" to begin.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

