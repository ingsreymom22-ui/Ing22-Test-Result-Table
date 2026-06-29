import React, { useMemo, useState } from 'react';
import { Level, Student, calculateGrade } from '../types';
import { Trash2, ArrowUpDown, EyeOff, Eye } from 'lucide-react';

interface Props {
  level: Level;
  onUpdateLevel?: (level: Level) => void;
  students: Student[];
  onUpdateStudent: (id: string, categoryId: string, itemIndex: number, value: any) => void;
  onUpdateStudentField: (id: string, field: string, value: any) => void;
  onDeleteStudent: (id: string) => void;
}

export default function GradeTable({ level, onUpdateLevel, students, onUpdateStudent, onUpdateStudentField, onDeleteStudent }: Props) {
  
  const [hiddenSubjects, setHiddenSubjects] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const toggleSubject = (subjectId: string) => {
    setHiddenSubjects(prev => 
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const subjectCols: { subject: any, colSpan: number, isHidden: boolean }[] = [];
  const categoryCols: { category: any, colSpan: number, subjectId: string, isHidden?: boolean }[] = [];
  const itemCols: { categoryId: string, subjectId: string, itemIndex: number, label: string, maxScore: number, isAvg?: boolean, isHidden?: boolean }[] = [];

  level.subjects.forEach(subject => {
    const isHidden = hiddenSubjects.includes(subject.id);
    let subjectSpan = 0;
    
    if (isHidden) {
      subjectCols.push({ subject, colSpan: 1, isHidden: true });
      categoryCols.push({ category: { id: `hidden_cat_${subject.id}`, name: 'Hidden' }, colSpan: 1, subjectId: subject.id, isHidden: true });
      itemCols.push({ categoryId: `hidden_cat_${subject.id}`, subjectId: subject.id, itemIndex: -2, label: '-', maxScore: 0, isHidden: true });
    } else {
      subject.categories.forEach(category => {
        // +1 for the Average column in each category
        categoryCols.push({ category, colSpan: category.itemCount + 1, subjectId: subject.id });
        subjectSpan += (category.itemCount + 1);
        
        for (let i = 0; i < category.itemCount; i++) {
          itemCols.push({
            categoryId: category.id,
            subjectId: subject.id,
            itemIndex: i,
            label: category.itemCount === 1 ? 'Score' : `#${i + 1}`,
            maxScore: category.itemMaxScores?.[i] ?? 100
          });
        }
        itemCols.push({
          categoryId: category.id,
          subjectId: subject.id,
          itemIndex: -1,
          label: 'Avg',
          maxScore: 100,
          isAvg: true
        });
      });
      if (subjectSpan > 0) {
        subjectCols.push({ subject, colSpan: subjectSpan, isHidden: false });
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
      let finalScore = 0;
      const categoryAvgs: Record<string, number> = {};
      
      level.subjects.forEach(subject => {
        subject.categories.forEach(category => {
          let categoryEarned = 0;
          let categoryMax = 0;
          for (let i = 0; i < category.itemCount; i++) {
            const score = student.scores[`${category.id}_${i}`];
            if (typeof score === 'number') {
              categoryEarned += score;
              categoryMax += (category.itemMaxScores?.[i] || 100);
            }
          }
          const categoryPercentage = categoryMax > 0 ? (categoryEarned / categoryMax) * 100 : 0;
          categoryAvgs[category.id] = categoryPercentage;
          finalScore += categoryPercentage * (category.weight / 100);
        });
      });
      return { id: student.id, finalScore, categoryAvgs };
    });

    const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);
    
    return scores.reduce((acc, curr) => {
      const rank = sortedScores.findIndex(s => s.finalScore === curr.finalScore) + 1;
      acc[curr.id] = { finalScore: curr.finalScore, rank, categoryAvgs: curr.categoryAvgs };
      return acc;
    }, {} as Record<string, { finalScore: number, rank: number, categoryAvgs: Record<string, number> }>);
  }, [students, level]);

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
            <th rowSpan={3} className="px-2 py-3 font-semibold border-r border-slate-200 w-10 text-center sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">#</th>
            <th rowSpan={3} className="px-4 py-3 font-semibold border-r border-slate-200 min-w-[200px] sticky left-[40px] bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-1">Student Name <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
            </th>
            <th rowSpan={3} className="px-3 py-3 font-semibold border-r border-slate-200 text-center w-24">Attendance</th>
            {subjectCols.map(sc => (
              <th key={sc.subject.id} colSpan={sc.colSpan} className={`px-4 py-2 font-semibold border-r border-b border-slate-200 text-center ${sc.isHidden ? 'bg-slate-200' : 'bg-slate-100'}`}>
                <div className="flex items-center justify-center gap-2">
                  <span>{sc.subject.name}</span>
                  <button onClick={() => toggleSubject(sc.subject.id)} className="text-slate-400 hover:text-slate-700 focus:outline-none" title={sc.isHidden ? 'Unhide Subject' : 'Hide Subject'}>
                    {sc.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </th>
            ))}
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
              return (
                <th key={`${cc.category.id}_${i}`} colSpan={cc.colSpan} className="px-2 py-2 font-semibold border-r border-b border-slate-200 text-center bg-slate-50 whitespace-nowrap">
                  {cc.category.name} <span className="text-slate-400 normal-case font-normal ml-1">({cc.category.weight}%)</span>
                </th>
              );
            })}
          </tr>

          {/* Row 3: Items */}
          <tr>
            {itemCols.map((ic, i) => {
              if (ic.isHidden) return null;
              return (
                <th key={`${ic.categoryId}_${ic.itemIndex}_${i}`} className={`px-1 py-1 font-medium border-r border-slate-200 text-center ${ic.isAvg ? 'bg-purple-50 text-purple-700 w-20' : 'bg-white text-slate-500 w-20'}`}>
                  {ic.isAvg ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{ic.label}</span>
                      <span className="text-[10px] normal-case opacity-75">%</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span>{ic.label}</span>
                      <div className="flex items-center mt-0.5 text-[10px] text-slate-400 normal-case">
                        <span className="mr-0.5">/</span>
                        <input
                          type="number"
                          min="1"
                          value={ic.maxScore}
                          onChange={(e) => handleUpdateMaxScore(ic.subjectId, ic.categoryId, ic.itemIndex, Number(e.target.value))}
                          className="w-10 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-100 rounded text-center transition-all outline-none"
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
                <td className="px-2 py-2 border-r border-slate-100 text-center font-medium text-slate-400 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 sticky left-0 z-10 shadow-[1px_0_0_0_#f1f5f9]">
                  {index + 1}
                </td>
                <td className="px-4 py-2 border-r border-slate-100 sticky left-[40px] bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 z-10 shadow-[1px_0_0_0_#f1f5f9] transition-colors min-w-[200px]">
                  <input
                    type="text"
                    value={student.name}
                    onChange={(e) => onUpdateStudentField(student.id, 'name', e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 font-medium text-slate-900 transition-all outline-none"
                    placeholder="Student Name"
                  />
                </td>
                <td className="px-2 py-2 border-r border-slate-100">
                  <input
                    type="text"
                    value={student.attendance || ''}
                    onChange={(e) => onUpdateStudentField(student.id, 'attendance', e.target.value)}
                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-center transition-all outline-none"
                    placeholder="e.g. 95%"
                  />
                </td>
                
                {itemCols.map((ic, i) => {
                  if (ic.isHidden) return null;
                  
                  if (ic.isAvg) {
                    const avg = metrics.categoryAvgs[ic.categoryId] || 0;
                    return (
                      <td key={`${ic.categoryId}_avg_${i}`} className="px-2 py-2 border-r border-slate-100 bg-purple-50/30 text-purple-700 font-medium text-center">
                        {avg.toFixed(1)}%
                      </td>
                    );
                  }

                  const scoreKey = `${ic.categoryId}_${ic.itemIndex}`;
                  const scoreValue = student.scores[scoreKey];
                  return (
                    <td key={scoreKey} className="px-1 py-2 border-r border-slate-100">
                      <input
                        type="number"
                        min="0"
                        max={ic.maxScore}
                        value={scoreValue === undefined ? '' : scoreValue}
                        onChange={(e) => onUpdateStudent(student.id, ic.categoryId, ic.itemIndex, e.target.value === '' ? undefined : Number(e.target.value))}
                        className="w-full min-w-[3.5rem] bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-1 py-1 text-center transition-all outline-none"
                        placeholder="-"
                      />
                    </td>
                  );
                })}

                <td className="px-4 py-2 bg-blue-50/30 font-semibold text-slate-900 text-center border-l border-blue-100/50 shadow-[-1px_0_0_0_#eff6ff]">
                  {finalScore.toFixed(2)}%
                </td>
                <td className="px-4 py-2 bg-blue-50/30 font-medium text-slate-700 text-center border-l border-blue-100/50">
                  {rank}
                </td>
                <td className="px-4 py-2 bg-blue-50/30 text-center border-l border-blue-100/50">
                  <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${
                    grade === 'A' ? 'bg-green-100 text-green-800' :
                    grade === 'B' ? 'bg-blue-100 text-blue-800' :
                    grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                    grade === 'D' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {grade}
                  </span>
                </td>
                <td className="px-4 py-2 bg-blue-50/30 text-center border-l border-blue-100/50">
                  <span className={`text-xs font-semibold ${status === 'Pass' ? 'text-green-600' : 'text-red-500'}`}>
                    {status}
                  </span>
                </td>
                <td className="px-2 py-2 border-l border-slate-100 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 transition-colors">
                  <input
                    type="text"
                    value={isAttendanceFail ? 'Auto-Fail' : (student.comment || '')}
                    onChange={(e) => onUpdateStudentField(student.id, 'comment', e.target.value)}
                    disabled={isAttendanceFail}
                    className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 text-sm transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Add comment..."
                  />
                </td>
                <td className="px-2 py-2 text-center border-l border-slate-100 bg-white group-hover:bg-slate-50 group-even:bg-slate-50/30 transition-colors">
                  <button
                    onClick={() => onDeleteStudent(student.id)}
                    className="p-1.5 mx-auto text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                    title="Remove Student"
                  >
                    <Trash2 className="w-4 h-4" />
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

